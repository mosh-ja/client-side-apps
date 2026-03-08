const appRoot = document.getElementById('app');
const favicon = document.getElementById('app-favicon');
let disposeCurrentView = null;
let activeAppStylesheet = null;
const APP_MODULE_VERSION = '20260308-7';
let favoritesSeparatorModule = null;
let jsonFormatterModule = null;

restorePathFrom404Redirect();
void route();
window.addEventListener('popstate', () => {
  void route();
});

async function route() {
  if (disposeCurrentView) {
    disposeCurrentView();
    disposeCurrentView = null;
  }

  const path = normalizePath(window.location.pathname);
  const basePath = getBasePath(path);

  if (path.endsWith('/apps/favorites-separator/pipe')) {
    clearAppStylesheet();
    const { renderFavoritesSeparator } = await loadFavoritesSeparatorModule();
    disposeCurrentView = renderFavoritesSeparator({
      root: appRoot,
      basePath,
      navigateTo,
      symbol: '|',
      label: 'Pipe separator',
      faviconHref: assetUrl(basePath, '/apps/favorites-separator/assets/separator-pipe.png'),
      setFavicon,
    });
    return;
  }

  if (path.endsWith('/apps/favorites-separator/dash')) {
    clearAppStylesheet();
    const { renderFavoritesSeparator } = await loadFavoritesSeparatorModule();
    disposeCurrentView = renderFavoritesSeparator({
      root: appRoot,
      basePath,
      navigateTo,
      symbol: '-',
      label: 'Dash separator',
      faviconHref: assetUrl(basePath, '/apps/favorites-separator/assets/separator-dash.png'),
      setFavicon,
    });
    return;
  }

  if (path.endsWith('/apps/json-formatter')) {
    const { renderJsonFormatter } = await loadJsonFormatterModule();
    disposeCurrentView = renderJsonFormatter({
      root: appRoot,
      basePath,
      navigateTo,
      setFavicon,
      faviconHref: assetUrl(basePath, '/apps/json-formatter/assets/json-favicon.svg'),
      ensureAppStylesheet: (appStylesPath) => {
        ensureAppStylesheet(assetUrl(basePath, appStylesPath));
      },
    });
    return;
  }

  clearAppStylesheet();
  renderHome(basePath);
}

function renderHome(basePath) {
  document.title = 'Client Side Apps';
  setFavicon(assetUrl(basePath, '/apps/home/assets/site-favicon.svg'));

  appRoot.innerHTML = `
    <section class="page">
      <header class="header">
        <div class="brand">Client Side Apps</div>
      </header>

      <div class="card-list">
        <a class="card" href="${basePath}/apps/favorites-separator/pipe" data-link>
          <div class="card-title">Favorites Separator: |</div>
          <div class="card-subtitle">Bookmarkable separator icon with random query refresh.</div>
        </a>

        <a class="card" href="${basePath}/apps/favorites-separator/dash" data-link>
          <div class="card-title">Favorites Separator: -</div>
          <div class="card-subtitle">Same behavior with dash icon.</div>
        </a>

        <a class="card" href="${basePath}/apps/json-formatter" data-link>
          <div class="card-title">JSON Formatter</div>
          <div class="card-subtitle">Format, minify, validate, copy, and clear in one editor.</div>
        </a>

        <a class="card" href="#" aria-disabled="true">
          <div class="card-title">Text Editor</div>
          <div class="card-subtitle">Coming next.</div>
        </a>
      </div>
    </section>
  `;

  bindClientNavigation();
}

function bindClientNavigation() {
  const links = document.querySelectorAll('a[data-link]');
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const href = link.getAttribute('href');
      const nextUrl = new URL(href, window.location.origin);
      navigateTo(nextUrl.pathname + nextUrl.search + nextUrl.hash);
    });
  });
}

function setFavicon(href) {
  if (!favicon) return;
  favicon.href = href;
}

function restorePathFrom404Redirect() {
  const params = new URLSearchParams(window.location.search);
  const redirectedPath = params.get('p');

  if (!redirectedPath) return;

  const restoredQuery = params.get('q') || '';
  const restoredHash = params.get('h') || '';
  const cleanPath = redirectedPath.startsWith('/') ? redirectedPath : `/${redirectedPath}`;
  const basePath = getBasePath(window.location.pathname);

  window.history.replaceState({}, '', `${basePath}${cleanPath}${restoredQuery}${restoredHash}`);
}

function getBasePath(pathname) {
  const marker = '/apps/';
  const markerIndex = pathname.indexOf(marker);

  if (markerIndex !== -1) {
    return pathname.slice(0, markerIndex);
  }

  if (pathname === '/') {
    return '';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function assetUrl(basePath, assetPath) {
  return `${basePath}${assetPath}`;
}

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function ensureAppStylesheet(href) {
  if (activeAppStylesheet && activeAppStylesheet.href.endsWith(href)) {
    return;
  }

  clearAppStylesheet();

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  activeAppStylesheet = link;
}

function clearAppStylesheet() {
  if (!activeAppStylesheet) return;
  activeAppStylesheet.remove();
  activeAppStylesheet = null;
}

function navigateTo(pathWithQueryAndHash) {
  window.history.pushState({}, '', pathWithQueryAndHash);
  void route();
}

async function loadFavoritesSeparatorModule() {
  if (favoritesSeparatorModule) return favoritesSeparatorModule;
  favoritesSeparatorModule = await import(`../apps/favorites-separator/app.js?v=${APP_MODULE_VERSION}`);
  return favoritesSeparatorModule;
}

async function loadJsonFormatterModule() {
  if (jsonFormatterModule) return jsonFormatterModule;
  jsonFormatterModule = await import(`../apps/json-formatter/app.js?v=${APP_MODULE_VERSION}`);
  return jsonFormatterModule;
}
