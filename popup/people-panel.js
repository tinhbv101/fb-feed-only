// People picker shown in the "hide selected" / "show only selected" modes.
(function (root) {
  const peopleRules = root.FbFeedOnlyPeopleRules;
  const storage = root.FbFeedOnlyStorage;
  const $ = (id) => document.getElementById(id);
  const CLEAR_CONFIRM_MS = 3000;

  const TITLES = Object.freeze({ block: 'Người bị ẩn', allow: 'Người được hiện' });

  let state = Object.freeze({ people: Object.freeze({}), selectedIds: Object.freeze([]), query: '', mode: 'block' });
  let clearArmedUntil = 0;

  const setState = (patch) => {
    state = Object.freeze({ ...state, ...patch });
    render();
  };

  function initials(name) {
    const words = name.split(' ').filter(Boolean);
    if (words.length === 0) return '#';
    const first = words[0][0];
    const last = words.length > 1 ? words[words.length - 1][0] : '';
    return `${first}${last}`.toUpperCase();
  }

  // Stable colour per conversation so avatars don't shuffle between renders.
  function avatarColor(id) {
    const hash = [...id].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0, 2166136261);
    const hue = hash % 360;
    return `hsl(${hue} 55% 45%)`;
  }

  function duplicateNames(people) {
    const counts = Object.values(people).reduce((acc, { name }) => ({ ...acc, [name]: (acc[name] ?? 0) + 1 }), {});
    return new Set(Object.keys(counts).filter((name) => counts[name] > 1));
  }

  function renderPerson({ id, name, selected }, duplicates) {
    const item = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'person';

    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.style.background = avatarColor(id);
    avatar.textContent = initials(name);

    const nameEl = document.createElement('span');
    nameEl.className = 'person-name';
    nameEl.textContent = name || 'Chưa rõ tên';
    if (!name || duplicates.has(name)) {
      const idEl = document.createElement('span');
      idEl.className = 'person-id';
      idEl.textContent = `#${id.slice(-4)}`;
      nameEl.append(idEl);
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selected;
    checkbox.addEventListener('change', () => toggle(id, checkbox.checked));

    label.append(avatar, nameEl, checkbox);
    item.append(label);
    return item;
  }

  function emptyMessage(total) {
    if (total === 0) return 'Chưa ghi nhận ai. Mở Messenger trên facebook.com và cuộn danh sách tin nhắn — extension sẽ tự ghi nhớ.';
    return `Không tìm thấy “${state.query.trim()}”.`;
  }

  function render() {
    const total = Object.keys(state.people).length;
    const visible = peopleRules.listPeople(state.people, state.query, state.selectedIds);
    const duplicates = duplicateNames(state.people);

    $('peopleTitle').textContent = TITLES[state.mode] ?? TITLES.block;
    $('peopleCount').textContent = `· ${state.selectedIds.length} đã chọn`;
    $('clearSelection').disabled = state.selectedIds.length === 0;
    $('peopleTotal').textContent = `${total} người đã ghi nhận`;
    $('clearPeople').disabled = total === 0;

    $('peopleList').replaceChildren(...visible.map((person) => renderPerson(person, duplicates)));
    $('peopleEmpty').hidden = visible.length > 0;
    $('peopleEmpty').textContent = emptyMessage(total);
  }

  async function saveSelection(ids) {
    setState({ selectedIds: peopleRules.sanitizeIds(ids) });
    try {
      await storage.saveSelectedIds(ids);
    } catch (error) {
      console.error('[FB Feed Only] Failed to save selection:', error);
    }
  }

  const toggle = (id, checked) =>
    saveSelection(checked ? [...state.selectedIds, id] : state.selectedIds.filter((selectedId) => selectedId !== id));

  function showAddError(message) {
    $('addError').textContent = message;
    $('addError').hidden = !message;
  }

  async function addFromInput(event) {
    event.preventDefault();
    const id = peopleRules.parseThreadInput($('addInput').value);
    if (!id) {
      showAddError('Link không hợp lệ. Dán link dạng facebook.com/messages/t/… hoặc ID số.');
      return;
    }
    showAddError('');
    $('addInput').value = '';
    try {
      // The real name is filled in once the conversation shows up on Facebook.
      setState({ people: await storage.rememberPeople([{ id, name: '' }]) });
      await saveSelection([...state.selectedIds, id]);
    } catch (error) {
      console.error('[FB Feed Only] Failed to add conversation:', error);
      showAddError('Không lưu được, vui lòng thử lại.');
    }
  }

  // Two-step button instead of confirm(), which closes the extension popup in some browsers.
  async function clearPeople() {
    const button = $('clearPeople');
    if (Date.now() > clearArmedUntil) {
      clearArmedUntil = Date.now() + CLEAR_CONFIRM_MS;
      button.textContent = 'Bấm lần nữa để xoá';
      setTimeout(() => (button.textContent = 'Xoá danh sách'), CLEAR_CONFIRM_MS);
      return;
    }
    clearArmedUntil = 0;
    button.textContent = 'Xoá danh sách';
    try {
      await storage.clearPeople();
      setState({ people: Object.freeze({}), selectedIds: Object.freeze([]) });
    } catch (error) {
      console.error('[FB Feed Only] Failed to clear people:', error);
    }
  }

  async function init() {
    $('peopleSearch').addEventListener('input', (event) => setState({ query: event.target.value }));
    $('clearSelection').addEventListener('click', () => saveSelection([]));
    $('addForm').addEventListener('submit', addFromInput);
    $('clearPeople').addEventListener('click', clearPeople);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if ('people' in changes) setState({ people: peopleRules.sanitizePeople(changes.people.newValue) });
      if ('selectedIds' in changes) setState({ selectedIds: peopleRules.sanitizeIds(changes.selectedIds.newValue) });
    });

    try {
      const { people, selectedIds } = await storage.getPeopleState();
      setState({ people, selectedIds });
    } catch (error) {
      console.error('[FB Feed Only] Failed to load people:', error);
      render();
    }
  }

  function setMode(mode) {
    $('people').hidden = mode !== 'block' && mode !== 'allow';
    setState({ mode });
  }

  root.FbFeedOnlyPeoplePanel = Object.freeze({ init, setMode });
})(globalThis);
