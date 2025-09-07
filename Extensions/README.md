# Lextro - LeetCode Assistant

A Chrome extension that helps you solve LeetCode problems with AI assistance. Get code solutions, explanations, and company-specific approaches directly in your LeetCode interface.

## Features

- **Floating Action Button**: Appears on LeetCode problem pages for quick access
- **Problem Analysis**: Automatically extracts problem details and your current code
- **AI-Powered Solutions**: Get code solutions, logical explanations, or company-specific approaches
- **Multiple Languages**: Choose between English or Hinglish for explanations
- **Clean UI**: Intuitive interface that integrates with LeetCode's design

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed and ready to use

## How to Use

1. Navigate to any LeetCode problem (e.g., https://leetcode.com/problems/two-sum/)
2. Click the floating action button (FAB) in the bottom-right corner
3. The side panel will open with the problem details
4. Select your preferences:
   - Difficulty level (auto-detected by default)
   - Answer type (Code/Logical Explanation/Company Approach)
   - Output language (English/Hinglish)
5. Click "Go Lextro" to generate the solution
6. View the results in the side panel

## Development

### Project Structure

- `content.js`: Main content script that runs on LeetCode pages
- `sidepanel.html`/`sidepanel.js`: Side panel UI and logic
- `popup.html`/`popup.js`: Extension popup
- `styles.css`: Shared styles
- `manifest.json`: Extension configuration
- `icons/`: Extension icons

### Building

No build step is required. The extension can be loaded directly in Chrome.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ for the LeetCode community
- Uses [Font Awesome](https://fontawesome.com/) for icons
