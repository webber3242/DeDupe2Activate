<div align="center">
  <img src="images/icon128.png" alt="DeDupe2Activate Logo" width="128" height="128">
  <h3>Enterprise-Grade Chrome Extension for Intelligent Duplicate Tab Management</h3>
  <p>
    <strong>DeDupe2Activate</strong> automatically detects and closes duplicate tabs using advanced memory monitoring, smart tab retention logic, and performance-optimized duplicate detection algorithms.
  </p>
  <p>
    <a href="#features"><strong>Features</strong></a> •
    <a href="#installation"><strong>Installation</strong></a> •
    <a href="#how-it-works"><strong>How It Works</strong></a> •
    <a href="#configuration"><strong>Configuration</strong></a> •
    <a href="#technical-architecture"><strong>Technical Architecture</strong></a> •
    <a href="#contributing"><strong>Contributing</strong></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Chrome-Extension-blue?style=flat-square&logo=google-chrome" alt="Chrome Extension">
    <img src="https://img.shields.io/badge/Manifest-V3-green?style=flat-square" alt="Manifest V3">
    <img src="https://img.shields.io/badge/JavaScript-ES2022-yellow?style=flat-square&logo=javascript" alt="JavaScript ES2022">
    <img src="https://img.shields.io/badge/Memory-Optimized-purple?style=flat-square" alt="Memory Optimized">
    <img src="https://img.shields.io/badge/License-MIT-red?style=flat-square" alt="MIT License">
  </p>
</div>
Why This Extension?
DeDupe2Activate goes beyond simple URL comparison. It uses enterprise-grade algorithms to intelligently manage duplicate tabs while monitoring system resources to prevent browser slowdowns. Whether you accidentally open the same page multiple times or work with hundreds of tabs, this extension keeps your browser clean and fast.
Features
🧠 Advanced Duplicate Detection

Smart URL Normalization: Recognizes example.com, www.example.com, https://example.com/, and http://example.com as identical
Protocol Agnostic Matching: Uses Chrome's match pattern system with wildcard schemes (*://)
Fragment & Query Handling: Treats page.html#section1 and page.html#section2 as the same page
File URL Support: Handles local file duplicates with file:// protocol
Chrome Internal Pages: Manages duplicates of chrome:// pages and extensions
Case-Insensitive Comparison: Handles URL case variations automatically

🎯 Intelligent Tab Retention Logic
When duplicates are found, keeps the most relevant tab based on priority:

🎯 Active Tab: Currently focused tab gets highest priority
🖥️ Window Focus: Tabs in the active window are preferred
⏰ Recently Loaded: Most recently completed page loads are retained
📍 Navigation State: Tabs currently navigating are protected from premature closure
🔒 System Priority: Considers tab lifecycle and browser focus state

⚡ Performance Optimizations

💾 Memory Monitoring: Automatically monitors system memory and reduces operations when memory is low (<10% available)
⚡ Debounced Processing: 300ms debounce prevents excessive duplicate checks during rapid navigation
🚀 Event Filtering: Uses Chrome's URL filters to only process relevant navigation events
📋 Sequential Checking: Early exit optimization stops checking once duplicates are found
🔄 Service Worker Lifecycle: Proper suspend/resume handling for Chrome's service worker model
🧹 Automatic Cleanup: Removes tracking data for closed tabs to prevent memory leaks

🌐 Comprehensive Event Handling

Navigation Tracking: Full WebNavigation API integration with filtered events
Real-time Detection: Instant duplicate closure as soon as pages load
SPA Support: Handles single-page application navigation via History API
Tab Lifecycle: Tracks tab creation, updates, attachment, and removal
Error Handling: Graceful handling of navigation errors and tab failures

📦 Installation
From Chrome Web Store:
Coming soon - link will be added once published.
Manual Installation:

Download this repo or clone it: git clone https://github.com/webber3242/DeDupe2Activate.git
Go to chrome://extensions/
Turn on "Developer mode" (top right)
Click "Load unpacked" and select the extension folder

System Requirements:

Chrome 88+ (Manifest V3 support required)
System Memory API support (optional, for memory monitoring)

How It Works
Real-time Duplicate Management
The extension operates continuously in the background using Chrome's service worker architecture:
Automatic Detection:

Monitors all tab creation and navigation events
Uses WebNavigation API with URL filters for optimal performance
Applies smart URL normalization to detect duplicates across different formats
Protects tabs that are currently loading from premature closure

Smart Closure:

Analyzes tab priority using focus state, window position, and load times
Closes the less relevant duplicate while preserving user context
Handles cross-window scenarios intelligently
Maintains browser responsiveness through debounced processing

Memory Protection:

Continuously monitors available system memory (when supported)
Automatically reduces aggressive duplicate checking when memory is low
Prevents browser slowdowns during high tab usage

Manual Operations

Extension Icon Click: Triggers immediate cleanup of all current duplicates
Startup Cleanup: Automatically scans and closes duplicates when Chrome starts (5-second delay)
Installation Cleanup: Runs initial cleanup after install/update (3.5-second delay)

File Structure
DeDupe2Activate/
├── manifest.json          # Extension configuration and permissions
├── background.js          # Main service worker with all logic
├── images/               # Extension icons
│   ├── icon16.png       # Toolbar icon
│   ├── icon48.png       # Extension management
│   └── icon128.png      # Chrome Web Store
└── README.md            # This documentation
⚙️ Configuration
The extension is highly configurable through the background.js file. Key settings include:
Performance Settings
javascript// Event processing timing
DEBOUNCE_DELAY: 300,              // Milliseconds between duplicate checks
TAB_REMOVAL_DELAY: 50,            // Delay before focusing remaining tab

// Memory management  
MEMORY_CHECK_INTERVAL: 30000,     // Memory monitoring frequency (30 seconds)
LOW_MEMORY_THRESHOLD: 0.9,        // Stop aggressive checking at 90% memory usage

// Startup behavior
INITIAL_CLEANUP_DELAY: 3500,      // Delay after install/update (3.5 seconds) 
STARTUP_CLEANUP_DELAY: 5000,      // Delay after browser startup (5 seconds)
URL Handling
javascript// Supported URL schemes
SUPPORTED_SCHEMES: ['http', 'https', 'file', 'chrome'],

// Domains to ignore (never process for duplicates)
IGNORED_DOMAINS: [
    'localhost',
    '127.0.0.1', 
    'chrome-extension',
    // Add custom domains here
]
Adding Custom Ignored Domains
javascript// In background.js, modify the URL filtering logic:
const shouldIgnoreDomain = (url) => {
    const ignoredDomains = [
        'localhost',
        '127.0.0.1',
        'chrome-extension',
        'internal-tool.company.com',    // Your custom domains
        'dev.local'
    ];
    
    try {
        const hostname = new URL(url).hostname;
        return ignoredDomains.some(domain => hostname.includes(domain));
    } catch (error) {
        return true; // Ignore malformed URLs
    }
};
Technical Architecture
Core Components
TabsInfo Class

Maintains state for all open tabs with creation times, URLs, and completion status
Tracks navigation states to prevent premature duplicate detection
Implements automatic cleanup of closed tab data
Provides fast tab lookup and duplicate detection support

Memory Management System

Real-time system memory monitoring using Chrome's System API
Automatic operation throttling when available memory drops below 10%
Service worker lifecycle management with proper suspend/resume handling
Memory leak prevention through automatic cleanup of tracking data

URL Pattern Handler

Advanced URL normalization using Chrome's match pattern system
Protocol-agnostic duplicate detection with wildcard scheme support
Fragment and query parameter normalization for accurate matching
File URL and Chrome internal page support

Enhanced Event Processing

WebNavigation API integration with URL filters for optimal performance
Debounced event handling to prevent excessive processing
Sequential duplicate checking with early exit optimization
Error handling and recovery for navigation failures

Event Flow
mermaidgraph TD
    A[Tab Created/Navigation] --> B{URL Filtering}
    B -->|Pass| C[Debounced Processing]
    B -->|Fail| D[Ignore]
    C --> E[Memory Check]
    E -->|Low Memory| F[Throttle]
    E -->|Normal| G[Duplicate Detection]
    G --> H{Duplicates Found?}
    H -->|Yes| I[Tab Priority Analysis]
    H -->|No| J[Continue Monitoring]
    I --> K[Close Duplicate]
    K --> L[Focus Remaining Tab]
Performance Optimizations
Event Filtering: Uses Chrome's native URL filters to process only relevant events:
javascriptchrome.webNavigation.onCompleted.addListener(handler, {
    url: [
        { schemes: ['http', 'https'] },
        { schemes: ['file'] },
        { urlPrefix: 'chrome://' }
    ]
});
Debounced Processing: Prevents excessive duplicate checks during rapid navigation:
javascriptconst debouncedHandler = debounce(duplicateHandler, 300);
Memory-Aware Operations: Automatically reduces processing when system memory is low:
javascriptconst canProceed = await updateMemoryInfo();
if (!canProceed && isAggressiveOperation) {
    console.warn("Reducing operations due to low memory");
    return;
}
API Reference
Message Handling
The extension supports several message types for programmatic interaction:
javascript// Close duplicate tabs
chrome.runtime.sendMessage({
    action: "closeDuplicateTabs",
    data: { windowId: null } // null = all windows
});

// Get duplicate information without closing
chrome.runtime.sendMessage({
    action: "getDuplicateTabs", 
    data: { windowId: 123 }
});

// Get memory information
chrome.runtime.sendMessage({
    action: "getMemoryInfo"
});
Key Functions
Core Duplicate Detection:

searchForDuplicateTabsToClose() - Real-time duplicate detection for single tabs
searchForDuplicateTabs() - Bulk duplicate detection for all tabs
closeDuplicateTabs() - Manual cleanup of all current duplicates

URL Processing:

getMatchPatternURL() - Creates Chrome match patterns from URLs
getMatchingURL() - Normalizes URLs for comparison

Tab Management:

getCloseInfo() - Determines which tab to keep vs close
focusTab() - Safely focuses remaining tab after duplicate closure

🛠️ Development
Event Debugging
Enable debug logging by checking the service worker console:

Go to chrome://extensions/
Click "Service worker" under your extension
Monitor console output for event processing

Testing Performance
The extension includes built-in performance monitoring:

Memory usage tracking
Event processing timing
Duplicate detection efficiency metrics
Service worker lifecycle logging

Common Issues
High Memory Usage: The extension automatically throttles operations when system memory is low. If you experience issues:

Check the service worker console for memory warnings
Reduce the number of open tabs
Restart Chrome to reset service worker state

Navigation Conflicts: If duplicates aren't being detected:

Ensure the URLs are actually identical after normalization
Check if domains are in the ignored list
Verify WebNavigation events are firing (check console)

Contributing
Found a bug or want to add a feature?

Fork the repository
Create a feature branch: git checkout -b feature/amazing-feature
Make your changes with comprehensive testing
Test thoroughly, especially:

Performance with 100+ tabs
Memory usage during heavy operation
Service worker suspend/resume cycles
Cross-window duplicate handling


Submit a pull request with detailed description

Reporting Issues
Include the following information:

Chrome version and operating system
Number of open tabs when issue occurred
Steps to reproduce the problem
Expected vs actual behavior
Service worker console logs (if any errors)
Memory usage at time of issue (if relevant)

Development Setup

Clone the repository
Enable Developer Mode in Chrome Extensions
Load the unpacked extension
Open the service worker console for debugging
Test with various tab scenarios and memory conditions

License
MIT License - feel free to modify and distribute this code.

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/webber3242">Webber</a></p>
  <p>
    <a href="https://github.com/webber3242/DeDupe2Activate">⭐ Star this repo</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">🐛 Report Bug</a> •
    <a href="https://github.com/webber3242/DeDupe2Activate/issues">💡 Request Feature</a>
  </p>
  <p><strong>Performance-optimized duplicate tab management for power users</strong></p>
</div>
