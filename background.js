"use strict";

const DEBOUNCE_DELAY = 300;
const TAB_REMOVAL_DELAY = 50;
const CLEANUP_INTERVAL = 60000;
const IGNORED_DOMAINS = new Set(['localhost', '127.0.0.1', 'chrome-extension']);
const INCLUDE_QUERY_PARAMS = false;

const URLPatternHandler = {
    isSupported() {
        return typeof URLPattern !== 'undefined';
    },
    
    createDuplicatePattern(url) {
        if (!url || typeof url !== 'string') return null;
        if (!this.isValidURL(url)) return null;
        
        try {
            const parsed = new URL(url);
            const baseHostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
            const normalizedPath = parsed.pathname.replace(/\/$/, '');
            
            const patternData = {
                key: `${baseHostname}${normalizedPath}`,
                originalUrl: url,
                hostname: baseHostname,
                pathname: normalizedPath,
                chromePatterns: [
                    `*://${baseHostname}${parsed.pathname}*`,
                    `*://www.${baseHostname}${parsed.pathname}*`
                ]
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
    },
    
    areDuplicates(url1, url2) {
        if (!url1 || !url2) return false;
        
        const pattern1 = this.createDuplicatePattern(url1);
        if (!pattern1) return false;
        
        if (this.isSupported() && pattern1.urlPatterns) {
            return pattern1.urlPatterns.some(pattern => pattern.test(url2));
        }
        
        const pattern2 = this.createDuplicatePattern(url2);
        return pattern2 && pattern1.key === pattern2.key;
    },
    
    getNormalizedKey(url) {
        const pattern = this.createDuplicatePattern(url);
        return pattern ? pattern.key : null;
    },
    
    getChromeQueryPatterns(url) {
        const pattern = this.createDuplicatePattern(url);
        return pattern ? pattern.chromePatterns : [];
    },
    
    isValidURL(url) {
        if (!url || typeof url !== 'string') return false;
        return /^https?:\/\//i.test(url);
    }
};

const debounce = (func, delay) => {
    const timers = new Map();
    return (...args) => {
        const key = args[0]?.id || args[0]?.tabId || JSON.stringify(args);
        clearTimeout(timers.get(key));
        const timerId = setTimeout(() => {
            func(...args);
            timers.delete(key);
        }, delay);
        timers.set(key, timerId);
    };
};

const isBlankURL = (url) => !url || url === "about:blank";
const isBrowserURL = (url) => url.startsWith("about:") || url.startsWith("chrome://");

const shouldProcessURL = (url) => {
    if (!url || typeof url !== 'string') return false;
    if (!URLPatternHandler.isValidURL(url)) return false;
    
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return !IGNORED_DOMAINS.has(hostname) &&
            !Array.from(IGNORED_DOMAINS).some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );
    } catch {
        return false;
    }
};

const safeGetTab = async (tabId) => {
    try {
        return await chrome.tabs.get(tabId);
    } catch (error) {
        console.warn(`Failed to get tab ${tabId}:`, error.message);
        return null;
    }
};

const safeQueryTabs = async (queryInfo = {}) => {
    try {
        queryInfo.windowType = "normal";
        return await chrome.tabs.query(queryInfo);
    } catch (error) {
        console.warn("Failed to query tabs:", error.message);
        return [];
    }
};

const safeRemoveTab = async (tabId) => {
    try {
        await chrome.tabs.remove(tabId);
        return true;
    } catch (error) {
        console.warn(`Failed to remove tab ${tabId}:`, error.message);
        return false;
    }
};

class EnhancedTabTracker {
    constructor() {
        this.ignoredTabs = new Set();
        this.completionTimes = new Map();
        this.processingTabs = new Set();
        this.creationTimes = new Map();
        this.patternCache = new Map();
        setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
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
        processing ? this.processingTabs.add(tabId) : this.processingTabs.delete(tabId);
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
    
    cachePattern(url, patternData) {
        if (patternData && this.patternCache.size < 1000) {
            this.patternCache.set(url, patternData);
        }
    }
    
    getCachedPattern(url) {
        return this.patternCache.get(url);
    }
    
    remove(tabId) {
        this.ignoredTabs.delete(tabId);
        this.completionTimes.delete(tabId);
        this.processingTabs.delete(tabId);
        this.creationTimes.delete(tabId);
    }
    
    cleanup() {
        const cutoff = Date.now() - 300000;
        
        for (const [tabId, time] of this.completionTimes) {
            if (time < cutoff) this.completionTimes.delete(tabId);
        }
        for (const [tabId, time] of this.creationTimes) {
            if (time < cutoff) this.creationTimes.delete(tabId);
        }
        
        if (this.patternCache.size > 500) {
            const entries = Array.from(this.patternCache.entries());
            const toKeep = entries.slice(-250);
            this.patternCache.clear();
            toKeep.forEach(([url, pattern]) => this.patternCache.set(url, pattern));
        }
    }
}

const tracker = new EnhancedTabTracker();

const findDuplicates = async (targetTab, loadingUrl = null) => {
    const url = loadingUrl || targetTab.url;
    if (!url || isBlankURL(url) || isBrowserURL(url) || !shouldProcessURL(url)) {
        return [];
    }
    
    let patternData = tracker.getCachedPattern(url);
    if (!patternData) {
        patternData = URLPatternHandler.createDuplicatePattern(url);
        if (!patternData) return [];
        tracker.cachePattern(url, patternData);
    }
    
    try {
        const allCandidates = new Map();
        
        for (const chromePattern of patternData.chromePatterns) {
            const tabs = await safeQueryTabs({ url: chromePattern });
            tabs.forEach(tab => allCandidates.set(tab.id, tab));
        }
        
        const candidateTabs = Array.from(allCandidates.values());
        return candidateTabs.filter(tab =>
            tab.id !== targetTab.id &&
            !tracker.isIgnored(tab.id) &&
            shouldProcessURL(tab.url) &&
            URLPatternHandler.areDuplicates(url, tab.url)
        );
    } catch (error) {
        console.warn("Error in findDuplicates:", error.message);
        return [];
    }
};

const selectBestTab = (tabs) => {
    return tabs.reduce((best, current) => {
        if (current.active && !best.active) return current;
        if (best.active && !current.active) return best;
        
        if (current.audible && !best.audible) return current;
        if (best.audible && !current.audible) return best;
        
        if (current.pinned && !best.pinned) return current;
        if (best.pinned && !current.pinned) return best;
        
        const bestTime = tracker.getCompletionTime(best.id);
        const currentTime = tracker.getCompletionTime(current.id);
        if (currentTime > bestTime) return current;
        if (bestTime > currentTime) return best;
        
        return best.id < current.id ? best : current;
    });
};

const closeDuplicate = async (tabId, keepTab) => {
    tracker.ignore(tabId);
    const success = await safeRemoveTab(tabId);
    
    if (success && keepTab) {
        setTimeout(async () => {
            try {
                await chrome.tabs.update(keepTab.id, { active: true });
            } catch (error) {
                console.warn("Failed to activate kept tab:", error.message);
            }
        }, TAB_REMOVAL_DELAY);
    } else if (!success) {
        tracker.ignoredTabs.delete(tabId);
    }
};

const handleDuplicates = debounce(async (tab, loadingUrl = null) => {
    if (tracker.isProcessing(tab.id)) return;
    
    tracker.setProcessing(tab.id, true);
    try {
        const duplicates = await findDuplicates(tab, loadingUrl);
        if (duplicates.length > 0) {
            const allTabs = [tab, ...duplicates];
            const tabToKeep = selectBestTab(allTabs);
            
            const closurePromises = allTabs
                .filter(dupTab => dupTab.id !== tabToKeep.id)
                .map(dupTab => closeDuplicate(dupTab.id, tabToKeep));
                
            await Promise.allSettled(closurePromises);
        }
    } catch (error) {
        console.error("Error handling duplicates:", error.message);
    } finally {
        tracker.setProcessing(tab.id, false);
    }
}, DEBOUNCE_DELAY);

const closeAllDuplicates = async () => {
    const allTabs = await safeQueryTabs();
    if (allTabs.length <= 1) return;
    
    const urlGroups = new Map();
    
    for (const tab of allTabs) {
        if (isBlankURL(tab.url) || isBrowserURL(tab.url) ||
            tracker.isIgnored(tab.id) || !shouldProcessURL(tab.url)) {
            continue;
        }
        
        const normalizedKey = URLPatternHandler.getNormalizedKey(tab.url);
        if (!normalizedKey) continue;
        
        if (!urlGroups.has(normalizedKey)) {
            urlGroups.set(normalizedKey, []);
        }
        urlGroups.get(normalizedKey).push(tab);
    }
    
    const closurePromises = [];
    for (const tabs of urlGroups.values()) {
        if (tabs.length > 1) {
            const tabToKeep = selectBestTab(tabs);
            const tabsToClose = tabs.filter(tab => tab.id !== tabToKeep.id);
            
            tabsToClose.forEach(tab => {
                tracker.ignore(tab.id);
                closurePromises.push(safeRemoveTab(tab.id));
            });
            
            if (!tabToKeep.active) {
                setTimeout(async () => {
                    try {
                        await chrome.tabs.update(tabToKeep.id, { active: true });
                    } catch (error) {
                        console.warn("Failed to activate tab:", error.message);
                    }
                }, TAB_REMOVAL_DELAY);
            }
        }
    }
    
    const results = await Promise.allSettled(closurePromises);
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
        console.warn(`Failed to close ${failed} duplicate tabs`);
    }
};

const safeHandler = (handler) => {
    return (...args) => {
        Promise.resolve(handler(...args)).catch(error => {
            console.error("Handler error:", error.message, error.stack);
        });
    };
};

chrome.tabs.onCreated.addListener(safeHandler(async (tab) => {
    tracker.markCreated(tab.id);
    if (tab.status === "complete" && !isBlankURL(tab.url) && shouldProcessURL(tab.url)) {
        tracker.markCompleted(tab.id);
        await handleDuplicates(tab);
    }
}));

chrome.webNavigation.onBeforeNavigate.addListener(safeHandler(async (details) => {
    if (details.frameId === 0 && details.tabId !== -1 &&
        !isBlankURL(details.url) && shouldProcessURL(details.url)) {
        const tab = await safeGetTab(details.tabId);
        if (tab && !tracker.isIgnored(details.tabId)) {
            await handleDuplicates(tab, details.url);
        }
    }
}));

chrome.webNavigation.onCompleted.addListener(safeHandler(async (details) => {
    if (details.frameId === 0 && details.tabId !== -1) {
        tracker.markCompleted(details.tabId);
        const tab = await safeGetTab(details.tabId);
        if (tab && !tracker.isIgnored(details.tabId) && shouldProcessURL(tab.url)) {
            await handleDuplicates(tab);
        }
    }
}));

chrome.tabs.onRemoved.addListener((tabId) => {
    tracker.remove(tabId);
});

if (chrome.commands) {
    chrome.commands.onCommand.addListener((command) => {
        if (command === "close-duplicate-tabs") {
            closeAllDuplicates().catch(console.error);
        }
    });
}

if (chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(() => {
        setTimeout(() => closeAllDuplicates().catch(console.error), 2000);
    });
}

if (chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(() => {
        setTimeout(() => closeAllDuplicates().catch(console.error), 3000);
    });
}

console.log("Enhanced duplicate tab closer initialized successfully");
console.log(`URLPattern support: ${URLPatternHandler.isSupported() ? '✅ Available' : '❌ Using fallback'}`);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        URLPatternHandler,
        EnhancedTabTracker,
        findDuplicates,
        closeAllDuplicates
    };
}