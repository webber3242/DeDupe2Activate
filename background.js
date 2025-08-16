"use strict";

// Configuration constants - Optimized values from both versions
const CONFIG = {
    DEBOUNCE_DELAY: 300,
    TAB_REMOVAL_DELAY: 50,
    CLEANUP_INTERVAL: 60000,
    IGNORED_DOMAINS: new Set(['localhost', '127.0.0.1', 'chrome-extension']),
    MAX_CACHE_SIZE: 1000,
    CLEANUP_RETENTION_SIZE: 250,
    COMPLETION_TIMEOUT: 300000, // 5 minutes
    UNSAVED_DATA_CHECK_TIMEOUT 250 // Critical: Keep unsaved data protection
};

/**
 * Handles URL pattern matching and duplicate detection
 */
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

/**
 * Utility functions
 */
const Utils = {
    debounce(func, delay) {
        const timers = new Map();
        return (...args) => {
            // Optimized key generation from V2
            const key = args[0]?.id || args[0]?.tabId || 'default';
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
        return !url || url === "about:blank" || url === "chrome://newtab/";
    },
    
    isBrowserURL(url) {
        if (!url) return false;
        return url.startsWith("about:") ||
               url.startsWith("chrome://") ||
               url.startsWith("edge://") ||
               url.startsWith("moz-extension://") ||
               url.startsWith("chrome-extension://");
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
    },
    
    /**
     * CRITICAL: Check if a tab has unsaved data (from V1)
     */
    async checkForUnsavedData(tabId) {
        try {
            const results = await Promise.race([
                chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        // Check for beforeunload listeners
                        if (window.onbeforeunload !== null) return true;
                        
                        // Check for modified form inputs
                        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
                        for (const input of inputs) {
                            if (input.value !== input.defaultValue) return true;
                        }
                        
                        // Check for contenteditable elements with content
                        const editables = document.querySelectorAll('[contenteditable="true"]');
                        for (const editable of editables) {
                            if (editable.textContent.trim().length > 0) return true;
                        }
                        
                        // Check for common editor indicators
                        if (document.querySelector('.ace_editor, .CodeMirror, .monaco-editor')) return true;
                        
                        return false;
                    }
                }),
                // Timeout after configured delay
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('timeout')), CONFIG.UNSAVED_DATA_CHECK_TIMEOUT)
                )
            ]);
            
            return results[0]?.result || false;
        } catch (error) {
            console.debug(`Unable to check unsaved data for tab ${tabId}:`, error.message);
            return false;
        }
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
        this.unsavedDataCache = new Map(); // CRITICAL: Keep unsaved data cache
        
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
        // Clear unsaved data cache when page completes loading
        this.unsavedDataCache.delete(tabId);
    }
    
    markCreated(tabId) {
        this.creationTimes.set(tabId, Date.now());
    }
    
    getCompletionTime(tabId) {
        return this.completionTimes.get(tabId) || this.creationTimes.get(tabId) || 0;
    }
    
    cachePattern(key, patternData) {
        if (patternData && key) {
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
    
    // CRITICAL: Keep unsaved data caching from V1
    cacheUnsavedData(tabId, hasUnsavedData) {
        this.unsavedDataCache.set(tabId, {
            hasUnsavedData,
            timestamp: Date.now()
        });
    }
    
    getCachedUnsavedData(tabId) {
        const cached = this.unsavedDataCache.get(tabId);
        // Cache is valid for 30 seconds
        if (cached && (Date.now() - cached.timestamp) < 30000) {
            return cached.hasUnsavedData;
        }
        return null;
    }
    
    remove(tabId) {
        this.ignoredTabs.delete(tabId);
        this.completionTimes.delete(tabId);
        this.processingTabs.delete(tabId);
        this.creationTimes.delete(tabId);
        this.unsavedDataCache.delete(tabId);
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
        
        // Clean up old unsaved data cache
        for (const [tabId, data] of this.unsavedDataCache) {
            if (Date.now() - data.timestamp > 60000) { // 1 minute
                this.unsavedDataCache.delete(tabId);
            }
        }
        
        // Optimized cache cleanup from V2
        if (this.patternCache.size > CONFIG.MAX_CACHE_SIZE / 2) {
            const entries = Array.from(this.patternCache.entries());
            entries.sort((a, b) => (b[1].lastUsed || 0) - (a[1].lastUsed || 0));
            const toKeep = entries.slice(0, CONFIG.CLEANUP_RETENTION_SIZE);
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
        this.unsavedDataCache.clear();
    }
}

/**
 * Main duplicate tab management class
 */
class DuplicateTabManager {
    constructor() {
        this.tracker = new EnhancedTabTracker();
        this.handleSingleTabDuplicates = Utils.debounce(this._handleSingleTabDuplicates.bind(this), CONFIG.DEBOUNCE_DELAY);
        this.initializeEventListeners();
    }
    
    /**
     * Find duplicates for a SINGLE tab (optimized from V2 but keeping V1 robustness)
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
            
            // Sequential pattern checking with early exit (from V2 optimization)
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
     * Find all duplicates across all tabs (from V2 optimization but keeping V1 robustness)
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
        
        // Return only groups with duplicates
        const duplicateGroups = new Map();
        for (const [key, tabs] of urlGroups.entries()) {
            if (tabs.length > 1) {
                duplicateGroups.set(key, tabs);
            }
        }
        
        return duplicateGroups;
    }
    
    /**
     * CRITICAL: Smart priority system from V1 (with unsaved data protection)
     */
    async selectBestTab(tabs) {
        if (!tabs || tabs.length === 0) return null;
        if (tabs.length === 1) return tabs[0];
        
        const tabsWithPriority = await Promise.all(tabs.map(async (tab) => {
            let priority = 0;
            
            // Priority 1: Check for unsaved data (HIGHEST PRIORITY)
            let cachedUnsavedData = this.tracker.getCachedUnsavedData(tab.id);
            if (cachedUnsavedData === null) {
                cachedUnsavedData = await Utils.checkForUnsavedData(tab.id);
                this.tracker.cacheUnsavedData(tab.id, cachedUnsavedData);
            }
            if (cachedUnsavedData) {
                priority += 10000;
            }
            
            // Priority 2: Audible tab
            if (tab.audible) {
                priority += 1000;
            }
            
            // Priority 3: Pinned tab
            if (tab.pinned) {
                priority += 500;
            }
            
            // Priority 4: Active tab
            if (tab.active) {
                priority += 100;
            }
            
            // Priority 5: Older tabs get bonus
            const completionTime = this.tracker.getCompletionTime(tab.id);
            if (completionTime > 0) {
                priority += Math.max(0, 50 - (Date.now() - completionTime) / 1000);
            } else {
                priority += Math.max(0, 50 - (tab.id % 1000) / 20);
            }
            
            return { tab, priority };
        }));
        
        // Sort by priority and return the best tab
        tabsWithPriority.sort((a, b) => b.priority - a.priority);
        
        console.debug("Tab priority selection:", tabsWithPriority.map(t => ({
            id: t.tab.id,
            url: t.tab.url.substring(0, 50),
            priority: t.priority,
            active: t.tab.active,
            audible: t.tab.audible,
            pinned: t.tab.pinned
        })));
        
        return tabsWithPriority[0].tab;
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
     * Handle duplicates for a SINGLE tab (keeping V1 robustness)
     */
    async _handleSingleTabDuplicates(tab, loadingUrl = null) {
        if (this.tracker.isProcessing(tab.id)) return;
        
        this.tracker.setProcessing(tab.id, true);
        try {
            const duplicates = await this.findDuplicatesForSingleTab(tab, loadingUrl);
            if (duplicates.length > 0) {
                const allTabs = [tab, ...duplicates];
                const tabToKeep = await this.selectBestTab(allTabs);
                
                if (!tabToKeep) return;
                
                const closurePromises = allTabs
                    .filter(dupTab => dupTab.id !== tabToKeep.id)
                    .map(dupTab => this.closeDuplicate(dupTab.id, tabToKeep));
                    
                await Promise.allSettled(closurePromises);
                
                console.log(`Kept tab ${tabToKeep.id} (${tabToKeep.url.substring(0, 50)}), closed ${closurePromises.length} duplicates`);
            }
        } catch (error) {
            console.error("Error handling single tab duplicates:", error.message);
        } finally {
            this.tracker.setProcessing(tab.id, false);
        }
    }
    
    /**
     * Close ALL duplicates (optimized from V2)
     */
    async closeAllDuplicates() {
        const duplicateGroups = await this.findAllDuplicates();
        if (duplicateGroups.size === 0) {
            console.log("No duplicate tabs found");
            return;
        }
        
        const closurePromises = [];
        let totalClosed = 0;
        
        for (const tabs of duplicateGroups.values()) {
            const tabToKeep = await this.selectBestTab(tabs);
            if (!tabToKeep) continue;
            
            const tabsToClose = tabs.filter(tab => tab.id !== tabToKeep.id);
            
            tabsToClose.forEach(tab => {
                this.tracker.ignore(tab.id);
                closurePromises.push(Utils.safeRemoveTab(tab.id));
            });
            
            totalClosed += tabsToClose.length;
            
            if (!tabToKeep.active && tabsToClose.some(t => t.active)) {
                setTimeout(async () => {
                    try {
                        await chrome.tabs.update(tabToKeep.id, { active: true });
                    } catch (error) {
                        console.warn("Failed to activate tab:", error.message);
                    }
                }, CONFIG.TAB_REMOVAL_DELAY);
            }
        }
        
        const results = await Promise.allSettled(closurePromises);
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            console.warn(`Failed to close ${failed} duplicate tabs`);
        }
        
        console.log(`Processed ${duplicateGroups.size} duplicate groups, closed ${totalClosed} tabs (${failed} failed)`);
    }
    
    initializeEventListeners() {
        // Tab creation handler
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
        
        // Browser startup handlers
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
console.log("Optimized duplicate tab closer with unsaved data protection initialized successfully");
console.log(`URLPattern support: ${URLPatternHandler.isSupported() ? '✅ Available' : '❌ Using fallback'}`);

// Cleanup handler for extension suspension
if (chrome.runtime.onSuspend) {
    chrome.runtime.onSuspend.addListener(() => {
        duplicateTabManager.destroy();
    });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        URLPatternHandler,
        EnhancedTabTracker,
        DuplicateTabManager,
        Utils,
        CONFIG
    };
}
