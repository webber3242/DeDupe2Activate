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

DeDupe2Activate intelligently manages your browser tabs by automatically detecting and closing duplicates while preserving your browsing context. The extension works silently in the background, keeping your browser organized without interrupting your workflow.

## How It Works

### URL Normalization Rules
- Paths, query strings, and anchors are considered significant
- Automatically upgrades `http://` to `https://`
- Ignores `www.` prefixes, letter case differences, and trailing slashes
- Normalizes URLs to prevent false duplicates

### Duplicate Tab Priority System
When duplicates are found, the extension keeps tabs based on this priority order:

1. **Active/Focused Tabs** – Currently active tabs are always preserved
2. **Audible Tabs** – Tabs playing audio take priority
3. **Unsaved Content** – Tabs with form data or unsaved changes
4. **Oldest Tab** – The first opened duplicate is kept
5. **Fallback** – Lower tab ID if all else is equal

**Key Features:**
- Detects duplicates across all Chrome windows
- No page reloads when focusing preserved tabs
- Handles HTTP/HTTPS protocol differences intelligently
- Pinned tabs are treated with normal priority rules

## Installation

### Option 1: Chrome Web Store
*Coming soon - publication in progress*

### Option 2: Manual Installation
1. Download or clone this repository:
   ```bash
   git clone https://github.com/webber3242/DeDupe2Activate.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the downloaded extension folder

## File Structure

```
DeDupe2Activate/
├── manifest.json          # Extension configuration
├── background.js          # Main service worker logic
├── images/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # Documentation
```

## Technical Details

### Core Components
- **TabsInfo Class**: Manages tab state and tracking data with efficient memory usage
- **Memory Management**: Real-time system monitoring with automatic throttling to prevent performance issues
- **URL Pattern Handler**: Advanced normalization using Chrome's native match patterns
- **Event Processing**: Integrated with WebNavigation API for precise duplicate detection

### Smart Closure Algorithm
The extension uses an intelligent algorithm to determine which duplicates to close:

- Analyzes tab priority using focus state, audio status, and creation time
- Closes less relevant duplicates while preserving user context
- Handles multiple Chrome windows seamlessly
- Optimizes browser performance through efficient background processing

### Manual Controls
- **Extension Icon**: Click the extension icon to manually trigger a cleanup of all current duplicates
- **Startup Cleanup**: Automatically runs 5 seconds after Chrome starts to clean existing duplicates
- **Install Cleanup**: Runs 3.5 seconds after extension installation or updates

## Configuration

### Adding Ignored Domains
To exclude specific domains from duplicate detection, modify the `shouldIgnoreDomain` function in `background.js`:

```javascript
const shouldIgnoreDomain = (url) => {
    const ignoredDomains = [
        'localhost',
        '127.0.0.1',
        'chrome-extension',
        'your-domain.com',       // Add your custom domains here
        'internal-tool.local',
        'development.example.com'
    ];
    
    try {
        const hostname = new URL(url).hostname;
        return ignoredDomains.some(domain => hostname.includes(domain));
    } catch (error) {
        return true; // Ignore malformed URLs
    }
};
```

## Debugging & Troubleshooting

### Debug Mode
1. Navigate to `chrome://extensions/`
2. Find DeDupe2Activate and click "Service worker"
3. Monitor the console for real-time event processing and error logs

### Common Issues
- **Extension not working**: Ensure Developer mode is enabled and the extension is loaded correctly
- **False duplicates**: Check if specific domains need to be added to the ignore list
- **Performance issues**: The extension includes automatic throttling, but very large numbers of tabs may require manual cleanup

## Contributing

### Bug Reports
When reporting bugs, please include:
- Current number of open tabs
- Steps to reproduce the issue
- Expected vs actual behavior
- Console logs (if any errors are present)
- Chrome version and operating system

### Feature Requests
We welcome feature requests and suggestions for improving the extension's functionality.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made by <a href="https://github.com/webber3242">Webber</a></p>
  <p>
    <a href="https://github.com/webber3242/DeDupe2Activate">⭐ Star</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">🐛 Report Bug</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">💡 Request Feature</a>
  </p>
</div>
