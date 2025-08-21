/* global chrome */
"use strict";

/**
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
const wait = (timeout) => new Promise((resolve) => {
  setTimeout(() => resolve(), timeout);
});

const chromeAPI = {
  /**
   * @param {number} tabId - The tab ID
   * @returns {Promise<chrome.tabs.Tab|null>}
   */
  getTab: (tabId) => new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(tab);
      }
    });
  }),

  /**
   * @param {chrome.tabs.QueryInfo} queryInfo - Query parameters
   * @returns {Promise<chrome.tabs.Tab[]|null>}
   */
  getTabs: (queryInfo = {}) => new Promise((resolve) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(tabs);
      }
    });
  }),

  /**
   * @param {number} tabId - The tab ID
   * @param {chrome.tabs.UpdateProperties} props - Update properties
   * @returns {Promise<chrome.tabs.Tab|null>}
   */
  updateTab: (tabId, props) => new Promise((resolve) => {
    chrome.tabs.update(tabId, props, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(tab);
      }
    });
  }),

  /**
   * @param {number} windowId - The window ID
   * @param {chrome.windows.UpdateInfo} props - Update properties
   * @returns {Promise<chrome.windows.Window|null>}
   */
  updateWindow: (windowId, props) => new Promise((resolve) => {
    chrome.windows.update(windowId, props, (window) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(window);
      }
    });
  }),

  /**
   * @param {number} tabId - The tab ID
   * @returns {Promise<boolean>}
   */
  removeTab: (tabId) => new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => {
      resolve(!chrome.runtime.lastError);
    });
  }),

  /**
   * @param {number} tabId - The tab ID
   * @param {number} windowId - The window ID
   * @returns {Promise<void>}
   */
  focusTab: async (tabId, windowId) => {
    try {
      await Promise.all([
        chromeAPI.updateTab(tabId, { active: true }),
        chromeAPI.updateWindow(windowId, { focused: true })
      ]);
    } catch (error) {
      console.error('Failed to focus tab:', error);
    }
  }
};

/**
 * @param {Function} operation - The operation to perform
 * @param {...any} args - Arguments for the operation
 * @returns {Promise<any>}
 */
const safeTabOperation = async (operation, ...args) => {
  try {
    const result = await operation(...args);
    return result;
  } catch (error) {
    if (error && error.message && (
        error.message.includes('No tab with id') || 
        error.message.includes('Tab not found') ||
        error.message.includes('Cannot access')
      )) {
      return null;
    }
    console.error('Tab operation failed:', error);
    throw error;
  }
};

const urlUtils = {
  /**
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isBlank: (url) => url === "about:blank",

  /**
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isBrowser: (url) => url.startsWith("about:") || url.startsWith("chrome://"),

  /**
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  isValid: (url) => /^(f|ht)tps?:\/\//i.test(url),

  /**
   * @param {string} url - URL to normalize
   * @returns {string}
   */
  normalize: (url) => {
    if (!urlUtils.isValid(url)) return url;
    let normalized = url.replace("://www.", "://").toLowerCase();
    return normalized.replace(/\/$/, "");
  },

  /**
   * @param {string} url - URL to convert to pattern
   * @returns {string|null}
   */
  toPattern: (url) => {
    if (urlUtils.isValid(url)) {
      try {
        const uri = new URL(url);
        let pattern = `*://${uri.hostname}${uri.pathname}`;
        if (uri.search || uri.hash) pattern += "*";
        return pattern;
      } catch (error) {
        console.error('Invalid URL for pattern creation:', url, error);
        return null;
      }
    } else if (urlUtils.isBrowser(url)) {
      return `${url}*`;
    }
    return null;
  }
};

class TabsInfo {
  constructor() {
    /** @type {Map<number, {url: string|null, windowId: number|null, lastUpdate: number, ignored: boolean}>} */
    this.tabs = new Map();
    this.initialize().catch(error => console.error('Failed to initialize TabsInfo:', error));
  }

  async initialize() {
    try {
      const tabs = await safeTabOperation(chromeAPI.getTabs, { status: "complete" });
      if (tabs && Array.isArray(tabs)) {
        tabs.forEach(tab => this.addTab(tab.id, tab.url, tab.windowId));
      }
    } catch (error) {
      console.error('Error initializing tabs:', error);
    }
  }

  /**
   * @param {number} tabId - Tab ID
   * @param {string|null} url - Tab URL
   * @param {number|null} windowId - Window ID
   */
  addTab(tabId, url = null, windowId = null) {
    this.tabs.set(tabId, { 
      url, 
      windowId, 
      lastUpdate: Date.now(), 
      ignored: false 
    });
  }

  /**
   * @param {number} tabId - Tab ID
   * @param {string} url - Tab URL
   * @param {number|null} windowId - Window ID
   */
  updateTab(tabId, url, windowId = null) {
    let tab = this.tabs.get(tabId);
    if (!tab) {
      tab = { url, windowId, lastUpdate: Date.now(), ignored: false };
      this.tabs.set(tabId, tab);
    } else {
      if (url !== undefined) tab.url = url;
      if (windowId !== null) tab.windowId = windowId;
      tab.lastUpdate = Date.now();
    }
  }

  /**
   * @param {number} tabId - Tab ID
   */
  removeTab(tabId) {
    this.tabs.delete(tabId);
  }

  /**
   * @param {number} tabId - Tab ID
   * @param {boolean} ignored - Whether to ignore the tab
   */
  ignoreTab(tabId, ignored = true) {
    const tab = this.tabs.get(tabId);
    if (tab) tab.ignored = ignored;
  }

  /**
   * @param {number} tabId - Tab ID
   * @returns {boolean}
   */
  isIgnored(tabId) {
    const tab = this.tabs.get(tabId);
    return !tab || tab.ignored;
  }

  /**
   * @param {number} tabId - Tab ID
   * @returns {number|null}
   */
  getLastUpdate(tabId) {
    const tab = this.tabs.get(tabId);
    return tab ? tab.lastUpdate : null;
  }

  /**
   * @param {number} tabId - Tab ID
   * @returns {number|null}
   */
  getWindowId(tabId) {
    const tab = this.tabs.get(tabId);
    return tab ? tab.windowId : null;
  }

  /**
   * @param {number} tabId - Tab ID
   * @param {string} newUrl - New URL
   * @returns {boolean}
   */
  urlChanged(tabId, newUrl) {
    const tab = this.tabs.get(tabId);
    return !tab || tab.url !== newUrl;
  }
}

const tabsInfo = new TabsInfo();

const duplicateHandler = {
  /**
   * @param {chrome.tabs.Tab} tab1 - First tab
   * @param {chrome.tabs.Tab} tab2 - Second tab
   * @returns {chrome.tabs.Tab}
   */
  shouldKeepTab: (tab1, tab2) => {
    const time1 = tabsInfo.getLastUpdate(tab1.id);
    const time2 = tabsInfo.getLastUpdate(tab2.id);
    if (!time1) return tab2;
    if (!time2) return tab1;
    return time1 < time2 ? tab1 : tab2;
  },

  /**
   * @param {chrome.tabs.Tab} tabToClose - Tab to close
   * @param {chrome.tabs.Tab} tabToKeep - Tab to keep
   * @returns {Promise<void>}
   */
  async closeDuplicate(tabToClose, tabToKeep) {
    try {
      tabsInfo.ignoreTab(tabToClose.id);
      const success = await safeTabOperation(chromeAPI.removeTab, tabToClose.id);
      
      if (success) {
        await wait(25);
        const windowId = tabsInfo.getWindowId(tabToKeep.id) || tabToKeep.windowId;
        if (windowId) {
          safeTabOperation(chromeAPI.focusTab, tabToKeep.id, windowId)
            .catch(error => console.error('Failed to focus tab:', error));
        }
      }
    } catch (error) {
      console.error("Failed to close duplicate:", error);
      tabsInfo.ignoreTab(tabToClose.id, false);
    }
  },

  /**
   * @param {chrome.tabs.Tab} targetTab - Target tab to check for duplicates
   * @returns {Promise<void>}
   */
  async findAndCloseDuplicates(targetTab) {
    if (tabsInfo.isIgnored(targetTab.id) || urlUtils.isBlank(targetTab.url)) {
      return;
    }
    
    const pattern = urlUtils.toPattern(targetTab.url);
    if (!pattern) return;

    try {
      const tabs = await safeTabOperation(chromeAPI.getTabs, { 
        url: pattern, 
        status: "complete" 
      });
      
      if (!tabs || !Array.isArray(tabs) || tabs.length < 2) return;
      
      const normalizedUrl = urlUtils.normalize(targetTab.url);
      
      for (const tab of tabs) {
        if (tab.id === targetTab.id || tabsInfo.isIgnored(tab.id)) continue;
        
        if (urlUtils.normalize(tab.url) === normalizedUrl) {
          const tabToKeep = duplicateHandler.shouldKeepTab(targetTab, tab);
          const tabToClose = tabToKeep.id === targetTab.id ? tab : targetTab;
          await duplicateHandler.closeDuplicate(tabToClose, tabToKeep);
          if (tabToClose.id === targetTab.id) break;
        }
      }
    } catch (error) {
      console.error('Error finding duplicates for tab:', targetTab.id, error);
    }
  },

  /**
   * @returns {Promise<void>}
   */
  async processAllTabs() {
    try {
      await wait(2000);
      const tabs = await safeTabOperation(chromeAPI.getTabs, { status: "complete" });
      if (tabs && Array.isArray(tabs)) {
        for (const tab of tabs) {
          if (!tabsInfo.isIgnored(tab.id) && !urlUtils.isBlank(tab.url)) {
            await duplicateHandler.findAndCloseDuplicates(tab);
          }
        }
      }
    } catch (error) {
      console.error("Error processing all tabs:", error);
    }
  }
};

const eventHandlers = {
  /**
   * @param {chrome.tabs.Tab} tab - Created tab
   */
  onTabCreated: (tab) => {
    tabsInfo.addTab(tab.id, tab.url, tab.windowId);
    if (tab.status === "complete" && !urlUtils.isBlank(tab.url)) {
      duplicateHandler.findAndCloseDuplicates(tab)
        .catch(error => console.error('Error handling tab creation:', error));
    }
  },

  /**
   * @param {number} tabId - Tab ID
   * @param {chrome.tabs.TabChangeInfo} changeInfo - Change information
   * @param {chrome.tabs.Tab} tab - Updated tab
   */
  onTabUpdated: (tabId, changeInfo, tab) => {
    if (tabsInfo.isIgnored(tabId) || changeInfo.status !== "complete") return;
    
    if (tabsInfo.urlChanged(tabId, tab.url)) {
      tabsInfo.updateTab(tabId, tab.url, tab.windowId);
      if (!urlUtils.isBlank(tab.url)) {
        duplicateHandler.findAndCloseDuplicates(tab)
          .catch(error => console.error('Error handling tab update:', error));
      }
    }
  },

  /**
   * @param {number} tabId - Removed tab ID
   */
  onTabRemoved: (tabId) => {
    tabsInfo.removeTab(tabId);
  },

  /**
   * @param {number} tabId - Attached tab ID
   */
  onTabAttached: (tabId) => {
    (async () => {
      try {
        const tab = await safeTabOperation(chromeAPI.getTab, tabId);
        if (tab) {
          tabsInfo.updateTab(tab.id, tab.url, tab.windowId);
          if (!urlUtils.isBlank(tab.url)) {
            await duplicateHandler.findAndCloseDuplicates(tab);
          }
        }
      } catch (error) {
        console.error('Error handling tab attachment:', error);
      }
    })();
  },

  /**
   * @param {chrome.webNavigation.WebNavigationFramedCallbackDetails} details - Navigation details
   */
  onBeforeNavigate: (details) => {
    if (details.frameId === 0 && details.tabId !== -1 && !urlUtils.isBlank(details.url)) {
      (async () => {
        try {
          const tab = await safeTabOperation(chromeAPI.getTab, details.tabId);
          if (tab && !tabsInfo.isIgnored(tab.id)) {
            if (tabsInfo.urlChanged(tab.id, details.url)) {
              tabsInfo.updateTab(tab.id, details.url, tab.windowId);
              const updatedTab = { ...tab, url: details.url };
              await duplicateHandler.findAndCloseDuplicates(updatedTab);
            }
          }
        } catch (error) {
          console.error('Error handling navigation:', error);
        }
      })();
    }
  }
};

/**
 * Initialize the extension
 * @returns {Promise<void>}
 */
const initialize = async () => {
  try {
    console.log("Enhanced Auto DeDupe starting...");
    
    // Add event listeners
    chrome.tabs.onCreated.addListener(eventHandlers.onTabCreated);
    chrome.tabs.onUpdated.addListener(eventHandlers.onTabUpdated);
    chrome.tabs.onRemoved.addListener(eventHandlers.onTabRemoved);
    chrome.tabs.onAttached.addListener(eventHandlers.onTabAttached);
    
    // Add web navigation listener with proper error handling
    if (chrome.webNavigation) {
      chrome.webNavigation.onBeforeNavigate.addListener(
        eventHandlers.onBeforeNavigate,
        { url: [{ urlMatches: 'https?://.*' }] }
      );
    }
    
    // Process existing tabs after a delay using a more controlled approach
    const timeoutId = setTimeout(() => {
      duplicateHandler.processAllTabs()
        .catch(error => console.error('Error in initial tab processing:', error));
    }, 3000);
    
    // Store timeout ID for potential cleanup
    if (typeof globalThis !== 'undefined') {
      globalThis.extensionTimeoutId = timeoutId;
    }
    
    console.log("Enhanced Auto DeDupe initialized successfully");
  } catch (error) {
    console.error("Failed to initialize extension:", error);
  }
};

// Initialize the extension
initialize().catch(error => console.error('Failed to start extension:', error));
