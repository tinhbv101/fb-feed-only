// "Hide all" mode: tag every Messenger control and the chat dock.
(function (root) {
  const rules = root.FbFeedOnlyRules;
  const dom = root.FbFeedOnlyDom;
  const HIDDEN_ATTR = 'data-fbfo-hidden';

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
    const target = kind === 'dock' ? dom.findChatDock(control) ?? control : control;
    target.setAttribute(HIDDEN_ATTR, '');
  }

  function scan(rootEl) {
    dom
      .selfAndDescendants(rootEl, '[aria-label], a[href]')
      .filter((el) => !el.closest(`[${HIDDEN_ATTR}]`))
      .forEach((el) => {
        const kind = classify(el);
        if (kind) hide(el, kind);
      });
  }

  root.FbFeedOnlyHideAll = Object.freeze({ scan });
})(globalThis);
