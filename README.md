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

## 🚀 Features

### Intelligent Duplicate Detection
- **Advanced URL Pattern Matching**: Uses modern URLPattern API with fallback support for comprehensive duplicate detection
- **Subdomain Awareness**: Treats www.example.com and example.com as duplicates
- **Path Normalization**: Handles trailing slashes and path variations intelligently
- **Sequential Pattern Checking**: Optimized algorithm with early exit when duplicates are found
- **Cached Pattern Storage**: Efficient LRU cache system with automatic memory management

### Smart Tab Selection Algorithm
The extension uses a sophisticated priority system to determine which tab to keep:

- 🎯 **Active Tab Priority**: Currently active tabs are preferred
- 🔊 **Audio Playback**: Tabs playing audio are prioritized
- 📌 **Pinned Status**: Pinned tabs take precedence
- ⏰ **Load Completion**: More recently completed/created tabs are favored
- 🔢 **Tab Age**: Older tabs (lower tab ID) win final ties

### Performance Optimized Architecture
- **Debounced Processing**: Prevents excessive duplicate checks during rapid navigation (300ms default)
- **Two-Tier Operation**: Optimized single-tab detection for real-time events + bulk operations for startup
- **Memory Management**: Automatic cleanup with configurable intervals and cache size limits
- **Selective Processing**: Ignores localhost, internal pages, and browser URLs
- **Pattern Caching**: LRU cache with configurable size limits (1000 patterns max)

### Advanced Memory Management
- **Enhanced Tab Tracker**: Tracks processing states, completion times, and creation timestamps
- **Automatic Cleanup**: Removes stale data every 60 seconds
- **Cache Size Control**: Maintains optimal cache size with LRU eviction
- **Processing State Tracking**: Prevents duplicate processing of the same tab

## 📦 Installation

### From Chrome Web Store
1. Visit the Chrome Web Store page (link pending publication)
2. Click "Add to Chrome"
3. Confirm installation in the popup dialog

### Manual Installation (Developer Mode)
1. Download or clone this repository:
   ```bash
   git clone https://github.com/webber3242/DeDupe2Activate.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension will be installed and ready to use

### Prerequisites
- Google Chrome version 88+ (for Manifest V3 support)
- Modern browser with URLPattern API support (recommended, fallback available)

## 🎯 Usage

### Automatic Operation
Once installed, DeDupe2Activate works automatically in the background:

- **Real-time Detection**: Duplicate tabs are closed immediately upon creation or navigation
- **Early Navigation Interception**: Catches duplicates before page load completes
- **Background Processing**: Continuously manages duplicates without user intervention
- **Startup Cleanup**: Automatically runs bulk cleanup 2-3 seconds after browser/extension start

### Dual Operation Modes

**Real-time Mode (Single Tab Events)**
- Uses optimized single-tab duplicate detection
- Processes `tabs.onCreated`, `webNavigation.onBeforeNavigate`, and `webNavigation.onCompleted`
- Sequential pattern matching with early exit for maximum efficiency

**Bulk Mode (Manual Cleanup)**
- Uses parallel processing for all tabs
- Groups tabs by normalized URL keys
- Triggered on startup and extension installation

### What Counts as a Duplicate?
The extension considers URLs duplicates when they have:
- Same normalized hostname (with or without www.)
- Same normalized path (ignoring trailing slashes)
- Protocol-agnostic matching (http/https)

Examples of detected duplicates:
- ✅ `https://example.com/page` and `https://www.example.com/page/`
- ✅ `http://example.com/path` and `https://example.com/path`
- ✅ `https://site.com/` and `https://site.com`

## ⚙️ Configuration

### Customizable Constants
You can modify these values in `background.js`:

```javascript
const CONFIG = {
    DEBOUNCE_DELAY: 300,              // Milliseconds between duplicate checks
    TAB_REMOVAL_DELAY: 50,            // Delay before activating kept tab
    CLEANUP_INTERVAL: 60000,          // Memory cleanup frequency (1 minute)
    IGNORED_DOMAINS: new Set(['localhost', '127.0.0.1', 'chrome-extension']),
    INCLUDE_QUERY_PARAMS: false,      // Whether to consider query params
    MAX_CACHE_SIZE: 1000,             // Maximum cached URL patterns
    CLEANUP_RETENTION_SIZE: 250,      // Patterns to keep after cleanup
    COMPLETION_TIMEOUT: 300000        // 5 minutes - data retention timeout
};
```

### Domain Filtering
The extension automatically ignores certain domains and can be customized:

```javascript
IGNORED_DOMAINS: new Set([
    'localhost', 
    '127.0.0.1', 
    'chrome-extension',
    'your-custom-domain.com'  // Add your domains here
])
```

## 🏗️ Technical Architecture

### Core Components

**URLPatternHandler**
- Handles URL parsing and pattern creation
- Provides URLPattern API support with fallback
- Manages Chrome query patterns for efficient tab searching
- Implements normalized URL key generation for grouping

**EnhancedTabTracker** 
- Tracks tab processing states and completion times
- Manages pattern cache with LRU eviction
- Handles memory cleanup and data retention
- Prevents duplicate processing with state tracking

**DuplicateTabManager**
- Orchestrates duplicate detection and removal
- Implements two-tier operation (single-tab + bulk)
- Manages event listeners and error handling
- Provides smart tab selection algorithm

**Utils Module**
- Debounce functionality with per-tab key tracking
- Safe Chrome API wrappers with error handling
- URL validation and filtering utilities
- Async error handling helpers

### Event Processing Pipeline

**Single Tab Events (Real-time)**
1. `tabs.onCreated` → Mark creation time → Process if complete
2. `webNavigation.onBeforeNavigate` → Early duplicate detection
3. `webNavigation.onCompleted` → Mark completion → Final duplicate check

**Bulk Operations**
1. `runtime.onStartup` → Bulk cleanup after 2s delay
2. `runtime.onInstalled` → Bulk cleanup after 3s delay

### Browser API Usage
- **Tabs API**: Query patterns, remove duplicates, update active states
- **WebNavigation API**: Monitor navigation events for early detection  
- **Runtime API**: Handle extension lifecycle and startup events

## 🛠️ Development

### File Structure
```
DeDupe2Activate/
├── manifest.json          # Extension configuration
├── background.js          # Main service worker logic
├── images/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This documentation
```

### Key Functions

**Single-Tab Operations**
- `findDuplicatesForSingleTab()`: Optimized duplicate detection with pattern caching
- `_handleSingleTabDuplicates()`: Real-time duplicate processing with debouncing

**Bulk Operations**  
- `findAllDuplicates()`: Parallel processing of all tabs with URL grouping
- `closeAllDuplicates()`: Bulk duplicate removal with parallel execution

**Selection Algorithm**
- `selectBestTab()`: Multi-criteria tab selection with priority system
- `closeDuplicate()`: Safe tab removal with active state management

### Performance Optimizations
- **Sequential Pattern Checking**: Early exit when duplicates found
- **Pattern Caching**: LRU cache prevents repeated URL parsing
- **Debounced Processing**: Reduces API calls during rapid navigation
- **Memory Cleanup**: Automatic cleanup prevents memory leaks
- **Parallel Execution**: Bulk operations use Promise.allSettled

### Testing Scenarios
Test the extension by:
1. Opening multiple tabs with the same URL
2. Navigating existing tabs to duplicate URLs  
3. Testing www vs non-www variations
4. Checking http vs https protocol handling
5. Restarting Chrome to test startup cleanup
6. Testing with pinned, active, and audio-playing tabs

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines
- Follow existing code style and ES2022+ features
- Add JSDoc comments for complex functions
- Test with multiple browser versions and scenarios
- Ensure memory efficiency and proper cleanup
- Update configuration constants as needed
- Test both single-tab and bulk operation modes

### Code Quality Standards
- Use modern async/await patterns
- Implement proper error handling with safe wrappers
- Follow the established class-based architecture
- Maintain separation between single-tab and bulk operations
- Use consistent naming conventions

### Reporting Issues
Please use the GitHub Issues page to report bugs or request features.

Include:
- Chrome version
- Extension version  
- URLPattern API availability (check console logs)
- Steps to reproduce
- Expected vs actual behavior
- Console error messages (if any)

## 📊 Performance Metrics

The extension is designed for optimal performance:
- **Memory Usage**: Auto-cleanup keeps memory footprint minimal
- **CPU Impact**: Debounced processing reduces background activity
- **Cache Efficiency**: LRU cache with 1000 pattern capacity
- **Response Time**: Real-time duplicate detection in <300ms
- **Startup Time**: 2-3 second delay for bulk cleanup to avoid browser conflicts

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support
- **GitHub Issues**: Report bugs or request features
- **Email**: Contact the author for direct support  
- **Wiki**: Check the project wiki for additional documentation

## 🙏 Acknowledgments
- Thanks to the Chrome Extensions documentation team
- Inspired by various tab management tools in the ecosystem
- Built with modern web APIs and performance optimization techniques
- Special thanks to the URLPattern API specification contributors

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/webber3242">Webber</a></p>
  <p>
    <a href="https://github.com/webber3242/DeDupe2Activate">⭐ Star this repo</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">🐛 Report Bug</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">💡 Request Feature</a>
  </p>
</div>
