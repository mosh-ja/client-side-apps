# Text

A simple notepad with clipboard actions and local persistence.

## Route

- `.../apps/text`

## Features

- Large text area
- `Copy`, `Paste`, `Clear`, and `Home`
- Content saved in `localStorage` for the same browser and origin
- Maximum **10 MB** of text (UTF-8 byte length), consistent with typical browser storage limits; older saves above that are trimmed on load

## Usage

1. Open the app; previously saved text loads automatically.
2. Edit as needed; changes are saved shortly after you stop typing.
3. Use **Paste** to insert the system clipboard at the caret (or over the selection), or use the usual shortcut in the box.

## Files

- `app.js`: app UI and behavior
- `styles.css`: app-specific styles
