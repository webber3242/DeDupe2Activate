<div align="center">
  <img src="images/icon128.png" alt="DeDupe2Activate Logo" width="128" height="128">
  <h3>Advanced Chrome Extension for Intelligent Duplicate Tab Management</h3>
  <p>
    <strong>DeDupe2Activate</strong> automatically detects and closes duplicate tabs with memory-aware processing, enhanced navigation tracking, and system performance optimization.
  </p>
  <p>
    <a href="#features"><strong>Features</strong></a> •
    <a href="#installation"><strong>Installation</strong></a> •
    <a href="#usage"><strong>Usage</strong></a> •
    <a href="#configuration"><strong>Configuration</strong></a> •
    <a href="#contributing"><strong>Contributing</strong></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Chrome-Extension-blue?style=flat-square&logo=google-chrome" alt="Chrome Extension">
    <img src="https://img.shields.io/badge/Manifest-V3-green?style=flat-square" alt="Manifest V3">
    <img src="https://img.shields.io/badge/JavaScript-ES2022-yellow?style=flat-square&logo=javascript" alt="JavaScript ES2022">
    <img src="https://img.shields.io/badge/License-MIT-red?style=flat-square" alt="MIT License">
  </p>
</div>

## Why This Extension?

Ever opened the same webpage in multiple tabs by accident? Or clicked a bookmark only to realize you already had that page open? This extension fixes that annoyance by automatically closing duplicate tabs while being smart about which one to keep - all while monitoring system resources to prevent browser slowdown.

## Features

### 🧠 Enhanced Smart Duplicate Detection
- Recognizes when `example.com` and `www.example.com` are the same site
- Advanced URL pattern matching with Chrome's native URLPattern API
- Handles URLs with and without trailing slashes, fragments, and query parameters
- Works with HTTP, HTTPS, file://, and chrome:// URLs
- Normalizes URLs for accurate comparison and caching
- Ignores localhost and browser internal pages

### 🎯 Intelligent Tab Selection
When duplicates are found, the extension keeps the "best" tab based on:
- 🎯 Active tab (the one you're currently viewing)
- 🔊 Playing audio 
- 📌 Pinned tabs
- ⏰ Most recently loaded
- 🕒 Oldest tab
- 🪟 Window focus priority

### ⚡ Performance Optimizations
- **Memory-Aware Processing**: Monitors system memory and pauses aggressive checking when memory is low (< 10% available)
- **Navigation State Tracking**: Prevents premature duplicate detection during page loading
- **Enhanced Service Worker**: Optimized event handling with URL filters for better performance
- **Debounced Operations**: Prevents excessive duplicate checks during rapid tab changes
- **Pattern Caching**: Caches URL patterns with LRU eviction for faster processing

### 🔍 Advanced Navigation Tracking
- **Real-time Navigation Monitoring**: Tracks tab navigation states to prevent conflicts
- **Document ID Tracking**: Uses Chrome's documentId for precise navigation tracking
- **Multi-frame Support**: Handles main frame navigations while ignoring sub-frames
- **History API Support**: Detects pushState/replaceState navigation changes
- **Error Handling**: Gracefully handles navigation errors and timeouts

## 📦 Installation

**From Chrome Web Store:**
Coming soon - link will be added once published.

**Manual Installation:**
1. Download this repo or clone it: `git clone https://github.com/webber3242/DeDupe2Activate.git`
2. Go to `chrome://extensions/`
3. Turn on "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder

**System Requirements:**
- Chrome 88+ (requires Manifest V3 support)
- System Memory API support (optional, for memory monitoring)

## How It Works

### Real-time Duplicate Management
- **Enhanced Tab Creation**: Immediately tracks new tabs with creation timestamps
- **Navigation Awareness**: Monitors page loading states to prevent premature closure
- **Smart URL Matching**: Uses advanced pattern matching for accurate duplicate detection
- **Memory Protection**: Automatically reduces activity when system memory is low

### Manual Operations
- **Bulk Cleanup**: Click the extension icon to scan and close all current duplicates
- **Window-Specific**: Target specific windows for duplicate cleanup
- **Memory Status**: Check current system memory usage through the extension

### Startup & Lifecycle
- **Browser Startup**: Automatically scans for duplicates when Chrome starts (with 5-second delay for stability)
- **Extension Install/Update**: Runs initial cleanup after installation or updates
- **Service Worker Management**: Handles suspend/resume cycles for optimal resource usage

## ⚙️ Configuration

You can customize the extension by editing the configuration constants in `background.js`:

### Memory Management
```javascript
// Memory monitoring settings
const updateMemoryInfo = async () => {
    // Pause operations when memory usage > 90%
    const memoryUsageRatio = (capacity - availableCapacity) / capacity;
    if (memoryUsageRatio > 0.9) {
        console.warn("Low memory detected, pausing aggressive duplicate checking");
        return false;
    }
    return true;
};
```

### Navigation Tracking
```javascript
// Enhanced navigation state management
class TabsInfo {
    setNavigationState(tabId, isNavigating, pendingUrl = null, documentId = null) {
        // Prevents duplicate detection during navigation
        const state = { isNavigating, pendingUrl, documentId };
        this.navigationStates.set(tabId, state);
    }
}
```

### URL Pattern Matching
```javascript
const getMatchPatternURL = (url) => {
    // Enhanced pattern creation for different URL schemes
    switch (protocol) {
        case 'http:':
        case 'https:':
            return `*://${hostname}${pathname === '/' ? '/*' : pathname + '*'}`;
        case 'file:':
            return `file:///*`;
        default:
            if (protocol.startsWith('chrome:')) {
                return `${protocol}//${hostname}${pathname}*`;
            }
    }
};
```

### Performance Tuning
```javascript
// Timing configurations
const DEBOUNCE_DELAY = 300;           // Debounce delay for duplicate checks
const TAB_REMOVAL_DELAY = 50;         // Focus delay after tab closure
const MEMORY_CHECK_INTERVAL = 30000;  // Memory monitoring frequency
const STARTUP_CLEANUP_DELAY = 5000;   // Startup cleanup delay
```

## 🔧 Technical Architecture

### Core Components

**Enhanced TabsInfo Class**
- Tracks tab lifecycle with creation timestamps and navigation counts
- Monitors navigation states to prevent premature duplicate detection
- Maintains ignored tabs set and document ID tracking
- Handles tab attachment/detachment events

**Advanced URL Processing**
- Native URLPattern API integration with fallback support
- Comprehensive scheme handling (http/https/file/chrome)
- URL normalization for consistent comparison
- Match pattern caching for performance

**Memory-Aware Processing**
- System Memory API integration for resource monitoring
- Automatic activity reduction during low memory conditions
- Memory check intervals with configurable thresholds
- Service worker suspend/resume handling

**Intelligent Event Handling**
- Filtered WebNavigation events for better performance
- Enhanced tab creation and update processing
- Document ID tracking for precise navigation monitoring
- History API and fragment update support

### Event Processing Pipeline

1. **Tab Creation**: Immediate tracking with metadata initialization
2. **Navigation Start**: Mark navigation state, prevent duplicate checks
3. **Navigation Commit**: Initial duplicate detection after URL commitment
4. **Navigation Complete**: Final duplicate check after full page load
5. **Tab Removal**: Cleanup tracking data and ignored tab sets

### Performance Optimizations

- **URL Filters**: WebNavigation events use URL scheme filters
- **Debounced Operations**: Prevents excessive API calls during rapid changes
- **Sequential Processing**: Early exit when duplicates are found
- **Parallel Bulk Operations**: Efficient processing for manual cleanup
- **Memory Monitoring**: Automatic throttling based on system resources

### File Structure
```
DeDupe2Activate/
├── manifest.json         # Extension configuration
├── background.js         # Enhanced service worker with all logic
├── images/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## 🛠️ API Integration

### Chrome APIs Used
- **chrome.tabs**: Tab management and querying
- **chrome.webNavigation**: Enhanced navigation tracking with filters
- **chrome.windows**: Window focus management
- **chrome.action**: Extension toolbar interaction
- **chrome.runtime**: Lifecycle and messaging
- **chrome.system.memory**: System resource monitoring (optional)

### Event Listeners with Filters
```javascript
// Performance-optimized event filtering
chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate, {
    url: [
        { schemes: ['http', 'https'] },
        { schemes: ['file'] },
        { urlPrefix: 'chrome://' }
    ]
});
```

### Error Handling Strategy
- Graceful degradation when APIs are unavailable
- Comprehensive promise error handling
- Invalid tab ID protection
- Service worker lifecycle management
- Memory API fallback for unsupported systems

## 🔍 Development Features

### Enhanced Debugging
- Detailed console logging with categorized messages
- Navigation state tracking for troubleshooting
- Memory usage reporting and monitoring
- Performance timing for optimization analysis

### Testing Capabilities
- Modular function exports for unit testing
- Memory simulation for low-resource testing
- Navigation state mocking for edge cases
- Bulk operation performance testing

### Message API
```javascript
// Extension messaging for external integration
chrome.runtime.sendMessage({
    action: "closeDuplicateTabs",
    data: { windowId: null }
}, response => {
    console.log("Closed tabs:", response.closedCount);
});
```

## Contributing

Found a bug or want to add a feature?
1. Fork the repo
2. Make your changes
3. Test thoroughly (especially with memory constraints and many tabs)
4. Submit a pull request

When reporting issues, include:
- Your Chrome version and system specs
- Number of open tabs when issue occurred
- System memory status during the issue
- Steps to reproduce the problem
- Browser console errors (if any)
- Expected vs actual behavior

### Development Guidelines
- Maintain memory-aware processing patterns
- Use filtered event listeners for performance
- Include comprehensive error handling
- Test with various URL schemes and patterns
- Verify service worker lifecycle compatibility

## Performance Considerations

### Memory Management
- Automatic throttling when system memory < 10% available
- Configurable memory check intervals
- Service worker suspend/resume handling
- Cache size limits with LRU eviction

### Event Optimization
- URL scheme filters on WebNavigation events
- Debounced duplicate checking
- Early exit strategies for single-tab operations
- Parallel processing for bulk operations

### Resource Usage
- Minimal background processing
- Efficient tab tracking data structures
- Automatic cleanup of obsolete tracking data
- Memory monitoring with system resource awareness

## License

MIT License - do whatever you want with this code.

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/webber3242">Webber</a></p>
  <p>
    <a href="https://github.com/webber3242/DeDupe2Activate">⭐ Star this repo</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">🐛 Report Bug</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">💡 Request Feature</a>
  </p>
</div>
