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

🚀 Features
Intelligent Duplicate Detection

Advanced URL Pattern Matching: Uses modern URLPattern API with fallback support for comprehensive duplicate detection
Subdomain Awareness: Treats www.example.com and example.com as duplicates
Query Parameter Handling: Configurable inclusion/exclusion of URL parameters
Path Normalization: Handles trailing slashes and path variations intelligently

Smart Tab Selection Algorithm
The extension uses a sophisticated priority system to determine which tab to keep:

🎯 Active Tab Priority: Currently active tabs are preferred
🔊 Audio Playback: Tabs playing audio are prioritized
📌 Pinned Status: Pinned tabs take precedence
⏰ Load Completion: More recently loaded tabs are favored
🔢 Tab Age: Older tabs win ties (lower tab ID)

Performance Optimized

Debounced Processing: Prevents excessive duplicate checks during rapid navigation
Memory Management: Automatic cleanup of cached data and tracking information
Selective Processing: Ignores localhost, internal pages, and browser URLs
Pattern Caching: Efficient URL pattern storage with size limits

User Experience

Real-time Processing: Duplicates are closed as soon as they're detected
Keyboard Shortcut: Alt+Shift+D to manually close all duplicates
Startup Cleanup: Automatically removes duplicates when browser starts
Incognito Support: Works in private browsing mode


📦 Installation
From Chrome Web Store

Visit the Chrome Web Store page (link pending publication)
Click "Add to Chrome"
Confirm installation in the popup dialog

Manual Installation (Developer Mode)

Download or clone this repository:
bashgit clone https://github.com/webber3242/DeDupe2Activate.git

Open Chrome and navigate to chrome://extensions/
Enable "Developer mode" in the top right corner
Click "Load unpacked" and select the extension folder
The extension will be installed and ready to use

Prerequisites

Google Chrome version 88+ (for Manifest V3 support)
Modern browser with URLPattern API support (recommended)


🎯 Usage
Automatic Operation
Once installed, DeDupe2Activate works automatically in the background:

New Tab Detection: When you open a duplicate URL, the extension immediately closes it
Navigation Tracking: Monitors when existing tabs navigate to duplicate URLs
Background Processing: Continuously manages duplicates without user intervention

Manual Control

Keyboard Shortcut: Press Alt+Shift+D to instantly close all current duplicates
Startup Cleanup: Extension automatically runs a cleanup when Chrome starts

What Counts as a Duplicate?
The extension considers URLs duplicates when they have:

Same domain (with or without www.)
Same path (ignoring trailing slashes)
Optional: Same query parameters (configurable)

Examples of detected duplicates:
✅ https://example.com/page
✅ https://www.example.com/page/
✅ http://example.com/page?param=value

⚙️ Configuration
Customizable Constants
You can modify these values in background.js:
javascriptconst DEBOUNCE_DELAY = 300;          // Milliseconds to wait between duplicate checks
const TAB_REMOVAL_DELAY = 50;        // Delay before activating kept tab
const CLEANUP_INTERVAL = 60000;      // Memory cleanup frequency (1 minute)
const INCLUDE_QUERY_PARAMS = false;  // Whether to consider query params in duplicates
Ignored Domains
The extension automatically ignores certain domains:

localhost and 127.0.0.1
Chrome extension pages
Browser internal pages (chrome://, about:)

To add more ignored domains, modify the IGNORED_DOMAINS set:
javascriptconst IGNORED_DOMAINS = new Set(['localhost', '127.0.0.1', 'chrome-extension', 'your-domain.com']);

🏗️ Technical Architecture
Core Components
URLPatternHandler

Handles URL parsing and pattern matching
Provides fallback support for older browsers
Manages Chrome query patterns for tab searching

EnhancedTabTracker

Tracks tab states and processing status
Manages completion times and creation timestamps
Handles pattern caching and memory cleanup

Event Listeners

tabs.onCreated: Monitors new tab creation
webNavigation.onBeforeNavigate: Catches navigation starts
webNavigation.onCompleted: Handles completed page loads
commands.onCommand: Processes keyboard shortcuts

Browser API Usage

Tabs API: Query, remove, and update tab properties
WebNavigation API: Monitor page navigation events
Commands API: Handle keyboard shortcuts
Runtime API: Manage extension lifecycle events


🛠️ Development
File Structure
DeDupe2Activate/
├── manifest.json          # Extension configuration
├── background.js          # Main service worker logic  
├── images/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This documentation
Key Functions

findDuplicates(): Identifies duplicate tabs for a given URL
selectBestTab(): Determines which tab to keep using priority algorithm
handleDuplicates(): Orchestrates the duplicate detection and removal process
closeAllDuplicates(): Performs bulk duplicate cleanup

Testing
Test the extension by:

Opening multiple tabs with the same URL
Navigating existing tabs to duplicate URLs
Using the keyboard shortcut Alt+Shift+D
Restarting Chrome to test startup cleanup


🤝 Contributing
Getting Started

Fork the repository
Create a feature branch: git checkout -b feature/amazing-feature
Make your changes and test thoroughly
Commit your changes: git commit -m 'Add amazing feature'
Push to the branch: git push origin feature/amazing-feature
Open a Pull Request

Development Guidelines

Follow existing code style and conventions
Add comments for complex logic
Test with multiple browser versions
Ensure backward compatibility
Update documentation for new features

Reporting Issues
Please use the GitHub Issues page to report bugs or request features.
Include:

Chrome version
Extension version
Steps to reproduce
Expected vs actual behavior


📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

📞 Support

GitHub Issues: Report bugs or request features
Email: Contact the author for direct support
Wiki: Check the project wiki for additional documentation


🙏 Acknowledgments

Thanks to the Chrome Extensions documentation team
Inspired by various tab management tools in the ecosystem
Built with modern web APIs and best practices


<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/webber3242">Webber</a></p>
  <p>
    <a href="https://github.com/webber3242/DeDupe2Activate">⭐ Star this repo</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">🐛 Report Bug</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">💡 Request Feature</a>
  </p>
</div>
