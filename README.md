# DeDupe2Activate

<div align="center">
  <img src="images/icon128.png" alt="DeDupe2Activate Logo" width="128" height="128">
  
  **Intelligent Chrome extension that automatically detects and closes duplicate tabs**
  
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?style=flat-square&logo=google-chrome)](https://github.com/webber3242/DeDupe2Activate)
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=flat-square)](https://github.com/webber3242/DeDupe2Activate)
  [![JavaScript ES2022](https://img.shields.io/badge/JavaScript-ES2022-yellow?style=flat-square&logo=javascript)](https://github.com/webber3242/DeDupe2Activate)
  [![MIT License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)

## Behavior & Tab Handling

### URL Normalization Rules
- Paths, query strings, and anchors are significant.
- Auto-upgrade `http://` → `https://`.
- Ignore `www.`, letter case, and trailing slashes.

### Duplicate Tab Priority
1. **Unsaved / Active Tabs** – preserve focused tabs.  
2. **Audible Tabs** – prioritize tabs playing audio.  
3. **Pinned Tabs** – treated as normal tabs.  
4. **Oldest Tab** – keep earliest created when duplicates exist.  
5. **Fallback** – lower tab ID if equal.  

- Detect duplicates across all Chrome windows.  
- No reload needed when focusing kept tabs.  
- HTTP/HTTPS differences normalized.  

## Installation
1. Chrome Web Store
Coming soon - publication in progress.

2. Manual Installation
     -Download or clone this repository:
       ```bash
       git clone https://github.com/webber3242/DeDupe2Activate.git
       ```
     - Open Chrome and go to `chrome://extensions/`
     - Enable "Developer mode" (toggle in top-right)
     - Click "Load unpacked" and select the extension folder


## File Structure

DeDupe2Activate/
├── manifest.json # Extension configuration
├── background.js # Main service worker logic
├── images/ # Extension icons
│ ├── icon16.png
│ ├── icon48.png
│ └── icon128.png
└── README.md # Documentation


## Technical Details

### Core Components
- **TabsInfo Class**: Manages tab state and tracking data
- **Memory Management**: Real-time system monitoring with automatic throttling
- **URL Pattern Handler**: Advanced normalization using Chrome's match patterns
- **Event Processing**: WebNavigation API integration with filtering

### Flow Flow



### Smart Closure
- Analyzes tab priority using focus state and load times
- Closes less relevant duplicates while preserving context
- Handles multiple windows intelligently
- Maintains browser performance with optimized processing

### Manual Controls
- **Extension Icon**: Click to manually clean up all duplicates
- **Startup Cleanup**: Automatically runs 5 seconds after Chrome starts
- **Install Cleanup**: Runs 3.5 seconds after installation/update

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


### Debugging
1. Go to `chrome://extensions/`
2. Click "Service worker" under the extension
3. Monitor console for event processing and errors


### Bug Reports
Include:
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
