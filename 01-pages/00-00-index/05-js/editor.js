/* ============================================================
   TRYB REDAKTORA — logika UI (dodawanie / edycja wydarzeń)
   Wymaga: db.js (Api), auth.js (Auth), index.js (months[])
   ============================================================ */

const PL_MONTHS_GEN = [
  'stycznia','lutego','marca','kwietnia','maja','czerwca',
  'lipca','sierpnia','września','października','listopada','grudnia',
];

const CATEGORIES = [
  { id: 'rektorskie',  label: 'godziny rektorskie' },
  { id: 'dziekanskie', label: 'godziny dziekańskie' },
  { id: 'egzamin',     label: 'egzamin' },
  { id: 'kolokwium',   label: 'kolokwium' },
  { id: 'imprezy',     label: 'imprezy studenckie' },
  { id: 'inne',        label: 'inne ciekawe wydarzenia' },
];

const EXAM_CATS = ['egzamin', 'kolokwium'];
const HOUR_CATS = ['rektorskie', 'dziekanskie'];

let _selectedDate    = null;
let _editingId       = null;
let _selectedKat     = null;

/* ── Podgląd live ───────────────────────────────────────────── */
let _previewEl       = null;

/* ── Popover ────────────────────────────────────────────────── */
let _eventsCache      = {};   // { eventId → eventObject }
let _activePopoverTag = null;
let _popoverEvent     = null; // wydarzenie aktualnie pokazane w dymku

/* ============================================================
   INICJALIZACJA
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    _activateEditorUI();
  }

  document.getElementById('event-form')
    .addEventListener('submit', _handleFormSubmit);

  document.getElementById('btn-odrzuc')
    .addEventListener('click', () => _closeForm(true));

  document.querySelectorAll('.form-kat-btn[data-kat]').forEach(btn => {
    btn.addEventListener('click', () => _selectKategoria(btn.dataset.kat));
  });

  ['form-data', 'form-czas-od', 'form-czas-do'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input',  _updatePreview);
    el.addEventListener('change', _updatePreview);
  });

  // ── Popover: kliknięcie event-taga (capture — przed handlerem komórki) ──
  document.getElementById('calendar-main').addEventListener('click', (e) => {
    const tag = e.target.closest('.event-tag');
    if (!tag || tag.classList.contains('event-tag--preview')) return;
    e.stopPropagation();
    const ev = _eventsCache[tag.dataset.eventId];
    if (!ev) return;
    if (_activePopoverTag === tag) {
      _hidePopover();
    } else {
      _showPopover(ev, tag);
    }
  }, true);

  // Kliknięcie w dymek (poza przyciskami) zamyka go
  document.getElementById('event-popover').addEventListener('click', (e) => {
    if (!e.target.closest('.btn-popover-edit, .btn-popover-cancel')) {
      _hidePopover();
    }
  });

  // Kliknięcie poza dymkiem zamyka go
  document.addEventListener('click', (e) => {
    if (!_activePopoverTag) return;
    if (!e.target.closest('#event-popover')) {
      _hidePopover();
    }
  });

  // Przyciski akcji redaktora w dymku
  document.getElementById('btn-popover-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    if (_popoverEvent) _editFromPopover(_popoverEvent);
  });

  document.getElementById('btn-popover-cancel').addEventListener('click', (e) => {
    e.stopPropagation();
    if (_popoverEvent) _cancelFromPopover(_popoverEvent);
  });
});

document.addEventListener('calendarRendered', async () => {
  const popover = document.getElementById('event-popover');
  if (popover && !popover.hidden) {
    popover.classList.remove('event-popover--closing');
    popover.hidden = true;
    _activePopoverTag = null;
    _popoverEvent = null;
  }

  _removePreview();
  await _renderCalendarEvents();
  _clearCellSelection();
  _selectedDate = null;

  if (Auth.isLoggedIn()) {
    _setupCellClickHandlers();
    document.getElementById('editor-date-title').textContent = 'Wybierz datę ↑';
    document.getElementById('event-list').innerHTML = '';
    _closeForm(false);
  }
});

/* ============================================================
   AKTYWACJA UI REDAKTORA
   ============================================================ */

function _activateEditorUI() {
  document.getElementById('editor-badge').hidden = false;
  document.getElementById('tab-edit').hidden = false;

  const loginBtn = document.getElementById('login-button');
  loginBtn.textContent = 'Wyloguj';
  loginBtn.classList.remove('btn-login');
  loginBtn.classList.add('btn-secondary');
  loginBtn.onclick = (e) => {
    e.preventDefault();
    Auth.logout();
    window.location.reload();
  };

  document.getElementById('tab-edit')
    .addEventListener('click', _enterEditingMode);

  document.getElementById('tab-calendar')
    .addEventListener('click', _leaveEditingMode);
}

function _enterEditingMode() {
  document.getElementById('tab-edit').classList.add('tab-btn--active');
  document.getElementById('tab-calendar').classList.remove('tab-btn--active');
  document.getElementById('calendar-legend').hidden = true;
  document.getElementById('editor-panel').hidden = false;
  _setupCellClickHandlers();
}

function _leaveEditingMode() {
  document.getElementById('tab-calendar').classList.add('tab-btn--active');
  document.getElementById('tab-edit').classList.remove('tab-btn--active');
  document.getElementById('calendar-legend').hidden = false;
  document.getElementById('editor-panel').hidden = true;
  _clearCellSelection();
  _removePreview();
}

/* ============================================================
   RENDEROWANIE ZNACZNIKÓW WYDARZEŃ W KOMÓRKACH
   ============================================================ */

async function _renderCalendarEvents() {
  document.querySelectorAll('#calendar-main .event-tag').forEach(el => el.remove());
  _eventsCache = {};
  _previewEl = null;

  const text = document.getElementById('current-date-paragraph').innerText.trim();
  const parts = text.split(' ');
  if (parts.length < 2) return;

  const monthIdx = months.indexOf(parts[0]) + 1;
  const year     = parseInt(parts[1]);
  if (!monthIdx || isNaN(year)) return;

  const events = await Api.getByMonth(year, monthIdx);

  events.forEach(ev => {
    _eventsCache[ev.id] = ev;

    const cell = document.querySelector(`#calendar-main td[data-date="${ev.data}"]`);
    if (!cell) return;

    const tag = document.createElement('span');
    tag.className = `event-tag event-tag--${ev.kategoria}`;
    tag.textContent = ev.skrot ? `${ev.czasOd} ${ev.skrot}` : ev.czasOd;
    tag.dataset.eventId = ev.id;
    cell.appendChild(tag);
  });
}

/* ============================================================
   OBSŁUGA KLIKNIĘCIA KOMÓRKI (tryb redaktora)
   ============================================================ */

function _setupCellClickHandlers() {
  document.querySelectorAll('#calendar-main td[data-date]').forEach(cell => {
    cell.style.cursor = 'pointer';
    const clone = cell.cloneNode(true);
    cell.parentNode.replaceChild(clone, cell);
    clone.addEventListener('click', () => _selectDate(clone.dataset.date));
  });
}

function _selectDate(dateStr) {
  _clearCellSelection();
  _selectedDate = dateStr;

  const cell = document.querySelector(`#calendar-main td[data-date="${dateStr}"]`);
  if (cell) cell.classList.add('tile-calendar-selected');

  _loadEditorPanel(dateStr);
}

function _clearCellSelection() {
  document.querySelectorAll('#calendar-main .tile-calendar-selected')
    .forEach(c => c.classList.remove('tile-calendar-selected'));
}

/* ============================================================
   PANEL BOCZNY REDAKTORA
   ============================================================ */

/**
 * @param {string}      dateStr   – data "YYYY-MM-DD"
 * @param {object|null} evToEdit  – jeśli podane, otwiera formularz edycji tego wydarzenia
 */
async function _loadEditorPanel(dateStr, evToEdit = null) {
  const [y, m, d] = dateStr.split('-').map(Number);
  document.getElementById('editor-date-title').textContent =
    `${d} ${PL_MONTHS_GEN[m - 1]} ${y}`;

  _closeForm(false);

  const events = await Api.getByDate(dateStr);
  const list   = document.getElementById('event-list');
  list.innerHTML = '';

  events
    .sort((a, b) => a.czasOd.localeCompare(b.czasOd))
    .forEach(ev => {
      const li = document.createElement('li');
      li.className = 'event-list__item';
      li.innerHTML = `
        <span class="event-list__dot event-list__dot--${ev.kategoria}"></span>
        <span>${ev.czasOd}–${ev.czasDo}&nbsp; ${ev.skrot || ''}</span>
      `;
      li.addEventListener('click', () => _openForm(ev));
      list.appendChild(li);
    });

  _openForm(evToEdit);
}

/* ============================================================
   WYBÓR KATEGORII (krok 1 formularza)
   ============================================================ */

function _selectKategoria(kat) {
  _selectedKat = kat;

  document.getElementById('form-kat-grid').hidden = true;

  const banner = document.getElementById('form-kat-banner');
  const label  = CATEGORIES.find(c => c.id === kat)?.label || kat;
  banner.textContent = label.toUpperCase();
  banner.className   = `form-kat-banner form-kat-banner--${kat}`;
  banner.hidden      = false;

  document.getElementById('form-skrot-label').hidden = HOUR_CATS.includes(kat);
  document.getElementById('form-exam-fields').hidden = !EXAM_CATS.includes(kat);
  document.getElementById('btn-confirm').disabled = false;

  _updatePreview();
}

/* ============================================================
   FORMULARZ DODAWANIA / EDYCJI
   ============================================================ */

function _openForm(ev = null) {
  _editingId   = ev ? ev.id       : null;
  _selectedKat = ev ? ev.kategoria : null;

  const grid       = document.getElementById('form-kat-grid');
  const banner     = document.getElementById('form-kat-banner');
  const skrotLbl   = document.getElementById('form-skrot-label');
  const examFlds   = document.getElementById('form-exam-fields');
  const confirmBtn = document.getElementById('btn-confirm');

  if (ev) {
    grid.hidden = true;

    const label = CATEGORIES.find(c => c.id === ev.kategoria)?.label || ev.kategoria;
    banner.textContent = label.toUpperCase();
    banner.className   = `form-kat-banner form-kat-banner--${ev.kategoria}`;
    banner.hidden      = false;

    skrotLbl.hidden  = HOUR_CATS.includes(ev.kategoria);
    examFlds.hidden  = !EXAM_CATS.includes(ev.kategoria);
    confirmBtn.disabled = false;
  } else {
    grid.hidden      = false;
    banner.hidden    = true;
    banner.className = 'form-kat-banner';
    skrotLbl.hidden  = true;
    examFlds.hidden  = true;
    confirmBtn.disabled = true;
  }

  document.getElementById('form-data').value      = ev ? ev.data       : (_selectedDate || '');
  document.getElementById('form-skrot').value     = ev ? (ev.skrot     || '') : '';
  document.getElementById('form-czas-od').value   = ev ? ev.czasOd     : '';
  document.getElementById('form-czas-do').value   = ev ? ev.czasDo     : '';
  document.getElementById('form-szczegoly').value = ev ? ev.szczegoly  : '';
  document.getElementById('form-grupa').value     = ev ? (ev.grupa     || '') : '';
  document.getElementById('form-przedmiot').value = ev ? (ev.przedmiot || '') : '';
  document.getElementById('form-sala').value      = ev ? (ev.sala      || '') : '';

  document.getElementById('event-form').hidden = false;
}

function _closeForm(clearSelection = false) {
  document.getElementById('event-form').hidden = true;
  _editingId   = null;
  _selectedKat = null;
  _removePreview();

  if (clearSelection) {
    _clearCellSelection();
    _selectedDate = null;
  }
}

async function _handleFormSubmit(e) {
  e.preventDefault();
  if (!_selectedKat) return;

  const data = {
    data:      document.getElementById('form-data').value,
    skrot:     document.getElementById('form-skrot').value.trim(),
    kategoria: _selectedKat,
    czasOd:    document.getElementById('form-czas-od').value,
    czasDo:    document.getElementById('form-czas-do').value,
    szczegoly: document.getElementById('form-szczegoly').value.trim(),
  };

  if (EXAM_CATS.includes(_selectedKat)) {
    data.grupa     = document.getElementById('form-grupa').value.trim();
    data.przedmiot = document.getElementById('form-przedmiot').value.trim();
    data.sala      = document.getElementById('form-sala').value.trim();
  }

  if (!data.data) return;
  if (!HOUR_CATS.includes(_selectedKat) && !data.skrot) return;

  const btn = document.getElementById('btn-confirm');
  btn.disabled = true;

  if (_editingId) {
    await Api.update(_editingId, data);
  } else {
    await Api.create(data);
  }

  _removePreview();
  await _renderCalendarEvents();
  await _loadEditorPanel(data.data);
  _selectedDate = data.data;
  btn.disabled = false;
}

/* ============================================================
   PODGLĄD LIVE W KOMÓRCE KALENDARZA
   ============================================================ */

function _removePreview() {
  if (_previewEl) {
    _previewEl.remove();
    _previewEl = null;
  }
}

function _updatePreview() {
  _removePreview();

  if (!_selectedKat || _editingId !== null) return;

  const dateVal = document.getElementById('form-data').value;
  const czasOd  = document.getElementById('form-czas-od').value;

  if (!dateVal) return;

  _clearCellSelection();
  _selectedDate = dateVal;
  const cell = document.querySelector(`#calendar-main td[data-date="${dateVal}"]`);
  if (!cell) return;
  cell.classList.add('tile-calendar-selected');

  if (!czasOd) return;

  const czasDo = document.getElementById('form-czas-do').value;
  const label  = czasDo ? `${czasOd}–${czasDo}` : czasOd;

  _previewEl = document.createElement('span');
  _previewEl.className = `event-tag event-tag--${_selectedKat} event-tag--preview`;
  _previewEl.textContent = label;
  cell.appendChild(_previewEl);
}

/* ============================================================
   DYMEK INFORMACYJNY (popover)
   ============================================================ */

function _showPopover(ev, anchorTag) {
  _activePopoverTag = anchorTag;
  _popoverEvent     = ev;

  const popover  = document.getElementById('event-popover');
  const header   = document.getElementById('popover-header');
  const catLabel = CATEGORIES.find(c => c.id === ev.kategoria)?.label || ev.kategoria;
  header.textContent = catLabel.toUpperCase();
  header.className   = `popover-header popover-header--${ev.kategoria}`;

  const mainEl = document.getElementById('popover-main');
  if (EXAM_CATS.includes(ev.kategoria)) {
    mainEl.textContent = ev.przedmiot || ev.skrot;
  } else if (HOUR_CATS.includes(ev.kategoria)) {
    mainEl.textContent = `${ev.czasOd} – ${ev.czasDo}`;
  } else {
    mainEl.textContent = ev.skrot;
  }

  const timeEl = document.getElementById('popover-time');
  if (!HOUR_CATS.includes(ev.kategoria) && (ev.czasOd || ev.czasDo)) {
    timeEl.textContent = `${ev.czasOd} – ${ev.czasDo}`;
    timeEl.hidden = false;
  } else {
    timeEl.hidden = true;
  }

  const groupEl = document.getElementById('popover-group');
  if (EXAM_CATS.includes(ev.kategoria) && ev.grupa) {
    groupEl.textContent = `Grupa: ${ev.grupa}`;
    groupEl.hidden = false;
  } else {
    groupEl.hidden = true;
  }

  const locationEl = document.getElementById('popover-location');
  if (EXAM_CATS.includes(ev.kategoria) && ev.sala) {
    locationEl.textContent = ev.sala;
    locationEl.hidden = false;
  } else {
    locationEl.hidden = true;
  }

  const detailsEl = document.getElementById('popover-details');
  if (ev.szczegoly) {
    detailsEl.textContent = ev.szczegoly;
    detailsEl.hidden = false;
  } else {
    detailsEl.hidden = true;
  }

  // Przyciski akcji widoczne tylko dla zalogowanego redaktora
  document.getElementById('popover-actions').hidden = !Auth.isLoggedIn();

  popover.hidden = false;
  popover.classList.remove('event-popover--closing');

  // Pozycjonowanie
  const rect = anchorTag.getBoundingClientRect();
  const pw   = 300;

  let left = rect.left;
  let top  = rect.bottom + 6;

  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if (left < 8) left = 8;

  const ph = popover.offsetHeight || 220;
  if (top + ph > window.innerHeight - 8) {
    top = rect.top - ph - 6;
    if (top < 8) top = 8;
  }

  popover.style.left = `${Math.round(left)}px`;
  popover.style.top  = `${Math.round(top)}px`;

  const originX = (rect.left + rect.width / 2) < (left + pw / 2) ? 'left' : 'right';
  popover.style.transformOrigin = `${originX} top`;
}

function _hidePopover() {
  if (!_activePopoverTag) return;
  _activePopoverTag = null;
  _popoverEvent = null;

  const popover = document.getElementById('event-popover');
  popover.classList.add('event-popover--closing');
  popover.addEventListener('animationend', () => {
    popover.hidden = true;
    popover.classList.remove('event-popover--closing');
  }, { once: true });
}

function _hidePopoverImmediate() {
  _activePopoverTag = null;
  _popoverEvent     = null;

  const popover = document.getElementById('event-popover');
  popover.classList.remove('event-popover--closing');
  popover.hidden = true;
}

/* ============================================================
   AKCJE REDAKTORA Z DYMKU
   ============================================================ */

async function _editFromPopover(ev) {
  _hidePopoverImmediate();

  // Aktywuj tryb edycji jeśli panel jest ukryty
  if (document.getElementById('editor-panel').hidden) {
    _enterEditingMode();
  }

  // Zaznacz komórkę (po ewentualnym cloneNode w _enterEditingMode)
  _clearCellSelection();
  _selectedDate = ev.data;
  const cell = document.querySelector(`#calendar-main td[data-date="${ev.data}"]`);
  if (cell) cell.classList.add('tile-calendar-selected');

  await _loadEditorPanel(ev.data, ev);
}

async function _cancelFromPopover(ev) {
  const label = CATEGORIES.find(c => c.id === ev.kategoria)?.label || ev.kategoria;
  const name  = ev.skrot ? `„${ev.skrot}"` : label;

  if (!confirm(`Czy na pewno chcesz odwołać wydarzenie ${name}?`)) return;

  _hidePopoverImmediate();

  await Api.delete(ev.id);
  await _renderCalendarEvents();

  // Odśwież panel jeśli data jest aktualnie zaznaczona
  if (_selectedDate === ev.data) {
    await _loadEditorPanel(ev.data);
  }
}
