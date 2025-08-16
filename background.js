"use strict";


const CONFIG = {
    DEBOUNCE_DELAY: 300,
    TAB_REMOVAL_DELAY: 50,
    CLEANUP_INTERVAL: 60000,
    IGNORED_DOMAINS: new Set(['localhost', '127.0.0.1', 'chrome-extension']),
    INCLUDE_QUERY_PARAMS: false,
    MAX_CACHE_SIZE: 1000,
    CLEANUP_RETENTION_SIZE: 250,
    COMPLETION_TIMEOUT: 300000 // 5 minutes
};


class URLPatternHandler {
    static isSupported() {
        return typeof URLPattern !== 'undefined';
    }
    
    static isValidURL(url) {
        if (!url || typeof url !== 'string') return false;
        return /^https?:\/\//i.test(url);
    }
    
    static createDuplicatePattern(url) {
        if (!url || typeof url !== 'string' || !this.isValidURL(url)) {
            return null;
        }
        
        try {
            const parsed = new URL(url);
            const baseHostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
            const normalizedPath = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/$/, '');
            
            const chromePatterns = normalizedPath === '/'
                ? [`*://${baseHostname}/`]
                : [
                    `*://${baseHostname}${normalizedPath}`,
                    `*://${baseHostname}${normalizedPath}/`,
                    `*://www.${baseHostname}${normalizedPath}`,
                    `*://www.${baseHostname}${normalizedPath}/`
                ];
            
            const patternData = {
                key: `${baseHostname}${normalizedPath}`,
                originalUrl: url,
                hostname: baseHostname,
                pathname: normalizedPath,
                chromePatterns
            };
            
            if (this.isSupported()) {
                patternData.urlPatterns = [
                    new URLPattern({
                        protocol: '*',
                        hostname: baseHostname,
                        pathname: parsed.pathname,
                        search: '*',
                        hash: '*'
                    }),
                    new URLPattern({
                        protocol: '*',
                        hostname: `www.${baseHostname}`,
                        pathname: parsed.pathname,
                        search: '*',
                        hash: '*'
                    })
                ];
            }
            
            return patternData;
        } catch (error) {
            console.warn("Failed to create pattern for URL:", url, error.message);
            return null;
        }
    }
    
    static areDuplicates(url1, url2) {
        if (!url1 || !url2) return false;
        
        const pattern1 = this.createDuplicatePattern(url1);
        if (!pattern1) return false;
        
        if (this.isSupported() && pattern1.urlPatterns) {
            return pattern1.urlPatterns.some(pattern => pattern.test(url2));
        }
        
        const pattern2 = this.createDuplicatePattern(url2);
        return pattern2 ? pattern1.key === pattern2.key : false;
    }
    
    static getNormalizedKey(url) {
        const pattern = this.createDuplicatePattern(url);
        return pattern?.key || null;
    }
}


const Utils = {
    debounce(func, delay) {
        const timers = new Map();
        return (...args) => {
            const key = args[0]?.id || args[0]?.tabId || JSON.stringify(args);
            const existingTimer = timers.get(key);
            
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            
            const timerId = setTimeout(() => {
                func(...args);
                timers.delete(key);
            }, delay);
            
            timers.set(key, timerId);
        };
    },
    
    isBlankURL(url) {
        return !url || url === "about:blank";
    },
    
    isBrowserURL(url) {
        return url?.startsWith("about:") ||
               url?.startsWith("chrome://") ||
               url?.startsWith("edge://") ||
               url?.startsWith("moz-extension://");
    },
    
    shouldProcessURL(url) {
        if (!url || typeof url !== 'string' || !URLPatternHandler.isValidURL(url)) {
            return false;
        }
        
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            const baseDomain = hostname.split('.').slice(-2).join('.');
            
            return !CONFIG.IGNORED_DOMAINS.has(hostname) &&
                   !CONFIG.IGNORED_DOMAINS.has(baseDomain);
        } catch {
            return false;
        }
    },
    
    async safeGetTab(tabId) {
        try {
            return await chrome.tabs.get(tabId);
        } catch (error) {
            console.warn(`Failed to get tab ${tabId}:`, error.message);
            return null;
        }
    },
    
    async safeQueryTabs(queryInfo = {}) {
        try {
            return await chrome.tabs.query({ windowType: "normal", ...queryInfo });
        } catch (error) {
            console.warn("Failed to query tabs:", error.message);
            return [];
        }
    },
    
    async safeRemoveTab(tabId) {
        try {
            await chrome.tabs.remove(tabId);
            return true;
        } catch (error) {
            console.warn(`Failed to remove tab ${tabId}:`, error.message);
            return false;
        }
    },
    
    safeHandler(handler) {
        return (...args) => {
            Promise.resolve(handler(...args)).catch(error => {
                console.error("Handler error:", error.message, error.stack);
            });
        };
    }
};

/**
 * Enhanced tab tracking with better memory management
 */
class EnhancedTabTracker {
    constructor() {
        this.ignoredTabs = new Set();
        this.completionTimes = new Map();
        this.processingTabs = new Set();
        this.creationTimes = new Map();
        this.patternCache = new Map();
        
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), CONFIG.CLEANUP_INTERVAL);
    }
    
    ignore(tabId) {
        this.ignoredTabs.add(tabId);
    }
    
    isIgnored(tabId) {
        return this.ignoredTabs.has(tabId);
    }
    
    isProcessing(tabId) {
        return this.processingTabs.has(tabId);
    }
    
    setProcessing(tabId, processing) {
        if (processing) {
            this.processingTabs.add(tabId);
        } else {
            this.processingTabs.delete(tabId);
        }
    }
    
    markCompleted(tabId) {
        this.completionTimes.set(tabId, Date.now());
    }
    
    markCreated(tabId) {
        this.creationTimes.set(tabId, Date.now());
    }
    
    getCompletionTime(tabId) {
        return this.completionTimes.get(tabId) || this.creationTimes.get(tabId) || 0;
    }
    
    cachePattern(key, patternData) {
        if (patternData) {
            patternData.lastUsed = Date.now();
            this.patternCache.set(key, patternData);
            
            if (this.patternCache.size > CONFIG.MAX_CACHE_SIZE) {
                const entries = [...this.patternCache.entries()];
                entries.sort((a, b) => b[1].lastUsed - a[1].lastUsed);
                const toKeep = entries.slice(0, CONFIG.CLEANUP_RETENTION_SIZE);
                this.patternCache = new Map(toKeep);
            }
        }
    }
    
    getCachedPattern(key) {
        const pattern = this.patternCache.get(key);
        if (pattern) {
            pattern.lastUsed = Date.now();
        }
        return pattern;
    }
    
    remove(tabId) {
        this.ignoredTabs.delete(tabId);
        this.completionTimes.delete(tabId);
        this.processingTabs.delete(tabId);
        this.creationTimes.delete(tabId);
    }
    
    cleanup() {
        const cutoff = Date.now() - CONFIG.COMPLETION_TIMEOUT;
        
        // Clean up old completion times
        for (const [tabId, time] of this.completionTimes) {
            if (time < cutoff) {
                this.completionTimes.delete(tabId);
            }
        }
        
        // Clean up old creation times
        for (const [tabId, time] of this.creationTimes) {
            if (time < cutoff) {
                this.creationTimes.delete(tabId);
            }
        }
        
        // Manage pattern cache size with LRU eviction
        if (this.patternCache.size > CONFIG.MAX_CACHE_SIZE / 2) {
            const entries = Array.from(this.patternCache.entries());
            const toKeep = entries.slice(-CONFIG.CLEANUP_RETENTION_SIZE);
            this.patternCache.clear();
            toKeep.forEach(([url, pattern]) => this.patternCache.set(url, pattern));
        }
    }
    
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.ignoredTabs.clear();
        this.completionTimes.clear();
        this.processingTabs.clear();
        this.creationTimes.clear();
        this.patternCache.clear();
    }
}


class DuplicateTabManager {
    constructor() {
        this.tracker = new EnhancedTabTracker();
        this.handleSingleTabDuplicates = Utils.debounce(this._handleSingleTabDuplicates.bind(this), CONFIG.DEBOUNCE_DELAY);
        this.initializeEventListeners();
    }
    
    /**
     * OPTIMIZED: Find duplicates for a SINGLE tab (real-time events)
     * Uses sequential pattern checking with early exit
     */
    async findDuplicatesForSingleTab(targetTab, loadingUrl = null) {
        const url = loadingUrl || targetTab.url;
        
        if (!url || Utils.isBlankURL(url) || Utils.isBrowserURL(url) || !Utils.shouldProcessURL(url)) {
            return [];
        }
        
        const cacheKey = URLPatternHandler.getNormalizedKey(url);
        let patternData = cacheKey && this.tracker.getCachedPattern(cacheKey);
        
        if (!patternData) {
            patternData = URLPatternHandler.createDuplicatePattern(url);
            if (!patternData) return [];
            if (cacheKey) {
                this.tracker.cachePattern(cacheKey, patternData);
            }
        }
        
        try {
            const allDuplicates = [];
            
            // SEQUENTIAL pattern checking with early exit optimization
            for (const chromePattern of patternData.chromePatterns) {
                const tabs = await Utils.safeQueryTabs({ url: chromePattern });
                
                const matches = tabs.filter(tab =>
                    tab.id !== targetTab.id &&
                    !this.tracker.isIgnored(tab.id) &&
                    Utils.shouldProcessURL(tab.url) &&
                    URLPatternHandler.areDuplicates(url, tab.url)
                );
                
                allDuplicates.push(...matches);
                
                // Early exit: if we found duplicates, no need to check other patterns
                if (allDuplicates.length > 0) {
                    break;
                }
            }
            
            return allDuplicates;
        } catch (error) {
            console.warn("Error in findDuplicatesForSingleTab:", error.message);
            return [];
        }
    }
    
    /**
     * BULK OPERATION: Find all duplicates across all tabs (manual cleanup)
     * Uses parallel processing and grouping for efficiency
     */
    async findAllDuplicates() {
        const allTabs = await Utils.safeQueryTabs();
        if (allTabs.length <= 1) return new Map();
        
        const urlGroups = new Map();
        
        // Group tabs by normalized URL key
        for (const tab of allTabs) {
            if (Utils.isBlankURL(tab.url) || Utils.isBrowserURL(tab.url) ||
                this.tracker.isIgnored(tab.id) || !Utils.shouldProcessURL(tab.url)) {
                continue;
            }
            
            const normalizedKey = URLPatternHandler.getNormalizedKey(tab.url);
            if (!normalizedKey) continue;
            
            if (!urlGroups.has(normalizedKey)) {
                urlGroups.set(normalizedKey, []);
            }
            urlGroups.get(normalizedKey).push(tab);
        }
        
        // Return only groups with duplicates (more than 1 tab)
        const duplicateGroups = new Map();
        for (const [key, tabs] of urlGroups.entries()) {
            if (tabs.length > 1) {
                duplicateGroups.set(key, tabs);
            }
        }
        
        return duplicateGroups;
    }
    
    selectBestTab(tabs) {
        return tabs.reduce((best, current) => {
            // Priority 1: Active tab
            if (current.active && !best.active) return current;
            if (best.active && !current.active) return best;
            
            // Priority 2: Audible tab
            if (current.audible && !best.audible) return current;
            if (best.audible && !current.audible) return best;
            
            // Priority 3: Pinned tab
            if (current.pinned && !best.pinned) return current;
            if (best.pinned && !current.pinned) return best;
            
            // Priority 4: Most recently completed/created
            const bestTime = this.tracker.getCompletionTime(best.id);
            const currentTime = this.tracker.getCompletionTime(current.id);
            if (currentTime > bestTime) return current;
            if (bestTime > currentTime) return best;
            
            // Priority 5: Lower tab ID (older)
            return best.id < current.id ? best : current;
        });
    }
    
    async closeDuplicate(tabId, keepTab) {
        const tab = await Utils.safeGetTab(tabId);
        const wasActive = tab?.active;
        
        this.tracker.ignore(tabId);
        const success = await Utils.safeRemoveTab(tabId);
        
        if (success && wasActive && keepTab && !keepTab.active) {
            setTimeout(async () => {
                try {
                    await chrome.tabs.update(keepTab.id, { active: true });
                } catch (error) {
                    console.warn("Failed to activate kept tab:", error.message);
                }
            }, CONFIG.TAB_REMOVAL_DELAY);
        } else if (!success) {
            this.tracker.ignoredTabs.delete(tabId);
        }
        
        return success;
    }
    
    /**
     * Handle duplicates for a SINGLE tab (optimized for real-time events)
     */
    async _handleSingleTabDuplicates(tab, loadingUrl = null) {
        if (this.tracker.isProcessing(tab.id)) return;
        
        this.tracker.setProcessing(tab.id, true);
        try {
            const duplicates = await this.findDuplicatesForSingleTab(tab, loadingUrl);
            if (duplicates.length > 0) {
                const allTabs = [tab, ...duplicates];
                const tabToKeep = this.selectBestTab(allTabs);
                
                const closurePromises = allTabs
                    .filter(dupTab => dupTab.id !== tabToKeep.id)
                    .map(dupTab => this.closeDuplicate(dupTab.id, tabToKeep));
                    
                await Promise.allSettled(closurePromises);
            }
        } catch (error) {
            console.error("Error handling single tab duplicates:", error.message);
        } finally {
            this.tracker.setProcessing(tab.id, false);
        }
    }
    
    /**
     * Close ALL duplicates (bulk operation for manual cleanup)
     */
    async closeAllDuplicates() {
        const duplicateGroups = await this.findAllDuplicates();
        if (duplicateGroups.size === 0) return;
        
        const closurePromises = [];
        
        // Process each group of duplicates
        for (const tabs of duplicateGroups.values()) {
            const tabToKeep = this.selectBestTab(tabs);
            const tabsToClose = tabs.filter(tab => tab.id !== tabToKeep.id);
            
            // Mark tabs for closure and add to promise array
            tabsToClose.forEach(tab => {
                this.tracker.ignore(tab.id);
                closurePromises.push(Utils.safeRemoveTab(tab.id));
            });
            
            // Activate the kept tab if needed
            if (!tabToKeep.active && tabsToClose.length > 0) {
                setTimeout(async () => {
                    try {
                        await chrome.tabs.update(tabToKeep.id, { active: true });
                    } catch (error) {
                        console.warn("Failed to activate tab:", error.message);
                    }
                }, CONFIG.TAB_REMOVAL_DELAY);
            }
        }
        
        // Execute all closures in parallel
        const results = await Promise.allSettled(closurePromises);
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            console.warn(`Failed to close ${failed} duplicate tabs`);
        }
        
        console.log(`Processed ${duplicateGroups.size} duplicate groups, closed ${closurePromises.length} tabs`);
    }
    
    initializeEventListeners() {
        // SINGLE TAB EVENTS - Use optimized single-tab duplicate finder
        chrome.tabs.onCreated.addListener(Utils.safeHandler(async (tab) => {
            this.tracker.markCreated(tab.id);
            if (tab.status === "complete" && !Utils.isBlankURL(tab.url) && Utils.shouldProcessURL(tab.url)) {
                this.tracker.markCompleted(tab.id);
                await this.handleSingleTabDuplicates(tab);
            }
        }));
        
        // Early detection of duplicate navigation
        chrome.webNavigation.onBeforeNavigate.addListener(Utils.safeHandler(async (details) => {
            if (details.frameId === 0 && details.tabId !== -1 &&
                !Utils.isBlankURL(details.url) && Utils.shouldProcessURL(details.url)) {
                const tab = await Utils.safeGetTab(details.tabId);
                if (tab && !this.tracker.isIgnored(details.tabId)) {
                    await this.handleSingleTabDuplicates(tab, details.url);
                }
            }
        }));
        
        chrome.webNavigation.onCompleted.addListener(Utils.safeHandler(async (details) => {
            if (details.frameId === 0 && details.tabId !== -1) {
                this.tracker.markCompleted(details.tabId);
                const tab = await Utils.safeGetTab(details.tabId);
                if (tab && !this.tracker.isIgnored(details.tabId) && Utils.shouldProcessURL(tab.url)) {
                    await this.handleSingleTabDuplicates(tab);
                }
            }
        }));
        
        // Tab removal handler
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.tracker.remove(tabId);
        });
        
        // BULK OPERATIONS - Use optimized bulk duplicate finder
        if (chrome.runtime.onStartup) {
            chrome.runtime.onStartup.addListener(Utils.safeHandler(() => {
                setTimeout(() => this.closeAllDuplicates(), 2000);
            }));
        }
        
        if (chrome.runtime.onInstalled) {
            chrome.runtime.onInstalled.addListener(Utils.safeHandler(() => {
                setTimeout(() => this.closeAllDuplicates(), 3000);
            }));
        }
    }
    
    destroy() {
        this.tracker.destroy();
    }
}

// Initialize the duplicate tab manager
const duplicateTabManager = new DuplicateTabManager();

// Browser action/extension icon click
chrome.action.onClicked.addListener(() => {
    duplicateTabManager.closeAllDuplicates();
});

// Logging
console.log("Optimized duplicate tab closer initialized successfully");
console.log(`URLPattern support: ${URLPatternHandler.isSupported() ? '✅ Available' : '❌ Using fallback'}`);

// Cleanup handler for extension suspension
if (chrome.runtime.onSuspend) {
    chrome.runtime.onSuspend.addListener(() => {
        duplicateTabManager.destroy();
    });
}

// Export for testing (if in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        URLPatternHandler,
        EnhancedTabTracker,
        DuplicateTabManager,
        Utils,
        CONFIG
    };
}
