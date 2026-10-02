// "Hide selected" / "show only selected" modes: tag individual conversation rows and chat windows.
(function (root) {
  const peopleRules = root.FbFeedOnlyPeopleRules;
  const dom = root.FbFeedOnlyDom;
  const PERSON_ATTR = 'data-fbfo-person-hidden';

  // Returns the rows seen so the caller can remember them; runs even inside hide-all tags.
  function applyToRows(rootEl, state) {
    const rows = dom.findThreadRows(rootEl);
    if (state.filtering) {
      rows.forEach(({ link, row }) => {
        const hidden = peopleRules.shouldHideThread(state.mode, state.selectedIds, row.id);
        dom.rowContainer(link).toggleAttribute(PERSON_ATTR, hidden);
      });
    }
    return rows.map(({ row }) => row);
  }

  function applyToWindows(state) {
    if (!state.filtering) return;
    dom.findChatWindows().forEach(({ element, label }) => {
      element.toggleAttribute(PERSON_ATTR, peopleRules.shouldHideChatWindow(state.mode, state, label));
    });
  }

  function clear() {
    document.querySelectorAll(`[${PERSON_ATTR}]`).forEach((el) => el.removeAttribute(PERSON_ATTR));
  }

  root.FbFeedOnlyPersonFilter = Object.freeze({ applyToRows, applyToWindows, clear });
})(globalThis);
