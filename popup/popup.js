(async function () {
  const rules = globalThis.FbFeedOnlyRules;
  const keys = Object.keys(rules.DEFAULT_SETTINGS);
  const statusEl = document.getElementById('status');

  function renderStatus(current) {
    const active = Object.values(current).some(Boolean);
    statusEl.textContent = active ? 'Đang bật' : 'Đang tắt';
    statusEl.classList.toggle('on', active);
  }

  async function save(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch (error) {
      console.error('[FB Feed Only] Failed to save setting:', error);
    }
  }

  let settings = rules.DEFAULT_SETTINGS;
  try {
    settings = rules.mergeSettings(await chrome.storage.sync.get(rules.DEFAULT_SETTINGS));
  } catch (error) {
    console.error('[FB Feed Only] Failed to load settings, using defaults:', error);
  }

  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
  renderStatus(settings);

  keys.forEach((key) => {
    const input = document.getElementById(key);
    input.checked = settings[key];
    input.addEventListener('change', () => {
      settings = rules.mergeSettings({ ...settings, [key]: input.checked });
      renderStatus(settings);
      save(key, input.checked);
    });
  });
})();
