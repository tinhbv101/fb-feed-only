(function () {
  const rules = globalThis.FbFeedOnlyRules;
  const peopleRules = globalThis.FbFeedOnlyPeopleRules;
  const storage = globalThis.FbFeedOnlyStorage;
  const hideAll = globalThis.FbFeedOnlyHideAll;
  const personFilter = globalThis.FbFeedOnlyPersonFilter;
  const FLUSH_DELAY_MS = 150;
  const BOUNCE_KEY = 'fbfo-bounced-thread';

  let settings = rules.DEFAULT_SETTINGS;
  let people = Object.freeze({});
  let selectedIds = Object.freeze([]);
  // Redirects are irreversible, so wait for the real settings instead of acting on defaults.
  let loaded = false;
  let redirecting = false;
  let pendingRoots = [];
  let flushTimer = null;

  function applyClasses() {
    const { classList } = document.documentElement;
    classList.toggle('fbfo-hide-messages', settings.messageMode === 'hideAll');
    classList.toggle('fbfo-filter-people', rules.isPersonFilterMode(settings.messageMode));
    classList.toggle('fbfo-hide-left-nav', settings.hideLeftNav);
  }

  function redirectTo(path) {
    redirecting = true;
    location.replace(path);
  }

  // /messages/ auto-opens the newest thread; if that one is hidden too, leave Messenger entirely.
  function bounceFromThread(threadId) {
    let alreadyBounced = false;
    try {
      alreadyBounced = sessionStorage.getItem(BOUNCE_KEY) === threadId;
      sessionStorage.setItem(BOUNCE_KEY, threadId);
    } catch {
      alreadyBounced = true;
    }
    redirectTo(alreadyBounced ? '/' : '/messages/');
  }

  function redirectIfNeeded() {
    if (!loaded || redirecting) return;
    const { messageMode } = settings;
    if (messageMode === 'hideAll' && rules.isMessagesPath(location.pathname)) {
      redirectTo('/');
      return;
    }
    if (!rules.isPersonFilterMode(messageMode)) return;
    const threadId = peopleRules.parseThreadId(location.pathname);
    if (threadId && peopleRules.shouldHideThread(messageMode, selectedIds, threadId)) bounceFromThread(threadId);
  }

  function filterState() {
    return Object.freeze({
      mode: settings.messageMode,
      filtering: rules.isPersonFilterMode(settings.messageMode),
      selectedIds,
      knownNames: peopleRules.namesOf(people, Object.keys(people)),
      selectedNames: peopleRules.namesOf(people, selectedIds),
    });
  }

  async function remember(seen) {
    if (!peopleRules.mergePeople(people, seen).changed) return;
    try {
      people = await storage.rememberPeople(seen);
    } catch (error) {
      console.error('[FB Feed Only] Failed to save seen conversations:', error);
    }
  }

  function flush() {
    clearTimeout(flushTimer);
    flushTimer = null;
    const roots = [...new Set(pendingRoots)].filter((el) => el.isConnected);
    pendingRoots = [];
    redirectIfNeeded();
    if (!loaded || settings.messageMode === 'off') return;

    if (settings.messageMode === 'hideAll') roots.forEach(hideAll.scan);
    const state = filterState();
    const seen = roots.flatMap((el) => personFilter.applyToRows(el, state));
    personFilter.applyToWindows(state);
    if (seen.length > 0) remember(seen);
  }

  function schedule(roots) {
    pendingRoots = [...pendingRoots, ...roots];
    if (flushTimer === null) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  }

  function onMutations(mutations) {
    // Facebook recycles list rows, so an href change can turn a row into a different conversation.
    const roots = mutations.flatMap((m) => (m.type === 'attributes' ? [m.target] : [...m.addedNodes]));
    // SPA navigation can happen without adding nodes, so always schedule the path check.
    schedule(roots.filter((n) => n.nodeType === Node.ELEMENT_NODE));
  }

  function refresh() {
    applyClasses();
    pendingRoots = [...pendingRoots, document.documentElement];
    flush();
  }

  async function load() {
    try {
      const [storedSettings, peopleState] = await Promise.all([storage.getSettings(), storage.getPeopleState()]);
      settings = storedSettings;
      people = peopleState.people;
      selectedIds = peopleState.selectedIds;
    } catch (error) {
      console.error('[FB Feed Only] Failed to load settings, using defaults:', error);
    }
    loaded = true;
    refresh();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    const newValues = Object.fromEntries(Object.entries(changes).map(([key, { newValue }]) => [key, newValue]));
    if (area === 'sync') settings = rules.mergeSettings({ ...settings, ...newValues });
    if (area === 'local' && 'people' in newValues) people = peopleRules.sanitizePeople(newValues.people);
    if (area === 'local' && 'selectedIds' in newValues) selectedIds = peopleRules.sanitizeIds(newValues.selectedIds);
    if (loaded) refresh();
  });

  // Apply defaults immediately to avoid a flash of Messenger UI before storage resolves.
  applyClasses();
  new MutationObserver(onMutations).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href'],
  });
  load();
})();
