<div align="center">
  <img src="images/icon128.png" alt="DeDupe2Activate Logo" width="128" height="128">
  <h3>Smart Chrome Extension for Automatic Duplicate Tab Management</h3>
  <p>
    <strong>DeDupe2Activate</strong> automatically detects and closes duplicate tabs while intelligently keeping the most relevant one active.
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

Ever opened the same webpage in multiple tabs by accident? Or clicked a bookmark only to realize you already had that page open? This extension fixes that annoyance by automatically closing duplicate tabs while being smart about which one to keep.

## Features

### Smart Duplicate Detection
- Recognizes when `example.com` and `www.example.com` are the same site
- Handles URLs with and without trailing slashes
- Works with both HTTP and HTTPS versions of the same page
- Ignores localhost and browser internal pages

### Intelligent Tab Selection
When duplicates are found, the extension keeps the "best" tab based on:
- 🎯 Active tab (the one you're currently viewing)
- 🔊 Playing audio (don't close that music!)
- 📌 Pinned tabs
- ⏰ Most recently loaded
- 🕒 Oldest tab (as a tiebreaker)

### Performance Features
- Processes duplicates instantly when you open them
- Catches duplicates before pages even finish loading  
- Cleans up existing duplicates when Chrome starts
- Uses smart caching to avoid slowing down your browser

## 📦 Installation

**From Chrome Web Store:**
Coming soon - link will be added once published.

**Manual Installation:**
1. Download this repo or clone it: `git clone https://github.com/webber3242/DeDupe2Activate.git`
2. Go to `chrome://extensions/`
3. Turn on "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder

Works with Chrome 88+ (needs Manifest V3 support).

## How It Works

Once installed, it runs automatically in the background. You can also manually trigger duplicate cleanup by clicking the extension icon in your toolbar.

**Real-time duplicate closing:**
- Open a duplicate tab → it closes immediately
- Navigate to a duplicate URL → closes the duplicate
- The extension figures out which tab to keep automatically

**Manual cleanup:**
- Click the DeDupe2Activate icon in your toolbar to scan and close all current duplicates

**Startup cleanup:**
- When Chrome starts, it automatically scans for any existing duplicates and cleans them up

## ⚙️ Configuration

You can tweak these settings by editing the `CONFIG` object in `background.js`:

```javascript
const CONFIG = {
    DEBOUNCE_DELAY: 300,              // How long to wait between checks (ms)
    TAB_REMOVAL_DELAY: 50,            // Delay before switching to kept tab
    CLEANUP_INTERVAL: 60000,          // Memory cleanup frequency
    IGNORED_DOMAINS: new Set([        // Domains to never process
        'localhost', 
        '127.0.0.1', 
        'chrome-extension'
    ]),
    MAX_CACHE_SIZE: 1000,             // Max cached URL patterns
    CLEANUP_RETENTION_SIZE: 250,      // How many patterns to keep after cleanup
    COMPLETION_TIMEOUT: 300000        // 5 minutes - how long to remember tabs
};
```

**Adding domains to ignore:**
```javascript
IGNORED_DOMAINS: new Set([
    'localhost', 
    '127.0.0.1', 
    'chrome-extension',
    'internal-site.company.com'  // Add your own here
])
```

## Technical Stuff

### Architecture
The extension has three main components:

**URLPatternHandler** - Figures out when URLs are duplicates
- Uses the modern URLPattern API when available
- Falls back to manual parsing for older browsers
- Normalizes URLs for comparison and caching

**EnhancedTabTracker** - Keeps track of what's happening with tabs
- Remembers which tabs are being processed
- Caches URL patterns to speed things up
- Cleans up old data automatically
- Tracks tab creation and completion times

**DuplicateTabManager** - The main controller
- Handles both real-time and bulk duplicate detection
- Manages all the Chrome extension events
- Decides which tabs to keep or close

### How Duplicate Detection Works

**For single tabs (real-time):**
1. Extension notices a new/changed tab
2. Uses cached patterns when possible for speed
3. Quickly checks if any existing tabs match using sequential pattern checking
4. Closes duplicates immediately, keeps the best one
5. Early exit optimization - stops checking once duplicates are found

**For bulk operations (manual/startup):**
1. Gets all open tabs
2. Groups them by normalized URL key
3. Uses parallel processing for efficiency
4. In each group, keeps the best tab and closes the rest

### Event Handling
- `tabs.onCreated` - New tab opened
- `webNavigation.onBeforeNavigate` - Tab is about to navigate (catches duplicates early)
- `webNavigation.onCompleted` - Page finished loading
- `tabs.onRemoved` - Tab closed (cleanup tracking data)
- `action.onClicked` - Extension icon clicked (manual cleanup)
- `runtime.onStartup` - Chrome started, clean up duplicates
- `runtime.onInstalled` - Extension installed/updated

## 🛠️ Development

### File Structure
```
DeDupe2Activate/
├── manifest.json     # Extension config
├── background.js     # All the logic
├── images/           # Icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md         # This file
```

### Key Functions
- `findDuplicatesForSingleTab()` - Fast duplicate check for one tab (optimized for real-time)
- `findAllDuplicates()` - Bulk duplicate detection for all tabs (optimized for efficiency)
- `selectBestTab()` - Decides which tab to keep based on priority rules
- `closeDuplicate()` - Safely removes a duplicate tab
- `closeAllDuplicates()` - Manual cleanup of all current duplicates

### Performance Optimizations
- **Pattern Caching**: URL patterns are cached with LRU eviction
- **Sequential Checking**: For single tabs, stops checking once duplicates are found
- **Parallel Processing**: Bulk operations process multiple tabs simultaneously  
- **Debounced Processing**: Prevents excessive duplicate checks
- **Memory Management**: Automatic cleanup of old tracking data

### Testing
Try these scenarios:
1. Open multiple tabs to the same URL
2. Navigate existing tabs to URLs that are already open
3. Test with www vs non-www versions
4. Try http vs https
5. Test with pinned tabs, active tabs, tabs playing audio
6. Click the extension icon to test manual cleanup
7. Restart Chrome to test startup cleanup
8. Test with many tabs to verify performance

## Contributing

Found a bug or want to add a feature?
1. Fork the repo
2. Make your changes
3. Test thoroughly (especially performance with many tabs)
4. Submit a pull request

When reporting issues, include:
- Your Chrome version
- Number of open tabs when issue occurred
- Steps to reproduce the problem
- What you expected vs what happened
- Browser console errors (if any)

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
