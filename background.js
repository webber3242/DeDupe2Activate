"use strict";

// ===== UTILITY FUNCTIONS =====
const wait = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const debounce = (callback, delay) => {
    const storedArguments = new Map();
    return (...callbackArgs) => {
        const windowId = callbackArgs[0] || 1;
        const later = () => {
            const laterArgs = storedArguments.get(windowId);
            if (laterArgs) {
                callback(...laterArgs);
                setTimeout(later, delay);
                storedArguments.set(windowId, null);
            } else {
                storedArguments.delete(windowId);
            }
        };

        if (!storedArguments.has(windowId)) {
            callback(...callbackArgs);
            setTimeout(later, delay);
            storedArguments.set(windowId, null);
        } else {
            storedArguments.set(windowId, callbackArgs);
        }
    };
};

// ===== SYSTEM MEMORY MONITORING =====
let memoryInfo = { availableCapacity: 0, capacity: 0 };
let memoryCheckInterval = null;

const updateMemoryInfo = async () => {
    try {
        if (chrome.system?.memory?.getInfo) {
            memoryInfo = await chrome.system.memory.getInfo();
            console.debug("Memory updated:", memoryInfo);
            
            // Pause duplicate checking if memory is critically low (less than 10% available)
            const memoryUsageRatio = (memoryInfo.capacity - memoryInfo.availableCapacity) / memoryInfo.capacity;
            if (memoryUsageRatio > 0.9) {
                console.warn("Low memory detected, pausing aggressive duplicate checking");
                return false; // Signal to reduce operations
            }
        }
    } catch (error) {
        console.debug("Memory API not available or failed:", error.message);
    }
    return true; // Continue normal operations
};

const startMemoryMonitoring = () => {
    if (chrome.system?.memory?.getInfo && !memoryCheckInterval) {
        memoryCheckInterval = setInterval(updateMemoryInfo, 30000); // Check every 30 seconds
        updateMemoryInfo(); // Initial check
    }
};

const stopMemoryMonitoring = () => {
    if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
        memoryCheckInterval = null;
    }
};

// ===== URL UTILITY FUNCTIONS WITH IMPROVED MATCH PATTERNS =====
const isTabComplete = tab => tab?.status === "complete";
const isBlankURL = url => !url || url === "about:blank" || url === "chrome://newtab/";

// Improved match pattern creation following Chrome's best practices
const getMatchPatternURL = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    try {
        const urlObj = new URL(url);
        const { protocol, hostname, pathname } = urlObj;
        
        // Handle different schemes according to match pattern rules
        switch (protocol) {
            case 'http:':
            case 'https:':
                // Use wildcard scheme for better flexibility: *://hostname/path*
                return `*://${hostname}${pathname === '/' ? '/*' : pathname + '*'}`;
            case 'file:':
                // File URLs need special handling - use file:/// pattern
                return `file:///*`;
            default:
                // For chrome://, about:, etc. - use exact pattern with wildcard
                if (protocol.startsWith('chrome:') || protocol.startsWith('about:')) {
                    return `${protocol}//${hostname}${pathname}*`;
                }
                return null;
        }
    } catch (error) {
        console.warn("Match pattern creation failed:", error.message);
        return null;
    }
};

const getMatchingURL = (url) => {
    if (!url || typeof url !== 'string') return url;
    
    try {
        const urlObj = new URL(url);
        // Normalize URL for comparison - remove fragments and query params for matching
        let normalizedURL = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
        
        // Remove trailing slash for consistency, except for root
        if (urlObj.pathname !== '/' && normalizedURL.endsWith('/')) {
            normalizedURL = normalizedURL.slice(0, -1);
        }
        
        return normalizedURL.toLowerCase();
    } catch (error) {
        console.warn("URL normalization failed:", error.message);
        return url;
    }
};

// ===== CHROME API WRAPPER FUNCTIONS WITH BETTER ERROR HANDLING =====
const getTab = (tabId) => new Promise((resolve) => {
    if (!tabId || tabId < 0) {
        resolve(null);
        return;
    }
    
    chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError) {
            // Don't log as error - tab might have been closed
            resolve(null);
        } else {
            resolve(tab);
        }
    });
});

const getTabs = (queryInfo = {}) => new Promise((resolve) => {
    // Default to normal windows only
    const query = { windowType: "normal", ...queryInfo };
    
    chrome.tabs.query(query, tabs => {
        if (chrome.runtime.lastError) {
            console.error("getTabs error:", chrome.runtime.lastError.message);
            resolve([]);
        } else {
            resolve(tabs || []);
        }
    });
});

const getActiveWindow = () => new Promise((resolve) => {
    chrome.windows.getLastFocused({ windowTypes: ["normal"] }, window => {
        if (chrome.runtime.lastError) {
            resolve(null);
        } else {
            resolve(window);
        }
    });
});

const updateTab = (tabId, updateProperties) => new Promise((resolve, reject) => {
    if (!tabId || tabId < 0) {
        reject(new Error("Invalid tabId"));
        return;
    }
    
    chrome.tabs.update(tabId, updateProperties, () => {
        if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
        } else {
            resolve();
        }
    });
});

const updateWindow = (windowId, updateProperties) => new Promise((resolve, reject) => {
    if (!windowId || windowId < 0) {
        reject(new Error("Invalid windowId"));
        return;
    }
    
    chrome.windows.update(windowId, updateProperties, () => {
        if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
        } else {
            resolve();
        }
    });
});

const activateTab = (tabId) => updateTab(tabId, { active: true });
const activateWindow = (windowId) => updateWindow(windowId, { focused: true });

const focusTab = async (tabId, windowId) => {
    try {
        await Promise.all([activateTab(tabId), activateWindow(windowId)]);
    } catch (error) {
        console.debug("focusTab error:", error.message);
    }
};

const removeTab = (tabId) => new Promise((resolve, reject) => {
    if (!tabId || tabId < 0) {
        reject(new Error("Invalid tabId"));
        return;
    }
    
    chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
        } else {
            resolve();
        }
    });
});

// ===== ENHANCED TABS INFO CLASS =====
class TabsInfo {
    constructor() {
        this.tabs = new Map();
        this.ignoredTabs = new Set();
        // Store navigation states for better tracking
        this.navigationStates = new Map();
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            const openedTabs = await getTabs({ windowType: "normal" });
            for (const openedTab of openedTabs) {
                if (openedTab?.id && openedTab?.url && !isBlankURL(openedTab.url)) {
                    this.setOpenedTab(openedTab);
                }
            }
            console.log(`TabsInfo initialized with ${this.tabs.size} tabs`);
        } catch (error) {
            console.error("TabsInfo initialization failed:", error.message);
        }
    }

    async waitForInitialization() {
        return this.initPromise;
    }

    setNewTab(tabId) {
        if (!tabId || tabId < 0) return;
        
        const tab = { 
            url: null, 
            lastComplete: null, 
            createdAt: Date.now(),
            documentId: null,
            navigationCount: 0
        };
        this.tabs.set(tabId, tab);
        this.navigationStates.set(tabId, { isNavigating: false, pendingUrl: null });
    }

    setOpenedTab(openedTab) {
        if (!openedTab?.id || !openedTab?.url) return;
        
        const tab = { 
            url: openedTab.url, 
            lastComplete: Date.now(),
            createdAt: Date.now(),
            documentId: null,
            navigationCount: 1
        };
        this.tabs.set(openedTab.id, tab);
        this.navigationStates.set(openedTab.id, { isNavigating: false, pendingUrl: null });
    }

    // Track navigation state to prevent premature duplicate detection
    setNavigationState(tabId, isNavigating, pendingUrl = null, documentId = null) {
        if (!tabId || tabId < 0) return;
        
        const state = this.navigationStates.get(tabId) || { isNavigating: false, pendingUrl: null };
        state.isNavigating = isNavigating;
        state.pendingUrl = pendingUrl;
        if (documentId) state.documentId = documentId;
        this.navigationStates.set(tabId, state);
        
        // Update tab info if exists
        const tab = this.tabs.get(tabId);
        if (tab && documentId) {
            tab.documentId = documentId;
        }
    }

    isNavigating(tabId) {
        if (!tabId || tabId < 0) return false;
        const state = this.navigationStates.get(tabId);
        return state?.isNavigating || false;
    }

    ignoreTab(tabId, isIgnored = true) {
        if (!tabId || tabId < 0) return;
        
        if (isIgnored) {
            this.ignoredTabs.add(tabId);
        } else {
            this.ignoredTabs.delete(tabId);
        }
    }

    isIgnoredTab(tabId) {
        if (!tabId || tabId < 0) return true;
        return this.ignoredTabs.has(tabId);
    }

    getLastComplete(tabId) {
        if (!tabId || tabId < 0) return null;
        const tab = this.tabs.get(tabId);
        return tab?.lastComplete || null;
    }

    updateTab(openedTab, documentId = null) {
        if (!openedTab?.id || !openedTab?.url) return;
        
        const existingTab = this.tabs.get(openedTab.id);
        const tab = existingTab || { createdAt: Date.now(), navigationCount: 0 };
        
        tab.url = openedTab.url;
        tab.lastComplete = Date.now();
        tab.navigationCount = (tab.navigationCount || 0) + 1;
        if (documentId) tab.documentId = documentId;
        
        this.tabs.set(openedTab.id, tab);
        
        // Clear navigation state
        this.setNavigationState(openedTab.id, false, null, documentId);
    }

    resetTab(tabId) {
        if (!tabId || tabId < 0) return;
        this.setNewTab(tabId);
    }

    hasUrlChanged(openedTab) {
        if (!openedTab?.id || !openedTab?.url) return true;
        
        const tab = this.tabs.get(openedTab.id);
        return !tab || tab.url !== openedTab.url;
    }

    removeTab(tabId) {
        if (!tabId || tabId < 0) return;
        this.tabs.delete(tabId);
        this.ignoredTabs.delete(tabId);
        this.navigationStates.delete(tabId);
    }

    hasTab(tabId) {
        if (!tabId || tabId < 0) return false;
        return this.tabs.has(tabId);
    }
}

// ===== GLOBAL INSTANCE =====
const tabsInfo = new TabsInfo();

// ===== DUPLICATE TAB LOGIC WITH IMPROVED ERROR HANDLING =====
const getLastUpdatedTabId = (observedTab, openedTab) => {
    const observedTabLastUpdate = tabsInfo.getLastComplete(observedTab.id);
    const openedTabLastUpdate = tabsInfo.getLastComplete(openedTab.id);
    
    if (observedTabLastUpdate === null) return openedTab.id;
    if (openedTabLastUpdate === null) return observedTab.id;
    return (observedTabLastUpdate < openedTabLastUpdate) ? observedTab.id : openedTab.id;
};

const getFocusedTab = (observedTab, openedTab, activeWindow, retainedTabId) => {
    if (!observedTab || !openedTab || !activeWindow) return retainedTabId;
    
    const activeWindowId = activeWindow.id;
    
    if (retainedTabId === observedTab.id) {
        return ((openedTab.windowId === activeWindowId) && 
                (openedTab.active || (observedTab.windowId !== activeWindowId))) 
                ? openedTab.id : observedTab.id;
    } else {
        return ((observedTab.windowId === activeWindowId) && 
                (observedTab.active || (openedTab.windowId !== activeWindowId))) 
                ? observedTab.id : openedTab.id;
    }
};

const getCloseInfo = (eventData) => {
    const { observedTab, openedTab, activeWindow } = eventData;
    
    if (!observedTab || !openedTab) {
        throw new Error("Invalid tab data provided to getCloseInfo");
    }
    
    let retainedTabId = getLastUpdatedTabId(observedTab, openedTab);
    if (activeWindow) {
        retainedTabId = getFocusedTab(observedTab, openedTab, activeWindow, retainedTabId);
    }
    
    if (retainedTabId === observedTab.id) {
        return [openedTab.id, {
            observedTabClosed: false,
            active: openedTab.active,
            tabId: observedTab.id,
            windowId: observedTab.windowId
        }];
    } else {
        return [observedTab.id, {
            observedTabClosed: true,
            active: observedTab.active,
            tabId: openedTab.id,
            windowId: openedTab.windowId
        }];
    }
};

// ===== IMPROVED DUPLICATE SEARCH WITH FILTERS AND MEMORY CHECK =====
const searchForDuplicateTabsToClose = async (observedTab, queryComplete = false, loadingUrl = null) => {
    if (!observedTab?.id || !observedTab?.url) return;
    
    // Check memory status before proceeding
    const canProceed = await updateMemoryInfo();
    if (!canProceed) {
        console.debug("Skipping duplicate check due to low memory");
        return;
    }
    
    // Don't check for duplicates if tab is currently navigating
    if (tabsInfo.isNavigating(observedTab.id)) {
        console.debug("Tab is navigating, skipping duplicate check:", observedTab.id);
        return;
    }
    
    // Wait for initialization to complete
    await tabsInfo.waitForInitialization();
    
    const observedTabUrl = loadingUrl || observedTab.url;
    const matchPattern = getMatchPatternURL(observedTabUrl);
    
    if (!matchPattern) {
        console.debug("No valid match pattern for URL:", observedTabUrl);
        return;
    }
    
    const queryInfo = { url: matchPattern };
    if (queryComplete) queryInfo.status = "complete";
    
    try {
        const [openedTabs, activeWindow] = await Promise.all([
            getTabs(queryInfo),
            getActiveWindow()
        ]);
        
        if (!openedTabs || openedTabs.length <= 1) return;
        
        const matchingObservedTabUrl = getMatchingURL(observedTabUrl);
        
        for (const openedTab of openedTabs) {
            if (!openedTab?.id || 
                openedTab.id === observedTab.id || 
                tabsInfo.isIgnoredTab(openedTab.id) || 
                tabsInfo.isNavigating(openedTab.id) ||
                (isBlankURL(openedTab.url) && !isTabComplete(openedTab))) {
                continue;
            }
            
            if (getMatchingURL(openedTab.url) === matchingObservedTabUrl) {
                try {
                    const [tabToCloseId, remainingTabInfo] = getCloseInfo({ 
                        observedTab, 
                        observedTabUrl, 
                        openedTab,
                        activeWindow
                    });
                    
                    await closeDuplicateTab(tabToCloseId, remainingTabInfo);
                    if (remainingTabInfo.observedTabClosed) break;
                } catch (error) {
                    console.error("Error processing duplicate tab:", error.message);
                }
            }
        }
    } catch (error) {
        console.error("searchForDuplicateTabsToClose failed:", error.message);
    }
};

const closeDuplicateTab = async (tabToCloseId, remainingTabInfo) => {
    if (!tabToCloseId || !remainingTabInfo) return;
    
    try {
        tabsInfo.ignoreTab(tabToCloseId, true);
        await removeTab(tabToCloseId);
        console.log(`Closed duplicate tab: ${tabToCloseId}`);
    } catch (error) {
        console.debug("Failed to close tab:", tabToCloseId, error.message);
        tabsInfo.ignoreTab(tabToCloseId, false);
        return;
    }
    
    // Handle remaining tab focus
    if (remainingTabInfo.active) {
        handleRemainingTab(remainingTabInfo.windowId, remainingTabInfo);
    }
};

const _handleRemainingTab = async (eventData) => {
    if (!eventData?.tabId || !tabsInfo.hasTab(eventData.tabId)) return;
    
    try {
        await focusTab(eventData.tabId, eventData.windowId);
    } catch (error) {
        console.debug("Failed to focus remaining tab:", error.message);
    }
};

const handleRemainingTab = debounce(_handleRemainingTab, 300);

// ===== MAIN DUPLICATE SEARCH FUNCTION =====
const searchForDuplicateTabs = async (windowId = null, closeTabs = false) => {
    await tabsInfo.waitForInitialization();
    
    // Check memory before bulk operations
    const canProceed = await updateMemoryInfo();
    if (!canProceed && closeTabs) {
        console.warn("Aborting bulk duplicate closure due to low memory");
        return { closedCount: 0 };
    }
    
    const queryInfo = { windowType: "normal" };
    if (windowId) queryInfo.windowId = windowId;
    
    try {
        const [activeWindow, openedTabs] = await Promise.all([
            getActiveWindow(), 
            getTabs(queryInfo)
        ]);
        
        const duplicateTabsGroups = new Map();
        const retainedTabs = new Map();
        let closedCount = 0;
        
        for (const openedTab of openedTabs) {
            if (!openedTab?.id || 
                !openedTab?.url || 
                isBlankURL(openedTab.url) || 
                tabsInfo.isIgnoredTab(openedTab.id) ||
                tabsInfo.isNavigating(openedTab.id)) {
                continue;
            }
            
            const matchingTabURL = getMatchingURL(openedTab.url);
            if (!matchingTabURL) continue;
            
            let retainedTab = retainedTabs.get(matchingTabURL);
            
            if (!retainedTab) {
                retainedTabs.set(matchingTabURL, openedTab);
            } else {
                if (closeTabs) {
                    try {
                        const [tabToCloseId] = getCloseInfo({ 
                            observedTab: openedTab, 
                            openedTab: retainedTab, 
                            activeWindow 
                        });
                        
                        if (tabToCloseId === openedTab.id) {
                            await removeTab(openedTab.id);
                            closedCount++;
                        } else {
                            await removeTab(retainedTab.id);
                            retainedTabs.set(matchingTabURL, openedTab);
                            closedCount++;
                        }
                    } catch (error) {
                        console.debug("Error closing duplicate tab:", error.message);
                    }
                } else {
                    const tabs = duplicateTabsGroups.get(matchingTabURL) || new Set([retainedTab]);
                    tabs.add(openedTab);
                    duplicateTabsGroups.set(matchingTabURL, tabs);
                }
            }
        }
        
        if (closeTabs) {
            console.log(`Duplicate tabs cleanup completed - closed ${closedCount} tabs`);
            return { closedCount };
        } else {
            return { duplicateTabsGroups, activeWindow };
        }
        
    } catch (error) {
        console.error("searchForDuplicateTabs failed:", error.message);
        return closeTabs ? { closedCount: 0 } : { duplicateTabsGroups: new Map() };
    }
};

const closeDuplicateTabs = (windowId = null) => {
    console.log("Starting duplicate tabs cleanup...");
    return searchForDuplicateTabs(windowId, true);
};

// ===== WEBNAVIGATION EVENT HANDLERS WITH FILTERED EVENTS =====
// Using filters as recommended in the chrome.events documentation for better performance

const onBeforeNavigate = async (details) => {
    // Only handle main frame navigations (frameId === 0)
    if (details.frameId !== 0 || 
        details.tabId === -1 || 
        isBlankURL(details.url) || 
        tabsInfo.isIgnoredTab(details.tabId)) {
        return;
    }
    
    // Mark tab as navigating to prevent premature duplicate detection
    tabsInfo.setNavigationState(details.tabId, true, details.url, details.documentId);
    
    console.debug("Navigation started:", details.tabId, details.url);
};

const onCommitted = async (details) => {
    // Only handle main frame navigations
    if (details.frameId !== 0 || 
        details.tabId === -1 || 
        tabsInfo.isIgnoredTab(details.tabId)) {
        return;
    }
    
    console.debug("Navigation committed:", details.tabId, details.url, details.transitionType);
    
    try {
        const tab = await getTab(details.tabId);
        if (tab && !isBlankURL(tab.url)) {
            // Update tab with document ID for better tracking
            tabsInfo.updateTab(tab, details.documentId);
            // Check for duplicates after navigation is committed
            await searchForDuplicateTabsToClose(tab, false, details.url);
        }
    } catch (error) {
        console.debug("onCommitted error:", error.message);
    }
};

const onCompleted = async (details) => {
    // Only handle main frame navigations
    if (details.frameId !== 0 || 
        details.tabId === -1 || 
        tabsInfo.isIgnoredTab(details.tabId)) {
        return;
    }
    
    console.debug("Navigation completed:", details.tabId, details.url);
    
    try {
        const tab = await getTab(details.tabId);
        if (tab && !isBlankURL(tab.url)) {
            // Final update and duplicate check after page is fully loaded
            tabsInfo.updateTab(tab, details.documentId);
            await searchForDuplicateTabsToClose(tab);
        }
    } catch (error) {
        console.debug("onCompleted error:", error.message);
    }
};

const onErrorOccurred = async (details) => {
    // Only handle main frame navigation errors
    if (details.frameId !== 0 || details.tabId === -1) return;
    
    console.debug("Navigation error:", details.tabId, details.error);
    
    // Clear navigation state on error
    tabsInfo.setNavigationState(details.tabId, false);
};

const onHistoryStateUpdated = async (details) => {
    // Handle history API updates (pushState, replaceState)
    if (details.frameId !== 0 || 
        details.tabId === -1 || 
        tabsInfo.isIgnoredTab(details.tabId)) {
        return;
    }
    
    console.debug("History state updated:", details.tabId, details.url);
    
    try {
        const tab = await getTab(details.tabId);
        if (tab && !isBlankURL(tab.url) && tabsInfo.hasUrlChanged(tab)) {
            tabsInfo.updateTab(tab, details.documentId);
            await searchForDuplicateTabsToClose(tab);
        }
    } catch (error) {
        console.debug("onHistoryStateUpdated error:", error.message);
    }
};

const onReferenceFragmentUpdated = async (details) => {
    // Handle fragment changes (hash changes)
    if (details.frameId !== 0 || 
        details.tabId === -1 || 
        tabsInfo.isIgnoredTab(details.tabId)) {
        return;
    }
    
    // Fragment changes don't usually need duplicate checking
    // as they represent the same document
    console.debug("Fragment updated:", details.tabId, details.url);
};

// ===== ENHANCED TAB EVENT HANDLERS =====
const onCreatedTab = (tab) => {
    if (!tab?.id) return;
    
    tabsInfo.setNewTab(tab.id);
    console.debug("Tab created:", tab.id);
    
    // Only check for duplicates if tab is complete and has a valid URL
    if (tab.status === "complete" && !isBlankURL(tab.url)) {
        searchForDuplicateTabsToClose(tab, true);
    }
};

const onUpdatedTab = (tabId, changeInfo, tab) => {
    if (!tabId || !changeInfo || !tab || tabsInfo.isIgnoredTab(tabId)) return;
    
    // Handle status changes
    if (changeInfo.status === "loading") {
        console.debug("Tab loading:", tabId, changeInfo.url || tab.url);
    } else if (changeInfo.status === "complete" && !isBlankURL(tab.url)) {
        console.debug("Tab completed:", tabId, tab.url);
        
        // Check if URL actually changed before processing duplicates
        if (changeInfo.url && tabsInfo.hasUrlChanged(tab)) {
            tabsInfo.updateTab(tab);
            searchForDuplicateTabsToClose(tab);
        } else if (tab.url.startsWith("chrome://")) {
            // Always update chrome:// URLs as they might need reprocessing
            tabsInfo.updateTab(tab);
            searchForDuplicateTabsToClose(tab);
        }
    }
};

const onAttached = async (tabId) => {
    if (!tabId) return;
    
    console.debug("Tab attached:", tabId);
    
    try {
        const tab = await getTab(tabId);
        if (tab && !isBlankURL(tab.url)) {
            await searchForDuplicateTabsToClose(tab);
        }
    } catch (error) {
        console.debug("onAttached error:", error.message);
    }
};

const onRemovedTab = (removedTabId) => {
    if (removedTabId) {
        console.debug("Tab removed:", removedTabId);
        tabsInfo.removeTab(removedTabId);
    }
};

// ===== OTHER EVENT HANDLERS =====
const onActionClicked = () => {
    console.log("Extension action triggered - closing duplicate tabs");
    closeDuplicateTabs();
};

const onInstalled = (details) => {
    console.log("Extension installed/updated:", details.reason);
    
    // Start memory monitoring
    startMemoryMonitoring();
    
    // Only run cleanup for install and update, with delay for stability
    if (details.reason === "install" || details.reason === "update") {
        setTimeout(() => {
            console.log("Running initial duplicate tabs cleanup...");
            closeDuplicateTabs();
        }, 3500);
    }
};

const onStartup = () => {
    console.log("Browser startup detected");
    
    // Start memory monitoring
    startMemoryMonitoring();
    
    // Delay cleanup to ensure browser is fully loaded
    setTimeout(() => {
        console.log("Running startup duplicate tabs cleanup...");
        closeDuplicateTabs();
    }, 5000);
};

const handleMessage = (message, sender, sendResponse) => {
    if (!message?.action) {
        sendResponse({ error: "No action specified" });
        return true;
    }
    
    switch (message.action) {
        case "closeDuplicateTabs": {
            const windowId = message.data?.windowId || null;
            closeDuplicateTabs(windowId)
                .then(result => sendResponse({ success: true, ...result }))
                .catch(error => sendResponse({ error: error.message }));
            return true; // Async response
        }
        case "getDuplicateTabs": {
            const windowId = message.data?.windowId || null;
            searchForDuplicateTabs(windowId, false)
                .then(result => sendResponse({ success: true, ...result }))
                .catch(error => sendResponse({ error: error.message }));
            return true; // Async response
        }
        case "getMemoryInfo": {
            sendResponse({ 
                success: true, 
                memoryInfo: memoryInfo,
                memoryAvailable: chrome.system?.memory?.getInfo ? true : false
            });
            return false; // Sync response
        }
        default: {
            sendResponse({ error: "Unknown action" });
        }
    }
    
    return true;
};

// ===== SERVICE WORKER EVENT LISTENERS WITH FILTERS =====
// These must be declared at the top level for proper service worker behavior
// Using filtered events as recommended in chrome.events documentation for better performance

// Enhanced WebNavigation events with URL filters for better performance
chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate, {
    url: [
        { schemes: ['http', 'https'] },
        { schemes: ['file'] },
        { urlPrefix: 'chrome://' }
    ]
});

chrome.webNavigation.onCommitted.addListener(onCommitted, {
    url: [
        { schemes: ['http', 'https'] },
        { schemes: ['file'] },
        { urlPrefix: 'chrome://' }
    ]
});

chrome.webNavigation.onCompleted.addListener(onCompleted, {
    url: [
        { schemes: ['http', 'https'] },
        { schemes: ['file'] },
        { urlPrefix: 'chrome://' }
    ]
});

chrome.webNavigation.onErrorOccurred.addListener(onErrorOccurred, {
    url: [
        { schemes: ['http', 'https'] },
        { schemes: ['file'] }
    ]
});

chrome.webNavigation.onHistoryStateUpdated.addListener(onHistoryStateUpdated, {
    url: [
        { schemes: ['http', 'https'] }
    ]
});

chrome.webNavigation.onReferenceFragmentUpdated.addListener(onReferenceFragmentUpdated, {
    url: [
        { schemes: ['http', 'https'] }
    ]
});

// Tab API events - these don't support filters but are optimized internally
chrome.tabs.onCreated.addListener(onCreatedTab);
chrome.tabs.onUpdated.addListener(onUpdatedTab);
chrome.tabs.onAttached.addListener(onAttached);
chrome.tabs.onRemoved.addListener(onRemovedTab);

// Extension lifecycle events
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.runtime.onStartup.addListener(onStartup);

// Service worker suspend/resume handling
chrome.runtime.onSuspend?.addListener(() => {
    console.log("Service worker suspending - cleaning up memory monitoring");
    stopMemoryMonitoring();
});

chrome.runtime.onSuspendCanceled?.addListener(() => {
    console.log("Service worker suspend canceled - resuming memory monitoring");
    startMemoryMonitoring();
});

// User interaction events
chrome.action.onClicked.addListener(onActionClicked);

// Message handling
chrome.runtime.onMessage.addListener(handleMessage);

// ===== INITIALIZATION LOG =====
console.log("Enhanced Duplicate Tabs Extension Service Worker initialized");
console.log("Features enabled:");
console.log("- WebNavigation API with URL filters for better performance");
console.log("- System Memory API monitoring (if available)");
console.log("- Enhanced tab creation, updates, and lifecycle management");
console.log("- Service worker suspend/resume handling");
console.log("- Bulk rule processing for efficient duplicate detection");
console.log("- Memory-aware duplicate checking to prevent system strain");

// Check for system.memory API availability
if (chrome.system?.memory?.getInfo) {
    console.log("- System Memory API available - memory monitoring enabled");
} else {
    console.log("- System Memory API not available - memory monitoring disabled");
}

console.log("Ready to manage duplicate tabs with enhanced performance optimizations!");

// Export for testing (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getMatchPatternURL,
        getMatchingURL,
        TabsInfo,
        searchForDuplicateTabs,
        closeDuplicateTabs,
        updateMemoryInfo,
        startMemoryMonitoring,
        stopMemoryMonitoring
    };
}
