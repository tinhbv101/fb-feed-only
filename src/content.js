(function () {
  const rules = globalThis.FbFeedOnlyRules;
  const HIDDEN_ATTR = 'data-fbfo-hidden';
  const FLUSH_DELAY_MS = 150;

  let settings = rules.DEFAULT_SETTINGS;
  // Redirects are irreversible, so wait for the real settings instead of acting on defaults.
  let settingsLoaded = false;
  let pendingRoots = [];
  let flushTimer = null;

  function applyClasses() {
    const { classList } = document.documentElement;
    classList.toggle('fbfo-hide-messages', settings.hideMessages);
    classList.toggle('fbfo-hide-left-nav', settings.hideLeftNav);
  }

  function redirectAwayFromMessages() {
    if (settingsLoaded && settings.hideMessages && rules.isMessagesPath(location.pathname)) {
      location.replace('/');
    }
  }

  // Layout regions that are also position:fixed and must never be hidden as a "chat dock".
  const PROTECTED_REGIONS = '[role="banner"], [role="navigation"], [role="main"], [role="feed"]';

  // Chat windows live in a fixed-position dock; hiding the dock removes every chat at once.
  function findChatDock(el) {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (node.matches(PROTECTED_REGIONS) || node.querySelector(PROTECTED_REGIONS)) return null;
      if (getComputedStyle(node).position === 'fixed') return node;
    }
    return null;
  }

  // 'dock' = part of the chat popups, 'control' = a single button/link to Messenger.
  function classify(el) {
    const label = el.getAttribute('aria-label');
    if (el.getAttribute('role') === 'textbox') return rules.isMessageInputLabel(label) ? 'dock' : null;
    if (rules.isChatDockLabel(label)) return 'dock';
    if (rules.isMessageButtonLabel(label)) return 'control';
    if (el.matches('a[href]') && rules.isMessageHref(el.getAttribute('href'))) return 'control';
    return null;
  }

  function hide(el, kind) {
    const control = el.closest('[role="button"], a') ?? el;
    const target = kind === 'dock' ? findChatDock(control) ?? control : control;
    target.setAttribute(HIDDEN_ATTR, '');
  }

  function scan(root) {
    const selector = '[aria-label], a[href]';
    const candidates = root.matches?.(selector) ? [root] : [];
    const descendants = root.querySelectorAll?.(selector) ?? [];
    [...candidates, ...descendants]
      .filter((el) => !el.closest(`[${HIDDEN_ATTR}]`))
      .forEach((el) => {
        const kind = classify(el);
        if (kind) hide(el, kind);
      });
  }

  function flush() {
    flushTimer = null;
    const roots = pendingRoots;
    pendingRoots = [];
    redirectAwayFromMessages();
    if (!settings.hideMessages) return;
    roots.filter((root) => root.isConnected).forEach(scan);
  }

  function schedule(roots) {
    pendingRoots = [...pendingRoots, ...roots];
    if (flushTimer === null) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  }

  function onMutations(mutations) {
    const added = mutations.flatMap((m) => [...m.addedNodes]).filter((n) => n.nodeType === Node.ELEMENT_NODE);
    // SPA navigation can happen without adding nodes, so always schedule the path check.
    schedule(added);
  }

  function updateSettings(stored) {
    settings = rules.mergeSettings(stored);
    settingsLoaded = true;
    applyClasses();
    schedule([document.documentElement]);
  }

  async function loadSettings() {
    try {
      updateSettings(await chrome.storage.sync.get(rules.DEFAULT_SETTINGS));
    } catch (error) {
      console.error('[FB Feed Only] Failed to load settings, using defaults:', error);
      updateSettings(rules.DEFAULT_SETTINGS);
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const changed = Object.fromEntries(Object.entries(changes).map(([key, { newValue }]) => [key, newValue]));
    updateSettings({ ...settings, ...changed });
  });

  // Apply defaults immediately to avoid a flash of Messenger UI before storage resolves.
  applyClasses();
  new MutationObserver(onMutations).observe(document.documentElement, { childList: true, subtree: true });
  loadSettings();
})();
