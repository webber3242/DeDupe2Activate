![Demo Animation](https://github.com/webber3242/DeDupe2Activate/raw/77631aba3ba40cb50e309ae7adbd74d4ebca173f/images/Animation.gif)
# DeDupe2Activate

<div align="center">
  <img src="images/icon128.png" alt="DeDupe2Activate Logo" width="128" height="128">
  
  **Chrome browser extension that automatically closes duplicate tabs & automatically focuses remaining tab**
  
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?style=flat-square&logo=google-chrome)](https://github.com/webber3242/DeDupe2Activate)
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=flat-square)](https://github.com/webber3242/DeDupe2Activate)
  [![JavaScript ES2022](https://img.shields.io/badge/JavaScript-ES2022-yellow?style=flat-square&logo=javascript)](https://github.com/webber3242/DeDupe2Activate)
  [![MIT License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)
</div>


### URLHandling 🔍 How It Handles URLs 
1. Different paths → Not duplicate
      E.g Not Duplicates: https://google.com/search | https://google.com/maps

2. Different search queries → Not duplicate
      E.g Not Duplicates: https://google.com/search?q=cat | https://google.com/search?q=dog

3. Different hash anchors → Not duplicate
      E.g Not Duplicates: https://google.com/docs#page1 | https://google.com/docs#page2

4. Ignores case, ignores www, ignores trailing slash
      E.g Duplicates: https://google.com | https://www.googLe.com/

 
### TabHandling  Auto Activation Logic
Activates remaining oldest created tab

Additional Info: Need a manual scan? Click browser icon


## Installation
Option 1: Chrome Web Store
*Coming soon - publication in progress*

Option 2: Manual Installation
- Download or clone this repository:
   ```bash
   git clone https://github.com/webber3242/DeDupe2Activate.git
   ```
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode" using the toggle in the top-right corner
- Click "Load unpacked" and select the downloaded extension folder

#### File Structure

```
DeDupe2Activate/
├── manifest.json           # Extension configuration
├── background.js           # Main service worker logic
├── LICENSE.txt             # License file
├── README.md               # Documentation
├── images/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/               # Internationalization
    └── en/                 # English locale
        └── messages.json   # English messages
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
