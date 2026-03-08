let activeClickHandler = null;

export function renderFavoritesSeparator({ root, basePath, navigateTo, symbol, label, faviconHref, setFavicon }) {
  setFavicon(faviconHref);

  // True empty titles are inconsistent across browsers. Zero-width space keeps it visually blank.
  document.title = '\u200B';

  root.innerHTML = `
    <section class="page">
      <header class="header">
        <a class="nav-link" href="${basePath || '/'}" data-home>Home</a>
      </header>

      <div class="separator-shell" id="separator-shell">
        <div class="separator-icon">${symbol}</div>
        <p class="helper">Click anywhere to randomize URL before bookmarking.</p>
        <p class="helper mono" id="generated-url"></p>
        <p class="helper">${label}</p>
      </div>
    </section>
  `;

  const homeLink = root.querySelector('[data-home]');
  if (homeLink) {
    homeLink.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      navigateTo(basePath || '/');
    });
  }

  const updateQuery = () => {
    const randomValue = Math.random().toString(36).slice(2, 11);
    const nextUrl = `${window.location.pathname}?x=${randomValue}`;
    window.history.replaceState({}, '', nextUrl);

    const generated = root.querySelector('#generated-url');
    if (generated) {
      generated.textContent = `${window.location.pathname}?x=${randomValue}`;
    }
  };

  if (activeClickHandler) {
    document.removeEventListener('click', activeClickHandler);
  }

  activeClickHandler = updateQuery;
  document.addEventListener('click', activeClickHandler);

  updateQuery();

  return function cleanup() {
    if (activeClickHandler) {
      document.removeEventListener('click', activeClickHandler);
      activeClickHandler = null;
    }
  };
}
