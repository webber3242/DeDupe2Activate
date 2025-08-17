# DeDupe2Activate

<div align="center">
  <img src="images/icon128.png" alt="DeDupe2Activate Logo" width="128" height="128">
  
  **Intelligent Chrome extension that automatically detects and closes duplicate tabs**
  
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?style=flat-square&logo=google-chrome)](https://github.com/webber3242/DeDupe2Activate)
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=flat-square)](https://github.com/webber3242/DeDupe2Activate)
  [![JavaScript ES2022](https://img.shields.io/badge/JavaScript-ES2022-yellow?style=flat-square&logo=javascript)](https://github.com/webber3242/DeDupe2Activate)
  [![MIT License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)
</div>

## Features

### Smart Duplicate Detection
- **URL Normalization**: Treats `example.com`, `www.example.com`, and `https://example.com/` as identical
- **Protocol Support**: Works with HTTP/HTTPS, file://, and chrome:// URLs
- **Fragment Handling**: Considers `page.html#section1` and `page.html#section2` as duplicates
- **Case Insensitive**: Handles URL variations automatically

### Intelligent Tab Management
When duplicates are found, keeps the best tab based on:
1. **Active tab** (currently focused)
2. **Active window** (foreground window)
3. **Most recently loaded** (completed loading)
4. **Navigation state** (protects loading tabs)

### Performance Features
- **Memory Monitoring**: Reduces operations when system memory is low
- **Debounced Processing**: 300ms delay prevents excessive checks
- **Event Filtering**: Only processes relevant navigation events
- **Automatic Cleanup**: Removes data for closed tabs

## Installation

### Chrome Web Store
Coming soon - publication in progress.

### Manual Installation
1. Download or clone this repository:
   ```bash
   git clone https://github.com/webber3242/DeDupe2Activate.git
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the extension folder

**Requirements:** Chrome 88+ with Manifest V3 support

## How It Works

### Automatic Detection
- Monitors all tab creation and navigation events
- Uses Chrome's WebNavigation API for real-time processing
- Applies smart URL normalization to catch all duplicate formats
- Protects tabs that are still loading

### Smart Closure
- Analyzes tab priority using focus state and load times
- Closes less relevant duplicates while preserving context
- Handles multiple windows intelligently
- Maintains browser performance with optimized processing

### Manual Controls
- **Extension Icon**: Click to manually clean up all duplicates
- **Startup Cleanup**: Automatically runs 5 seconds after Chrome starts
- **Install Cleanup**: Runs 3.5 seconds after installation/update

## File Structure

```
DeDupe2Activate/
├── manifest.json     # Extension configuration
├── background.js     # Main service worker logic
├── images/          # Extension icons
│   ├── icon16.png   # Toolbar icon
│   ├── icon48.png   # Extension management
│   └── icon128.png  # Chrome Web Store
└── README.md        # Documentation
```

## Configuration

Key settings in `background.js`:

```javascript
// Performance Settings
DEBOUNCE_DELAY: 300              // Delay between duplicate checks (ms)
TAB_REMOVAL_DELAY: 50            // Delay before focusing remaining tab (ms)
MEMORY_CHECK_INTERVAL: 30000     // Memory monitoring frequency (ms)
LOW_MEMORY_THRESHOLD: 0.9        // Memory usage threshold

// Startup Behavior
INITIAL_CLEANUP_DELAY: 3500      // Delay after install/update (ms)
STARTUP_CLEANUP_DELAY: 5000      // Delay after browser startup (ms)
```

### Adding Ignored Domains

Modify the `shouldIgnoreDomain` function in `background.js`:

```javascript
const shouldIgnoreDomain = (url) => {
    const ignoredDomains = [
        'localhost',
        '127.0.0.1',
        'chrome-extension',
        'your-domain.com',       // Add custom domains here
        'internal-tool.local'
    ];
    
    try {
        const hostname = new URL(url).hostname;
        return ignoredDomains.some(domain => hostname.includes(domain));
    } catch (error) {
        return true;
    }
};
```

## Technical Details

### Core Components
- **TabsInfo Class**: Manages tab state and tracking data
- **Memory Management**: Real-time system monitoring with automatic throttling
- **URL Pattern Handler**: Advanced normalization using Chrome's match patterns
- **Event Processing**: WebNavigation API integration with filtering

### Event Flow
```
Tab Created/Navigation → URL Filtering → Debounced Processing → Memory Check → 
Duplicate Detection → Tab Priority Analysis → Close Duplicate → Focus Remaining Tab
```

### API Messages

```javascript
// Close all duplicates
chrome.runtime.sendMessage({
    action: "closeDuplicateTabs",
    data: { windowId: null }
});

// Get duplicate information
chrome.runtime.sendMessage({
    action: "getDuplicateTabs",
    data: { windowId: 123 }
});

// Get memory status
chrome.runtime.sendMessage({
    action: "getMemoryInfo"
});
```

## Troubleshooting

### High Memory Usage
- Extension automatically throttles when memory is low
- Check service worker console for memory warnings
- Restart Chrome to reset service worker state

### Duplicates Not Detected
- Verify URLs are identical after normalization
- Check if domains are in the ignored list
- Monitor WebNavigation events in console

### Debugging
1. Go to `chrome://extensions/`
2. Click "Service worker" under the extension
3. Monitor console for event processing and errors

## Development

### Setup
1. Fork the repository
2. Enable Developer Mode in Chrome Extensions
3. Load the unpacked extension
4. Open service worker console for debugging

### Testing
Test with various scenarios:
- 100+ tabs performance
- Memory usage during heavy operation
- Service worker suspend/resume cycles
- Cross-window duplicate handling

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes with comprehensive testing
4. Submit pull request with detailed description

### Bug Reports
Include:
- Chrome version and OS
- Number of open tabs
- Steps to reproduce
- Expected vs actual behavior
- Console logs (if any errors)

## License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Made by <a href="https://github.com/webber3242">Webber</a></p>
  <p>
    <a href="https://github.com/webber3242/DeDupe2Activate">⭐ Star</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">🐛 Report Bug</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">💡 Request Feature</a>
  </p>
</div>
