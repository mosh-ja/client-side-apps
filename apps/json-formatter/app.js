export function renderJsonFormatter({ root, basePath, navigateTo, setFavicon, faviconHref, ensureAppStylesheet }) {
  const MAX_INPUT_BYTES = 30 * 1024 * 1024;
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
        <div id="json-line-numbers" class="json-line-numbers" aria-hidden="true"></div>
        <textarea id="json-editor" class="json-editor" spellcheck="false" placeholder='Paste JSON here, then use Format / Minify / Validate...'></textarea>
      </div>

      <p id="json-error" class="json-error" role="alert" aria-live="assertive"></p>
    </section>
  `;

  const homeLink = root.querySelector('[data-home]');
  const editor = root.querySelector('#json-editor');
  const lineNumbers = root.querySelector('#json-line-numbers');
  const status = root.querySelector('#json-status');
  const error = root.querySelector('#json-error');
  const indentSelect = root.querySelector('#json-indent');
  const actionButtons = root.querySelectorAll('[data-action]');
  let highlightedErrorLine = null;
  let renderedLineCount = 0;
  let renderedHighlightedLine = null;

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
      return {
        line: Number(lineColumnMatch[1]),
        column: Number(lineColumnMatch[2]),
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

    return { line, column };
  };

  const updateLineNumbers = (force = false) => {
    if (!lineNumbers) return;
    const lineCount = Math.max(1, editor.value.split('\n').length);

    if (!force && lineCount === renderedLineCount && renderedHighlightedLine === highlightedErrorLine) {
      return;
    }

    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= lineCount; i += 1) {
      const lineNumber = document.createElement('span');
      lineNumber.className = i === highlightedErrorLine ? 'json-line-number is-error' : 'json-line-number';
      lineNumber.textContent = String(i);
      fragment.appendChild(lineNumber);
    }

    lineNumbers.replaceChildren(fragment);
    lineNumbers.style.setProperty('--json-gutter-chars', String(Math.max(2, String(lineCount).length)));
    renderedLineCount = lineCount;
    renderedHighlightedLine = highlightedErrorLine;
  };

  const syncLineNumberScroll = () => {
    if (!lineNumbers) return;
    lineNumbers.scrollTop = editor.scrollTop;
  };

  const revealLine = (line) => {
    if (!line || line < 1) return;
    const computed = window.getComputedStyle(editor);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 21;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 14;
    const targetTop = Math.max(0, paddingTop + (line - 1) * lineHeight - lineHeight * 2);
    editor.scrollTop = targetTop;
    syncLineNumberScroll();
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
      highlightedErrorLine = null;
      updateLineNumbers(true);
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
        highlightedErrorLine = null;
        updateLineNumbers(true);
        setStatus('Valid JSON.');
        return;
      }

      if (action === 'format') {
        editor.value = `${JSON.stringify(parsed, null, getIndent())}\n`;
        highlightedErrorLine = null;
        updateLineNumbers(true);
        setStatus('Formatted.');
        return;
      }

      if (action === 'minify') {
        editor.value = JSON.stringify(parsed);
        highlightedErrorLine = null;
        updateLineNumbers(true);
        setStatus('Minified.');
      }
    } catch (parseError) {
      const location = getJsonErrorLocation(parseError.message, editor.value);
      highlightedErrorLine = location?.line ?? null;
      updateLineNumbers(true);
      if (location?.line) {
        revealLine(location.line);
      }
      setError(parseError.message);
    }
  };

  const onInput = () => {
    highlightedErrorLine = null;
    updateLineNumbers();
    syncLineNumberScroll();
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
    editor.addEventListener('scroll', syncLineNumberScroll);
    activeHandlers.push(() => editor.removeEventListener('input', onInput));
    activeHandlers.push(() => editor.removeEventListener('scroll', syncLineNumberScroll));
    window.addEventListener('resize', fitEditorToViewport);
    activeHandlers.push(() => window.removeEventListener('resize', fitEditorToViewport));
    fitEditorToViewport();
    updateLineNumbers(true);
    syncLineNumberScroll();
    editor.focus();
  }

  return function cleanup() {
    activeHandlers.forEach((dispose) => dispose());
    activeHandlers = [];
  };
}
