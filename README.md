# Project Zomboid VSCode Syntax Extension

This VS Code extension provides comprehensive support for Project Zomboid's [scripts](https://pzwiki.net/wiki/Scripts), including syntax highlighting, auto-formatting, and diagnostics for items, recipes, and other script blocks.

> Note: This extension is designed specifically for Build 42.

## Features

- Syntax highlighting for Project Zomboid's script blocks
- Navigation features:
  - Go to item definition with CTRL+click
  - Hover information for items (shows definition when hovering over Base.ITEM)
- Automatic indentation rules
- Comment support (`/* */`)
- Auto-formatting support:
  - Aligns assignments within blocks
  - Maintains proper indentation levels
- Diagnostics:
  - Identifies unrecognized keywords within blocks
  - Provides warnings for potential issues in the script

## Configuration
By default the Project Zomboid directory is "C:\Program Files (x86)\Steam\steamapps\common\ProjectZomboid\media\scripts", but you can change this in the settings of the extension.
You can add custom filename if you want they be detected as "pz-scripts" file

## Usage

- Open a file with the `.txt` extension to activate the syntax highlighting, formatting, and diagnostic features.
- Use the command palette to access any additional commands provided by the extension.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.