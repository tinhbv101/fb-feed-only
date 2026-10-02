// chrome.storage access shared by the content script and the popup.
// Settings sync across devices; the people list stays local because it holds contact names.
(function (root) {
  const rules = root.FbFeedOnlyRules;
  const people = root.FbFeedOnlyPeopleRules;

  async function getSettings() {
    return rules.mergeSettings(await chrome.storage.sync.get(rules.SETTINGS_STORAGE_KEYS));
  }

  async function saveSettings(patch) {
    await chrome.storage.sync.set(patch);
    if ('messageMode' in patch) await chrome.storage.sync.remove('hideMessages');
  }

  async function getPeopleState() {
    const stored = await chrome.storage.local.get(['people', 'selectedIds']);
    return Object.freeze({
      people: people.sanitizePeople(stored.people),
      selectedIds: people.sanitizeIds(stored.selectedIds),
    });
  }

  // Re-read before writing so concurrent Facebook tabs don't drop each other's additions.
  async function rememberPeople(seen) {
    const { people: current } = await getPeopleState();
    const { changed, people: merged } = people.mergePeople(current, seen);
    if (changed) await chrome.storage.local.set({ people: merged });
    return merged;
  }

  async function saveSelectedIds(ids) {
    await chrome.storage.local.set({ selectedIds: people.sanitizeIds(ids) });
  }

  async function clearPeople() {
    await chrome.storage.local.remove(['people', 'selectedIds']);
  }

  root.FbFeedOnlyStorage = Object.freeze({
    getSettings,
    saveSettings,
    getPeopleState,
    rememberPeople,
    saveSelectedIds,
    clearPeople,
  });
})(globalThis);
