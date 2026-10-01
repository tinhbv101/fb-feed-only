// Pure matching rules, shared by the content script and the Node tests.
(function (root) {
  const MESSAGES_PATH = /^\/(messages|messenger)(\/|$)/i;

  // Facebook localizes aria-labels, so cover both English and Vietnamese UIs.
  const MESSAGE_BUTTON_LABELS = Object.freeze(['messenger', 'chats', 'đoạn chat']);

  // Controls that only exist inside the floating chat dock (bottom-right).
  const CHAT_DOCK_LABELS = Object.freeze(['new message', 'tin nhắn mới']);

  const MESSAGE_INPUT_LABELS = Object.freeze(['message', 'tin nhắn', 'aa', 'viết tin nhắn']);

  const DEFAULT_SETTINGS = Object.freeze({ hideMessages: true, hideLeftNav: false });

  const normalize = (text) => String(text ?? '').trim().toLowerCase();

  const isMessagesPath = (pathname) => MESSAGES_PATH.test(String(pathname ?? ''));

  const isMessageButtonLabel = (label) => MESSAGE_BUTTON_LABELS.includes(normalize(label));

  const isChatDockLabel = (label) => CHAT_DOCK_LABELS.includes(normalize(label));

  const isMessageInputLabel = (label) => MESSAGE_INPUT_LABELS.includes(normalize(label));

  function isMessageHref(href) {
    if (!href) return false;
    try {
      const { hostname, pathname } = new URL(href, 'https://www.facebook.com');
      if (hostname === 'messenger.com' || hostname.endsWith('.messenger.com')) return true;
      return hostname.endsWith('facebook.com') && isMessagesPath(pathname);
    } catch {
      return false;
    }
  }

  // Ignore unknown keys and wrong types so a corrupted storage entry can't break the page.
  function mergeSettings(stored) {
    const source = stored && typeof stored === 'object' ? stored : {};
    return Object.freeze(
      Object.fromEntries(
        Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [
          key,
          typeof source[key] === 'boolean' ? source[key] : fallback,
        ])
      )
    );
  }

  const api = Object.freeze({
    DEFAULT_SETTINGS,
    isMessagesPath,
    isMessageButtonLabel,
    isChatDockLabel,
    isMessageInputLabel,
    isMessageHref,
    mergeSettings,
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.FbFeedOnlyRules = api;
  }
})(globalThis);
