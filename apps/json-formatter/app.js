export function renderJsonFormatter({ root, basePath, navigateTo, setFavicon, faviconHref, ensureAppStylesheet }) {
  let activeHandlers = [];
  setFavicon(faviconHref);
  ensureAppStylesheet('/apps/json-formatter/styles.css');
  document.title = 'JSON Formatter';

  root.innerHTML = `
    <section class="page json-formatter-page">
      <div class="json-toolbar">
        <div class="json-toolbar-group json-toolbar-left">
          <span style="font-size:11px;color:#666;margin-right:6px;">LEFT</span>
          <button class="nav-link json-btn" data-action="format">Format</button>
          <button class="nav-link json-btn" data-action="minify">Minify</button>
          <button class="nav-link json-btn" data-action="validate">Validate</button>
          <button class="nav-link json-btn" data-action="copy">Copy</button>
          <button class="nav-link json-btn" data-action="clear">Clear</button>
        </div>

        <div class="json-toolbar-group json-toolbar-middle">
          <span style="font-size:11px;color:#666;margin-right:6px;">MIDDLE</span>
          <label for="json-indent" class="json-label">Indent</label>
          <select id="json-indent" class="json-select">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="8">8 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>

        <div class="json-toolbar-group json-toolbar-right">
          <span style="font-size:11px;color:#666;margin-right:6px;">RIGHT</span>
          <div class="json-status" id="json-status" role="status" aria-live="polite"></div>
          <a class="nav-link" href="${basePath || '/'}" data-home>Home</a>
        </div>
      </div>

      <div style="font-size:11px;color:#0b5;letter-spacing:0.04em;margin:0 0 8px 2px;">
        JSON_FORMATTER_LAYOUT_DEBUG_V3
      </div>

      <div class="json-editor-wrap">
        <textarea id="json-editor" class="json-editor" spellcheck="false" placeholder='Paste JSON here, then use Format / Minify / Validate...'></textarea>
      </div>

      <p id="json-error" class="json-error" role="alert" aria-live="assertive"></p>
    </section>
  `;

  const homeLink = root.querySelector('[data-home]');
  const editor = root.querySelector('#json-editor');
  const status = root.querySelector('#json-status');
  const error = root.querySelector('#json-error');
  const indentSelect = root.querySelector('#json-indent');
  const actionButtons = root.querySelectorAll('[data-action]');

  const clearMessages = () => {
    error.textContent = '';
    status.textContent = '';
  };

  const setError = (message) => {
    error.textContent = message;
    status.textContent = '';
  };

  const setStatus = (message) => {
    status.textContent = message;
    error.textContent = '';
  };

  const parseEditorJson = () => {
    const raw = editor.value.trim();
    if (!raw) {
      throw new Error('Please enter JSON first.');
    }

    return JSON.parse(raw);
  };

  const getIndent = () => {
    if (indentSelect.value === 'tab') {
      return '\t';
    }
    return Number(indentSelect.value);
  };

  const onHomeClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    navigateTo(basePath || '/');
  };

  const onActionClick = async (event) => {
    const action = event.currentTarget.getAttribute('data-action');

    if (action === 'clear') {
      editor.value = '';
      clearMessages();
      editor.focus();
      return;
    }

    if (action === 'copy') {
      if (!editor.value.trim()) {
        setError('Nothing to copy.');
        return;
      }

      try {
        await navigator.clipboard.writeText(editor.value);
        setStatus('Copied to clipboard.');
      } catch (copyError) {
        setError('Copy failed in this browser.');
      }
      return;
    }

    try {
      const parsed = parseEditorJson();

      if (action === 'validate') {
        setStatus('Valid JSON.');
        return;
      }

      if (action === 'format') {
        editor.value = `${JSON.stringify(parsed, null, getIndent())}\n`;
        setStatus('Formatted.');
        return;
      }

      if (action === 'minify') {
        editor.value = JSON.stringify(parsed);
        setStatus('Minified.');
      }
    } catch (parseError) {
      setError(parseError.message);
    }
  };

  const onInput = () => {
    if (error.textContent || status.textContent) {
      clearMessages();
    }
  };

  const fitEditorToViewport = () => {
    const toolbar = root.querySelector('.json-toolbar');
    const errorArea = root.querySelector('.json-error');
    const viewportHeight = window.innerHeight;
    const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 0;
    const errorHeight = errorArea ? errorArea.getBoundingClientRect().height : 0;
    const reservedSpace = 150 + toolbarHeight + errorHeight;
    const height = Math.max(320, viewportHeight - reservedSpace);
    editor.style.height = `${height}px`;
  };

  if (homeLink) {
    homeLink.addEventListener('click', onHomeClick);
    activeHandlers.push(() => homeLink.removeEventListener('click', onHomeClick));
  }

  actionButtons.forEach((button) => {
    button.addEventListener('click', onActionClick);
    activeHandlers.push(() => button.removeEventListener('click', onActionClick));
  });

  if (editor) {
    editor.addEventListener('input', onInput);
    activeHandlers.push(() => editor.removeEventListener('input', onInput));
    window.addEventListener('resize', fitEditorToViewport);
    activeHandlers.push(() => window.removeEventListener('resize', fitEditorToViewport));
    fitEditorToViewport();
    editor.focus();
  }

  return function cleanup() {
    activeHandlers.forEach((dispose) => dispose());
    activeHandlers = [];
  };
}
