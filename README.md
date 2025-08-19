# DeDupe2Activate

<div align="center">
  <img src="images/icon128.png" alt="DeDupe2Activate Logo" width="128" height="128">
  
  **Intelligent Chrome extension that automatically detects and closes duplicate tabs**
  
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?style=flat-square&logo=google-chrome)](https://github.com/webber3242/DeDupe2Activate)
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=flat-square)](https://github.com/webber3242/DeDupe2Activate)
  [![JavaScript ES2022](https://img.shields.io/badge/JavaScript-ES2022-yellow?style=flat-square&logo=javascript)](https://github.com/webber3242/DeDupe2Activate)
  [![MIT License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)
</div>

## What does it do? 
Closes duplicate tabs automatically based on #urlhandling and activates the remaining tab based on #tabhandling.

### URLHandling 🔍 How It Handles URLs 
Different paths → Not duplicate
E.g Not Duplicates: https://google.com/search | https://google.com/maps

Different search queries → Not duplicate
E.g Not Duplicates: https://google.com/search?q=cat | https://google.com/search?q=dog

Different hash anchors → Not duplicate
E.g Not Duplicates: https://google.com/docs#page1 | https://google.com/docs#page2

Ignores case, ignores www, ignores trailing slash
E.g Duplicates: https://google.com | https://www.googLe.com/
 
### TabHandling  Auto Activation Logic
Activates remaining oldest created tab

### Additional Info
Need a manual scan? Click browser icon
Want configuration? You won't find any here. 

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

#### File Structure

```
DeDupe2Activate/
├── manifest.json          # Extension configuration
├── background.js          # Main service worker logic
├── images/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├─  _locales
     ├── en
       ├──messages.json
└── README.md             # Documentation
```

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
