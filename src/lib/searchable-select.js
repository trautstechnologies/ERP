// Keep real selects as the source of truth for validation, FormData and change handlers.
export function installSearchableSelects() {
  let active;
  const close = (restoreFocus = false) => {
    if (!active) return;
    const { select, popup, observer } = active;
    active = null;
    observer.disconnect();
    popup.remove();
    select.setAttribute('aria-expanded', 'false');
    select.removeAttribute('aria-controls');
    if (restoreFocus && select.isConnected) select.focus();
  };
  const open = (select, query = '') => {
    if (select.disabled) return;
    close();
    const popup = document.createElement('div');
    popup.className = 'select-search-popup';
    const search = document.createElement('input');
    search.type = 'search';
    search.autocomplete = 'off';
    search.placeholder = 'Type to search…';
    search.setAttribute('aria-label', `Search ${select.getAttribute('aria-label')} options`);
    search.setAttribute('role', 'combobox');
    search.setAttribute('aria-autocomplete', 'list');
    search.setAttribute('aria-expanded', 'true');
    const list = document.createElement('div');
    list.id = `${select.id}-choices`;
    list.className = 'select-search-options';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', `${select.getAttribute('aria-label')} options`);
    search.setAttribute('aria-controls', list.id);
    const empty = document.createElement('p');
    empty.className = 'select-search-empty';
    empty.textContent = 'No matching options';
    empty.setAttribute('role', 'status');
    popup.append(search, list, empty);
    select.parentElement.append(popup);
    select.setAttribute('aria-expanded', 'true');
    select.setAttribute('aria-controls', list.id);
    let results = [], highlighted = -1;
    const highlight = index => {
      highlighted = index;
      [...list.children].forEach((node, i) => node.classList.toggle('highlighted', i === index));
      const node = list.children[index];
      if (node) {
        search.setAttribute('aria-activedescendant', node.id);
        node.scrollIntoView({ block: 'nearest' });
      } else search.removeAttribute('aria-activedescendant');
    };
    const choose = index => {
      if (!results[index] || select.disabled) return;
      select.selectedIndex = results[index].index;
      close(true);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const position = () => {
      const rect = select.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upwards = below < 180 && above > below;
      popup.style.width = `${Math.min(rect.width, window.innerWidth - 16)}px`;
      popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
      list.style.maxHeight = `${Math.max(44, Math.min(190, (upwards ? above : below) - 70))}px`;
      popup.style.top = `${upwards ? Math.max(8, rect.top - popup.offsetHeight - 4) : rect.bottom + 4}px`;
    };
    const render = () => {
      const term = search.value.trim().toLocaleLowerCase();
      results = [...select.options].filter(option => !option.disabled && !option.hidden && !option.closest('optgroup')?.disabled && option.textContent.toLocaleLowerCase().includes(term));
      list.replaceChildren(...results.map((option, index) => {
        const node = document.createElement('div');
        node.id = `${list.id}-${index}`;
        node.className = 'select-search-option';
        node.setAttribute('role', 'option');
        node.setAttribute('aria-selected', String(option.selected));
        node.textContent = option.textContent;
        node.addEventListener('pointerdown', event => event.preventDefault());
        node.addEventListener('click', () => choose(index));
        return node;
      }));
      empty.hidden = results.length > 0;
      highlight(results.length ? Math.max(0, results.findIndex(option => option.selected)) : -1);
      position();
    };
    const observer = new MutationObserver(() => {
      if (!select.isConnected || select.disabled) close();
    });
    active = { select, popup, observer };
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
    search.value = query;
    search.addEventListener('input', render);
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
      if (event.key === 'Tab') close();
      if (event.key === 'Enter') { event.preventDefault(); choose(highlighted); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (results.length) highlight((highlighted + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
      }
    });
    render();
    search.focus();
  };
  document.addEventListener('pointerdown', event => {
    const select = event.target.closest('select[data-searchable]');
    if (select && !select.disabled) { event.preventDefault(); open(select); }
    else if (active && !active.popup.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    const select = event.target.closest('select[data-searchable]');
    if (!select || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); open(select);
    } else if (event.key.length === 1) {
      event.preventDefault(); open(select, event.key);
    }
  });
  document.addEventListener('focusin', event => {
    if (active && event.target !== active.select && !active.popup.contains(event.target)) close();
  });
  window.addEventListener('hashchange', () => close());
  window.addEventListener('resize', () => close());
  document.addEventListener('scroll', event => {
    if (active && !active.popup.contains(event.target)) close();
  }, true);
}
