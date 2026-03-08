# Favorites Separator

A tiny bookmark helper page for creating visual separators in the browser favorites/bookmarks bar.

## Routes

- `.../apps/favorites-separator/pipe` -> separator icon: `|`
- `.../apps/favorites-separator/dash` -> separator icon: `-`

## How to use

1. Open one of the routes above.
2. Click anywhere on the page at least once.
3. Add bookmark/favorite for the current page.
4. In your browser bookmark manager, keep the title empty (or visually empty).

The page click updates the URL query to a random value (`?x=<random>`), so each saved bookmark gets a unique URL.

## Files

- `app.js`: app UI and interaction logic
- `assets/separator-pipe.png`: pipe favicon asset
- `assets/separator-dash.png`: dash favicon asset

## Notes

- Favicon is set to the selected separator icon.
- The document title uses a zero-width space so bookmark text can remain visually empty in most browsers.
- This is fully client-side; no backend required.
