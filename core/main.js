import { renderFavoritesSeparator } from '../apps/favorites-separator/app.js';

const appRoot = document.getElementById('app');
const favicon = document.getElementById('app-favicon');
let disposeCurrentView = null;

restorePathFrom404Redirect();
route();
window.addEventListener('popstate', route);

function route() {
  if (disposeCurrentView) {
    disposeCurrentView();
    disposeCurrentView = null;
  }

  const path = window.location.pathname;
  const basePath = getBasePath(path);

  if (path === `${basePath}/apps/favorites-separator/pipe`) {
    disposeCurrentView = renderFavoritesSeparator({
      root: appRoot,
      basePath,
      symbol: '|',
      label: 'Pipe separator',
      faviconHref: assetUrl(basePath, '/apps/favorites-separator/assets/separator-pipe.png'),
      setFavicon,
    });
    return;
  }

  if (path === `${basePath}/apps/favorites-separator/dash`) {
    disposeCurrentView = renderFavoritesSeparator({
      root: appRoot,
      basePath,
      symbol: '-',
      label: 'Dash separator',
      faviconHref: assetUrl(basePath, '/apps/favorites-separator/assets/separator-dash.png'),
      setFavicon,
    });
    return;
  }

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

        <a class="card" href="#" aria-disabled="true">
          <div class="card-title">JSON Formatter</div>
          <div class="card-subtitle">Coming next.</div>
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
      window.history.pushState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
      route();
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
