// DOM lookups for Facebook's Messenger UI, verified against the live page (Oct 2026).
(function (root) {
  const peopleRules = root.FbFeedOnlyPeopleRules;

  // Layout regions that are also position:fixed and must never be hidden as a "chat dock".
  const PROTECTED_REGIONS = '[role="banner"], [role="navigation"], [role="main"], [role="feed"]';
  const THREAD_LINK = 'a[href*="/t/"]';

  // Chat windows live in a fixed-position dock; hiding the dock removes every chat at once.
  function findChatDock(el) {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      if (node.matches(PROTECTED_REGIONS) || node.querySelector(PROTECTED_REGIONS)) return null;
      if (getComputedStyle(node).position === 'fixed') return node;
    }
    return null;
  }

  const selfAndDescendants = (rootEl, selector) => [
    ...(rootEl.matches?.(selector) ? [rootEl] : []),
    ...(rootEl.querySelectorAll?.(selector) ?? []),
  ];

  // A conversation row is a thread link whose first text leaf is the contact or group name.
  function readThreadRow(link) {
    const id = peopleRules.parseThreadId(link.getAttribute('href'));
    if (!id) return null;
    const nameLeaf = [...link.querySelectorAll('span')].find((el) => el.children.length === 0 && el.textContent.trim());
    return { id, name: nameLeaf?.textContent ?? '' };
  }

  function findThreadRows(rootEl) {
    return selfAndDescendants(rootEl, THREAD_LINK)
      .map((link) => ({ link, row: readThreadRow(link) }))
      .filter(({ row }) => row !== null);
  }

  // Hide the whole list item when Facebook wraps the link in one, but never a wrapper shared by several rows.
  function rowContainer(link) {
    const item = link.closest('[role="row"], [role="listitem"]');
    return item && item.querySelectorAll(THREAD_LINK).length === 1 ? item : link;
  }

  // Each open chat window has one role=log whose aria-label contains the contact's name.
  function findChatWindows() {
    return [...document.querySelectorAll('[role="log"]')]
      .map((log) => ({ log, dock: findChatDock(log) }))
      .filter(({ dock }) => dock !== null)
      .map(({ log, dock }) => {
        let win = log;
        while (win.parentElement && win.parentElement !== dock && win.parentElement.querySelectorAll('[role="log"]').length === 1) {
          win = win.parentElement;
        }
        return { element: win, label: log.getAttribute('aria-label') ?? '' };
      });
  }

  root.FbFeedOnlyDom = Object.freeze({
    findChatDock,
    selfAndDescendants,
    readThreadRow,
    findThreadRows,
    rowContainer,
    findChatWindows,
  });
})(globalThis);
