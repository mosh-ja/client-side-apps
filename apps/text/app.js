const STORAGE_KEY = 'client-side-apps-text-v1';
const SAVE_DEBOUNCE_MS = 200;
/** Maximum editor content size (UTF-8 bytes), aligned with typical localStorage quotas. */
const MAX_BYTES = 10 * 1024 * 1024;

const utf8Encoder = new TextEncoder();

function utf8ByteLength(str) {
  return utf8Encoder.encode(str).length;
}

function truncateUtf8ToMaxBytes(str, maxBytes) {
  if (utf8ByteLength(str) <= maxBytes) {
    return str;
  }

  let lo = 0;
  let hi = str.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const slice = str.slice(0, mid);
    if (utf8ByteLength(slice) <= maxBytes) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return str.slice(0, lo);
}

export function renderTextApp({ root, basePath, navigateTo, setFavicon, faviconHref, ensureAppStylesheet }) {
  let activeHandlers = [];
  let saveTimer = null;
  let lastValidValue = '';

  setFavicon(faviconHref);
  ensureAppStylesheet('/apps/text/styles.css');
  document.title = 'Text';

  root.innerHTML = `
    <section class="page text-page">
      <div class="text-toolbar">
        <div class="text-toolbar-group text-toolbar-left">
          <button type="button" class="nav-link text-btn" data-action="copy">Copy</button>
          <button type="button" class="nav-link text-btn" data-action="paste">Paste</button>
          <button type="button" class="nav-link text-btn" data-action="clear">Clear</button>
        </div>

        <div class="text-toolbar-group text-toolbar-right">
          <div class="text-status" id="text-status" role="status" aria-live="polite"></div>
          <a class="nav-link" href="${basePath || '/'}" data-home>Home</a>
        </div>
      </div>

      <div class="text-editor-wrap">
        <textarea id="text-editor" class="text-editor" spellcheck="true" placeholder="Type or paste text. It is saved automatically in this browser."></textarea>
      </div>

      <p class="text-hint">Text is stored locally in your browser (up to 10&nbsp;MB) and appears when you return.</p>
    </section>
  `;

  const homeLink = root.querySelector('[data-home]');
  const editor = root.querySelector('#text-editor');
  const status = root.querySelector('#text-status');
  const actionButtons = root.querySelectorAll('[data-action]');

  const setStatus = (message) => {
    status.textContent = message;
  };

  const persistNow = () => {
    if (utf8ByteLength(editor.value) > MAX_BYTES) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, editor.value);
    } catch {
      setStatus('Could not save (storage may be full).');
    }
  };

  const schedulePersist = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistNow();
    }, SAVE_DEBOUNCE_MS);
  };

  const loadStored = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) ?? '';
      if (utf8ByteLength(stored) > MAX_BYTES) {
        const truncated = truncateUtf8ToMaxBytes(stored, MAX_BYTES);
        editor.value = truncated;
        lastValidValue = truncated;
        try {
          localStorage.setItem(STORAGE_KEY, truncated);
        } catch {
          setStatus('Could not save after trimming stored text.');
        }
        setStatus('Stored text exceeded 10 MB; it was trimmed to fit.');
        return;
      }
      editor.value = stored;
      lastValidValue = stored;
    } catch {
      editor.value = '';
      lastValidValue = '';
      setStatus('Could not read saved text.');
    }
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
      lastValidValue = '';
      persistNow();
      setStatus('Cleared.');
      editor.focus();
      return;
    }

    if (action === 'copy') {
      if (!editor.value) {
        setStatus('Nothing to copy.');
        return;
      }

      try {
        await navigator.clipboard.writeText(editor.value);
        setStatus('Copied to clipboard.');
      } catch {
        setStatus('Copy failed in this browser.');
      }
      return;
    }

    if (action === 'paste') {
      try {
        const clip = await navigator.clipboard.readText();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        const merged = `${before}${clip}${after}`;
        if (utf8ByteLength(merged) > MAX_BYTES) {
          setStatus(`Paste would exceed the ${MAX_BYTES / (1024 * 1024)} MB limit.`);
          editor.focus();
          return;
        }
        editor.value = merged;
        lastValidValue = merged;
        const caret = start + clip.length;
        editor.setSelectionRange(caret, caret);
        persistNow();
        setStatus('Pasted from clipboard.');
        editor.focus();
      } catch {
        setStatus('Paste failed — try Cmd/Ctrl+V in the editor, or allow clipboard access.');
      }
    }
  };

  const onInput = () => {
    if (utf8ByteLength(editor.value) > MAX_BYTES) {
      editor.value = lastValidValue;
      setStatus('Content is limited to 10 MB (UTF-8).');
      return;
    }
    lastValidValue = editor.value;
    schedulePersist();
    if (status.textContent) {
      status.textContent = '';
    }
  };

  const fitEditorToViewport = () => {
    const toolbar = root.querySelector('.text-toolbar');
    const hint = root.querySelector('.text-hint');
    const viewportHeight = window.innerHeight;
    const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 0;
    const hintHeight = hint ? hint.getBoundingClientRect().height : 0;
    const reservedSpace = 140 + toolbarHeight + hintHeight;
    const height = Math.max(320, viewportHeight - reservedSpace);
    editor.style.height = `${height}px`;
  };

  loadStored();

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
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    persistNow();
    activeHandlers.forEach((dispose) => dispose());
    activeHandlers = [];
  };
}
