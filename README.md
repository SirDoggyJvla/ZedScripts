# Project Zomboid VSCode Syntax Extension

This VS Code extension provides comprehensive support for Project Zomboid's [scripts](https://pzwiki.net/wiki/Scripts), including syntax highlighting, auto-formatting, and diagnostics for items, recipes, and other script blocks.

> Note: This extension is designed specifically for Build 42.

### Features
- Syntax highlighting for Project Zomboid script files.
- Auto-formatting of script files to maintain consistent style.
- Diagnostics for:
  - Common errors in script definitions;
  - Mandatory, wrong, deprecated parameters;
  - Wrong types and values;
  - Missing commas;
  - And more!
- Hovering tooltips with additional information about script elements.
- Auto-completion for script elements based on the Project Zomboid data (automatic mandatory parameters and subblocks).
- Detection for script blocks used in wrong parent blocks.
- Missing IDs detection.

### Usage
- Install the extension from the VS Code Marketplace.
- Open a `.txt` script file.
- Press Ctrl + Shift + P and select "Change Language Mode".
- Choose "Project Zomboid Scripts (pz-scripts)" from the list.

The extension automatically downloads the latest script data from the [pz-scripts-data](https://github.com/SirDoggyJvla/pz-scripts-data) repository and caches it for 12 hours, which it will fetch once more after this time. If it doesn't manage to fetch this data, it will fall back to the bundled data with the extension, which may get outdated.

You can also manually force a data refresh by running the "PZ Scripts: Force fetch Script Data" command from the command palette (ctrl + shift + P).

### Configuration
By default the Project Zomboid directory is `C:\Program Files (x86)\Steam\steamapps\common\ProjectZomboid\media\scripts`, but you can change this in the settings of the extension. The extension automatically retrieves the vanilla item scripts.

### Contributing
Want to contribute to the project ? Feel free to do so ! You can also help by providing descriptions and data for scripts in the [pz-scripts-data](https://github.com/SirDoggyJvla/pz-scripts-data) repository.

### License
This project is licensed under the MIT License. See the LICENSE file for details.