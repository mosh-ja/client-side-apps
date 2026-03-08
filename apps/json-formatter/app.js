export function renderJsonFormatter({ root, basePath, navigateTo, setFavicon, faviconHref, ensureAppStylesheet }) {
  const MAX_INPUT_BYTES = 30 * 1024 * 1024;
  const ERROR_CONTEXT_RADIUS = 140;
  let activeHandlers = [];
  setFavicon(faviconHref);
  ensureAppStylesheet('/apps/json-formatter/styles.css');
  document.title = 'JSON Formatter';

  root.innerHTML = `
    <section class="page json-formatter-page">
      <div class="json-toolbar">
        <div class="json-toolbar-group json-toolbar-left">
          <button class="nav-link json-btn" data-action="format">Format</button>
          <button class="nav-link json-btn" data-action="minify">Minify</button>
          <button class="nav-link json-btn" data-action="validate">Validate</button>
          <button class="nav-link json-btn" data-action="copy">Copy</button>
          <button class="nav-link json-btn" data-action="clear">Clear</button>
        </div>

        <div class="json-toolbar-group json-toolbar-middle">
          <label for="json-indent" class="json-label">Indent</label>
          <select id="json-indent" class="json-select">
            <option value="2" selected>2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="8">8 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>

        <div class="json-toolbar-group json-toolbar-right">
          <div class="json-status" id="json-status" role="status" aria-live="polite"></div>
          <a class="nav-link" href="${basePath || '/'}" data-home>Home</a>
        </div>
      </div>

      <div class="json-editor-wrap">
        <textarea id="json-editor" class="json-editor" spellcheck="false" placeholder='Paste JSON here, then use Format / Minify / Validate...'></textarea>
      </div>

      <p id="json-error" class="json-error" role="alert" aria-live="assertive"></p>
      <pre id="json-error-context" class="json-error-context" aria-live="polite" hidden></pre>
    </section>
  `;

  const homeLink = root.querySelector('[data-home]');
  const editor = root.querySelector('#json-editor');
  const status = root.querySelector('#json-status');
  const error = root.querySelector('#json-error');
  const errorContext = root.querySelector('#json-error-context');
  const indentSelect = root.querySelector('#json-indent');
  const actionButtons = root.querySelectorAll('[data-action]');

  const clearMessages = () => {
    error.textContent = '';
    status.textContent = '';
    errorContext.hidden = true;
    errorContext.innerHTML = '';
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
    const raw = editor.value;
    if (!raw.trim()) {
      throw new Error('Please enter JSON first.');
    }

    const rawSizeBytes = new TextEncoder().encode(raw).length;
    if (rawSizeBytes > MAX_INPUT_BYTES) {
      throw new Error('Input exceeds 30MB limit.');
    }

    return JSON.parse(raw);
  };

  const getJsonErrorLocation = (message, sourceText) => {
    const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    if (lineColumnMatch) {
      const line = Number(lineColumnMatch[1]);
      const column = Number(lineColumnMatch[2]);
      const lines = sourceText.split('\n');
      let position = 0;
      for (let i = 0; i < line - 1 && i < lines.length; i += 1) {
        position += lines[i].length + 1;
      }
      position += Math.max(0, column - 1);
      return {
        line,
        column,
        position,
      };
    }

    const positionMatch = message.match(/position\s+(\d+)/i);
    if (!positionMatch) return null;

    const position = Number(positionMatch[1]);
    if (!Number.isFinite(position) || position < 0) return null;

    const safePosition = Math.min(position, sourceText.length);
    const precedingText = sourceText.slice(0, safePosition);
    const line = precedingText.split('\n').length;
    const lastNewlineIndex = sourceText.lastIndexOf('\n', Math.max(0, safePosition - 1));
    const column = safePosition - lastNewlineIndex;

    return { line, column, position: safePosition };
  };

  const escapeHtml = (value) => {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  const renderErrorContext = (sourceText, location) => {
    if (!location || !Number.isFinite(location.position)) {
      errorContext.hidden = true;
      errorContext.innerHTML = '';
      return;
    }

    const safePosition = Math.max(0, Math.min(sourceText.length, location.position));
    const start = Math.max(0, safePosition - ERROR_CONTEXT_RADIUS);
    const end = Math.min(sourceText.length, safePosition + ERROR_CONTEXT_RADIUS);
    const before = sourceText.slice(start, safePosition);
    const at = sourceText.slice(safePosition, Math.min(sourceText.length, safePosition + 1));
    const after = sourceText.slice(Math.min(sourceText.length, safePosition + 1), end);
    const marker = at || ' ';

    const prefix = start > 0 ? '...' : '';
    const suffix = end < sourceText.length ? '...' : '';
    const lineInfo = `Line ${location.line}, Column ${location.column}`;
    const beforeHtml = escapeHtml(before);
    const atHtml = escapeHtml(marker);
    const afterHtml = escapeHtml(after);

    errorContext.innerHTML = `${lineInfo}\n${prefix}${beforeHtml}<mark>${atHtml}</mark>${afterHtml}${suffix}`;
    errorContext.hidden = false;
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
        errorContext.hidden = true;
        errorContext.innerHTML = '';
        setStatus('Valid JSON.');
        return;
      }

      if (action === 'format') {
        editor.value = `${JSON.stringify(parsed, null, getIndent())}\n`;
        errorContext.hidden = true;
        errorContext.innerHTML = '';
        setStatus('Formatted.');
        return;
      }

      if (action === 'minify') {
        editor.value = JSON.stringify(parsed);
        errorContext.hidden = true;
        errorContext.innerHTML = '';
        setStatus('Minified.');
      }
    } catch (parseError) {
      const location = getJsonErrorLocation(parseError.message, editor.value);
      renderErrorContext(editor.value, location);
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
