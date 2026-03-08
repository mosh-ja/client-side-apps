# Client Side Apps

A repository of small browser-only utilities, published with GitHub Pages.

## Project scope

- Static frontend apps (HTML/CSS/JavaScript)
- No backend
- Optional browser storage (`localStorage`)
- Single-page app routing with path-based URLs

## Deployment

This project is intended for GitHub Pages using:

- `Source`: Deploy from a branch
- `Branch`: `main`
- `Folder`: `/ (root)`

## Structure

- `index.html`: SPA entry point
- `404.html`: SPA deep-link fallback for GitHub Pages
- `core/`: shared infrastructure (router, global styles)
- `apps/`: app-specific modules, assets, and docs

## Update workflow

- After each change, update the `<!-- Refreshed: YYYY-MM-DD HH:MM -->` comment in `index.html` so browser refresh behavior is easier to verify.
