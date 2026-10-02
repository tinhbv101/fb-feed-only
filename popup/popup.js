(async function () {
  const rules = globalThis.FbFeedOnlyRules;
  const storage = globalThis.FbFeedOnlyStorage;
  const panel = globalThis.FbFeedOnlyPeoplePanel;
  const statusEl = document.getElementById('status');
  const leftNavInput = document.getElementById('hideLeftNav');
  const modeInputs = [...document.querySelectorAll('input[name="messageMode"]')];

  let settings = rules.DEFAULT_SETTINGS;

  function render() {
    const active = rules.isActive(settings);
    statusEl.textContent = active ? 'Đang bật' : 'Đang tắt';
    statusEl.classList.toggle('on', active);
    modeInputs.forEach((input) => (input.checked = input.value === settings.messageMode));
    leftNavInput.checked = settings.hideLeftNav;
    panel.setMode(settings.messageMode);
  }

  async function update(patch) {
    settings = rules.mergeSettings({ ...settings, ...patch });
    render();
    try {
      await storage.saveSettings(patch);
    } catch (error) {
      console.error('[FB Feed Only] Failed to save setting:', error);
    }
  }

  try {
    settings = await storage.getSettings();
  } catch (error) {
    console.error('[FB Feed Only] Failed to load settings, using defaults:', error);
  }

  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
  modeInputs.forEach((input) => input.addEventListener('change', () => update({ messageMode: input.value })));
  leftNavInput.addEventListener('change', () => update({ hideLeftNav: leftNavInput.checked }));

  await panel.init();
  render();
})();
