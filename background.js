"use strict";

const wait = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const debounce = (func, delay) => {
    const storedArguments = new Map();
    return (...args) => {
        const windowId = args[0] || 1;
        const later = () => {
            const laterArgs = storedArguments.get(windowId);
            if (laterArgs) {
                func(laterArgs);
                setTimeout(later, delay);
                storedArguments.set(windowId, null);
            } else {
                storedArguments.delete(windowId);
            }
        };

        if (!storedArguments.has(windowId)) {
            func(args[1] || args[0]);
            setTimeout(later, delay);
            storedArguments.set(windowId, null);
        } else {
            storedArguments.set(windowId, args[1] || args[0] || 1);
        }
    };
};

const isTabComplete = tab => tab.status === "complete";

const isBlankURL = (url) => url === "about:blank";

const getMatchingURL = (url) => {
    const regex = /^(f|ht)tps?:\/\//i;
    if (!regex.test(url)) return url;

    let matchingURL = url;
    matchingURL = matchingURL.replace(/^http:\/\//i, "https://");
    matchingURL = matchingURL.replace("://www.", "://");
    matchingURL = matchingURL.toLowerCase();
    matchingURL = matchingURL.replace(/\/$/, "");
    return matchingURL;
};

const getMatchPatternURL = (url) => {
    const regex = /^(f|ht)tps?:\/\//i;
    if (regex.test(url)) {
        const uri = new URL(url);
        let urlPattern = `*://${uri.hostname}${uri.pathname}`;
        if (uri.search || uri.hash) {
            urlPattern += "*";
        }
        return urlPattern;
    } else if (url.startsWith("about:") || url.startsWith("chrome://")) {
        return `${url}*`;
    }
    return null;
};

const getTab = (tabId) => new Promise((resolve) => {
    chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError) console.error("getTab error:", chrome.runtime.lastError.message);
        resolve(chrome.runtime.lastError ? null : tab);
    });
});

const getTabs = (queryInfo) => new Promise((resolve) => {
    queryInfo.windowType = "normal";
    chrome.tabs.query(queryInfo, tabs => {
        if (chrome.runtime.lastError) console.error("getTabs error:", chrome.runtime.lastError.message);
        resolve(chrome.runtime.lastError ? null : tabs);
    });
});

const getActiveWindowId = () => new Promise((resolve) => {
    chrome.windows.getLastFocused(null, window => {
        if (chrome.runtime.lastError) console.error("getActiveWindowId error:", chrome.runtime.lastError.message);
        resolve(chrome.runtime.lastError ? null : window.id);
    });
});

const updateTab = (tabId, updateProperties) => new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, updateProperties, () => {
        if (chrome.runtime.lastError) {
            console.error("updateTab error:", tabId, updateProperties, chrome.runtime.lastError.message);
            reject();
        } else resolve();
    });
});

const updateWindow = (windowId, updateProperties) => new Promise((resolve, reject) => {
    chrome.windows.update(windowId, updateProperties, () => {
        if (chrome.runtime.lastError) {
            console.error("updateWindow error:", chrome.runtime.lastError.message);
            reject();
        } else resolve();
    });
});

const activateTab = (tabId) => updateTab(tabId, { active: true });

const activateWindow = (windowId) => updateWindow(windowId, { focused: true });

const focusTab = (tabId, windowId) => Promise.all([activateTab(tabId), activateWindow(windowId)]);

const removeTab = (tabId) => new Promise((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
            console.error("removeTab error:", chrome.runtime.lastError.message);
            reject();
        } else resolve();
    });
});

class TabsInfo {
    constructor() {
        this.tabs = new Map();
        this.initialize();
    }

    async initialize() {
        const openedTabs = await getTabs({ windowType: "normal" });
        for (const openedTab of openedTabs) {
            this.setOpenedTab(openedTab);
        }
    }

    setNewTab(tabId) {
        const tab = { url: null, lastComplete: null, ignored: false };
        this.tabs.set(tabId, tab);
    }

    setOpenedTab(openedTab) {
        const tab = { url: openedTab.url, lastComplete: Date.now(), ignored: false };
        this.tabs.set(openedTab.id, tab);
    }

    ignoreTab(tabId, state) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.ignored = state;
            this.tabs.set(tabId, tab);
        }
    }

    isIgnoredTab(tabId) {
        const tab = this.tabs.get(tabId);
        return (!tab || tab.ignored) ? true : false;
    }

    getLastComplete(tabId) {
        const tab = this.tabs.get(tabId);
        return tab ? tab.lastComplete : null;
    }

    updateTab(openedTab) {
        const tab = this.tabs.get(openedTab.id);
        if (tab) {
            tab.url = openedTab.url;
            tab.lastComplete = Date.now();
            this.tabs.set(openedTab.id, tab);
        }
    }

    resetTab(tabId) {
        this.setNewTab(tabId);
    }

    hasUrlChanged(openedTab) {
        const tab = this.tabs.get(openedTab.id);
        return tab ? tab.url !== openedTab.url : true;
    }

    removeTab(tabId) {
        this.tabs.delete(tabId);
    }

    hasTab(tabId) {
        return this.tabs.has(tabId);
    }
}

const tabsInfo = new TabsInfo();

const getLastUpdatedTabId = (observedTab, openedTab) => {
    const observedTabLastUpdate = tabsInfo.getLastComplete(observedTab.id);
    const openedTabLastUpdate = tabsInfo.getLastComplete(openedTab.id);
    
    if (observedTabLastUpdate === null) return openedTab.id;
    if (openedTabLastUpdate === null) return observedTab.id;
    return (observedTabLastUpdate < openedTabLastUpdate) ? observedTab.id : openedTab.id;
};

const getFocusedTab = (observedTab, openedTab, activeWindowId, retainedTabId) => {
    if (retainedTabId === observedTab.id) {
        return ((openedTab.windowId === activeWindowId) && (openedTab.active || (observedTab.windowId !== activeWindowId)) ? openedTab.id : observedTab.id);
    } else {
        return ((observedTab.windowId === activeWindowId) && (observedTab.active || (openedTab.windowId !== activeWindowId)) ? observedTab.id : openedTab.id);
    }
};

const getCloseInfo = (details) => {
    const observedTab = details.observedTab;
    const openedTab = details.openedTab;
    const activeWindowId = details.activeWindowId;
    
    let retainedTabId = getLastUpdatedTabId(observedTab, openedTab);
    if (activeWindowId) {
        retainedTabId = getFocusedTab(observedTab, openedTab, activeWindowId, retainedTabId);
    }
    
    if (retainedTabId === observedTab.id) {
        const keepInfo = {
            observedTabClosed: false,
            active: openedTab.active,
            tabId: observedTab.id,
            windowId: observedTab.windowId
        };
        return [openedTab.id, keepInfo];
    } else {
        const keepInfo = {
            observedTabClosed: true,
            active: observedTab.active,
            tabId: openedTab.id,
            windowId: openedTab.windowId
        };
        return [observedTab.id, keepInfo];
    }
};

const searchForDuplicateTabsToClose = async (observedTab, queryComplete, loadingUrl) => {
    const observedTabUrl = loadingUrl || observedTab.url;
    const queryInfo = {};
    queryInfo.status = queryComplete ? "complete" : null;
    queryInfo.url = getMatchPatternURL(observedTabUrl);
    
    const openedTabs = await getTabs(queryInfo);
    if (openedTabs && openedTabs.length > 1) {
        const matchingObservedTabUrl = getMatchingURL(observedTabUrl);
        for (const openedTab of openedTabs) {
            if ((openedTab.id === observedTab.id) || tabsInfo.isIgnoredTab(openedTab.id) || (isBlankURL(openedTab.url) && !isTabComplete(openedTab))) continue;
            if (getMatchingURL(openedTab.url) === matchingObservedTabUrl) {
                const [tabToCloseId, remainingTabInfo] = getCloseInfo({ 
                    observedTab: observedTab, 
                    observedTabUrl: observedTabUrl, 
                    openedTab: openedTab,
                    activeWindowId: await getActiveWindowId()
                });
                await closeDuplicateTab(tabToCloseId, remainingTabInfo);
                if (remainingTabInfo.observedTabClosed) break;
            }
        }
    }
};

const closeDuplicateTab = async (tabToCloseId, remainingTabInfo) => {
    try {
        tabsInfo.ignoreTab(tabToCloseId, true);
        await removeTab(tabToCloseId);
    } catch (ex) {
        tabsInfo.ignoreTab(tabToCloseId, false);
        return;
    }
    
    if (tabsInfo.hasTab(tabToCloseId)) {
        await wait(10);
        if (tabsInfo.hasTab(tabToCloseId)) {
            tabsInfo.ignoreTab(tabToCloseId, false);
            return;
        }
    }
    
    handleRemainingTab(remainingTabInfo.windowId, remainingTabInfo);
};

const _handleRemainingTab = async (details) => {
    if (!tabsInfo.hasTab(details.tabId)) return;
    focusTab(details.tabId, details.windowId);
};

const handleRemainingTab = debounce(_handleRemainingTab, 500);

const searchForDuplicateTabs = async (windowId, closeTabs) => {
    const queryInfo = { windowType: "normal" };
    const [activeWindowId, openedTabs] = await Promise.all([getActiveWindowId(), getTabs(queryInfo)]);
    const duplicateTabsGroups = new Map();
    const retainedTabs = new Map();
    
    for (const openedTab of openedTabs) {
        if ((isBlankURL(openedTab.url) && !isTabComplete(openedTab)) || tabsInfo.isIgnoredTab(openedTab.id)) continue;
        
        const matchingTabURL = getMatchingURL(openedTab.url);
        let retainedTab = retainedTabs.get(matchingTabURL);
        
        if (!retainedTab) {
            if (isTabComplete(openedTab)) retainedTabs.set(matchingTabURL, openedTab);
        } else {
            if (closeTabs) {
                const [tabToCloseId] = getCloseInfo({ 
                    observedTab: openedTab, 
                    openedTab: retainedTab, 
                    activeWindowId: activeWindowId 
                });
                if (tabToCloseId === openedTab.id) {
                    chrome.tabs.remove(openedTab.id);
                } else {
                    chrome.tabs.remove(retainedTab.id);
                    retainedTabs.set(matchingTabURL, openedTab);
                }
            } else {
                const tabs = duplicateTabsGroups.get(matchingTabURL) || new Set([retainedTab]);
                tabs.add(openedTab);
                duplicateTabsGroups.set(matchingTabURL, tabs);
            }
        }
    }
    
    if (!closeTabs) {
        return {
            duplicateTabsGroups: duplicateTabsGroups,
            activeWindowId: activeWindowId
        };
    }
};

const closeDuplicateTabs = (windowId) => searchForDuplicateTabs(windowId, true);

const onCreatedTab = (tab) => {
    tabsInfo.setNewTab(tab.id);
    if (tab.status === "complete" && !isBlankURL(tab.url)) {
        searchForDuplicateTabsToClose(tab, true);
    }
};

const onBeforeNavigate = async (details) => {
    if ((details.frameId === 0) && (details.tabId !== -1) && !isBlankURL(details.url)) {
        if (tabsInfo.isIgnoredTab(details.tabId)) return;
        const tab = await getTab(details.tabId);
        if (tab) {
            tabsInfo.resetTab(tab.id);
            searchForDuplicateTabsToClose(tab, true, details.url);
        }
    }
};

const onCompletedTab = async (details) => {
    if ((details.frameId === 0) && (details.tabId !== -1)) {
        if (tabsInfo.isIgnoredTab(details.tabId)) return;
        const tab = await getTab(details.tabId);
        if (tab) {
            tabsInfo.updateTab(tab);
            searchForDuplicateTabsToClose(tab);
        }
    }
};

const onUpdatedTab = (tabId, changeInfo, tab) => {
    if (tabsInfo.isIgnoredTab(tabId)) return;
    if (Object.prototype.hasOwnProperty.call(changeInfo, "status") && changeInfo.status === "complete") {
        if (Object.prototype.hasOwnProperty.call(changeInfo, "url") && (changeInfo.url !== tab.url)) {
            if (isBlankURL(tab.url) || !tabsInfo.hasUrlChanged(tab)) return;
            tabsInfo.updateTab(tab);
            searchForDuplicateTabsToClose(tab);
        } else if (tab.url.startsWith("chrome://")) {
            tabsInfo.updateTab(tab);
            searchForDuplicateTabsToClose(tab);
        }
    }
};

const onAttached = async (tabId) => {
    const tab = await getTab(tabId);
    if (tab) {
        searchForDuplicateTabsToClose(tab);
    }
};

const onRemovedTab = (removedTabId, removeInfo) => {
    tabsInfo.removeTab(removedTabId);
};

const onCommand = (command) => {
    if (command === "close-duplicate-tabs") closeDuplicateTabs();
};

const handleMessage = (message, sender, response) => {
    switch (message.action) {
        case "closeDuplicateTabs": {
            closeDuplicateTabs(message.data.windowId);
            break;
        }
    }
};

const start = async () => {
    chrome.tabs.onCreated.addListener(onCreatedTab);
    chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);
    chrome.tabs.onAttached.addListener(onAttached);
    chrome.tabs.onUpdated.addListener(onUpdatedTab);
    chrome.webNavigation.onCompleted.addListener(onCompletedTab);
    chrome.tabs.onRemoved.addListener(onRemovedTab);
    chrome.commands.onCommand.addListener(onCommand);
    chrome.runtime.onMessage.addListener(handleMessage);
};

start();
