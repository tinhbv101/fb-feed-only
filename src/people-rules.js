// Pure per-person filtering rules, shared by the content script, the popup and the Node tests.
(function (root) {
  const THREAD_PATH = /^\/(?:messages\/)?(?:e2ee\/)?t\/(\d{5,25})\/?$/;
  const RAW_ID = /^\d{5,25}$/;
  const MAX_NAME_LENGTH = 100;

  function parseThreadId(href) {
    if (!href) return null;
    try {
      const { hostname, pathname } = new URL(href, 'https://www.facebook.com');
      const isMessenger = hostname === 'messenger.com' || hostname.endsWith('.messenger.com');
      if (!isMessenger && !hostname.endsWith('facebook.com')) return null;
      // messenger.com uses /t/<id>; facebook.com always prefixes /messages.
      if (!isMessenger && !pathname.startsWith('/messages/')) return null;
      return pathname.match(THREAD_PATH)?.[1] ?? null;
    } catch {
      return null;
    }
  }

  // Accepts a pasted conversation link or a bare numeric ID.
  function parseThreadInput(text) {
    const trimmed = String(text ?? '').trim();
    return RAW_ID.test(trimmed) ? trimmed : parseThreadId(trimmed);
  }

  function cleanName(name) {
    const text = String(name ?? '').trim().replace(/\s+/g, ' ');
    return text && text.length <= MAX_NAME_LENGTH ? text : null;
  }

  // Lowercase and strip Vietnamese diacritics so "nguyen" matches "Nguyễn".
  const foldText = (text) =>
    String(text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();

  function shouldHideThread(mode, selectedIds, id) {
    if (mode === 'hideAll') return true;
    if (mode === 'block') return selectedIds.includes(id);
    if (mode === 'allow') return !selectedIds.includes(id);
    return false;
  }

  // Longest match wins so a short name like "An" doesn't claim the window of "Lan Anh".
  function findLongestName(label, names) {
    const text = String(label ?? '');
    return names.filter((name) => name && text.includes(name)).reduce((best, name) => (name.length > (best?.length ?? 0) ? name : best), null);
  }

  function shouldHideChatWindow(mode, { knownNames, selectedNames }, label) {
    if (mode === 'hideAll') return true;
    if (mode !== 'block' && mode !== 'allow') return false;
    const match = findLongestName(label, knownNames);
    const isSelected = match !== null && selectedNames.includes(match);
    return mode === 'block' ? isSelected : !isSelected;
  }

  function sanitizePeople(stored) {
    const source = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    const entries = Object.entries(source)
      .filter(([id, person]) => RAW_ID.test(id) && person && typeof person.name === 'string')
      .map(([id, person]) => [id, Object.freeze({ name: cleanName(person.name) ?? '' })]);
    return Object.freeze(Object.fromEntries(entries));
  }

  function sanitizeIds(stored) {
    const ids = Array.isArray(stored) ? stored.filter((id) => typeof id === 'string' && RAW_ID.test(id)) : [];
    return Object.freeze([...new Set(ids)]);
  }

  // One entry per ID, keeping the first non-empty name, so a scan that sees an ID twice is deterministic.
  function dedupeSeen(seen) {
    const byId = seen.reduce((acc, { id, name }) => {
      const cleaned = cleanName(name) ?? '';
      return acc.has(id) && (acc.get(id) || !cleaned) ? acc : new Map([...acc, [id, cleaned]]);
    }, new Map());
    return [...byId].map(([id, name]) => ({ id, name }));
  }

  // Only reports a change for a new ID or a new name, so harvesting can't write in a loop.
  function mergePeople(existing, seen) {
    const updates = dedupeSeen(seen)
      .filter(({ id, name }) => RAW_ID.test(id) && (!(id in existing) || (name && existing[id].name !== name)));
    if (updates.length === 0) return { changed: false, people: existing };
    const additions = Object.fromEntries(updates.map(({ id, name }) => [id, Object.freeze({ name })]));
    return { changed: true, people: Object.freeze({ ...existing, ...additions }) };
  }

  function namesOf(people, ids) {
    return Object.freeze([...new Set(ids.map((id) => people[id]?.name).filter(Boolean))]);
  }

  function listPeople(people, query, selectedIds) {
    const folded = foldText(query);
    return Object.entries(people)
      .map(([id, { name }]) => ({ id, name, selected: selectedIds.includes(id) }))
      .filter(({ id, name }) => !folded || foldText(name).includes(folded) || id.includes(folded))
      .sort((a, b) => Number(b.selected) - Number(a.selected) || (a.name || '\uffff').localeCompare(b.name || '\uffff', 'vi'));
  }

  const api = Object.freeze({
    parseThreadId,
    parseThreadInput,
    cleanName,
    foldText,
    shouldHideThread,
    findLongestName,
    shouldHideChatWindow,
    sanitizePeople,
    sanitizeIds,
    mergePeople,
    namesOf,
    listPeople,
  });

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.FbFeedOnlyPeopleRules = api;
  }
})(globalThis);
