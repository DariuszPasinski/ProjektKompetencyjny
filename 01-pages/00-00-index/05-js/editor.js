const PL_MONTHS_GEN = [
  'stycznia','lutego','marca','kwietnia','maja','czerwca',
  'lipca','sierpnia','września','października','listopada','grudnia',
];

let _selectedDate = null;
let _selectedEntry = null;
let _options = null;
let _eventsCache = {};
let _activePopoverTag = null;
let _popoverEvent = null;
let _editingEvent = null;
let _calendarFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  await _loadOptions();

  if (window.APP_IS_LOGGED_IN === true) {
    _activateEditorUI();
  }

  document.getElementById('event-form')
    .addEventListener('submit', _handleFormSubmit);

  document.getElementById('btn-odrzuc')
    .addEventListener('click', () => {
      if (_editingEvent && !confirm('Czy na pewno chcesz porzucić edycję?')) {
        return;
      }

      _closeForm(true);
    });

  document.getElementById('tab-calendar')?.addEventListener('click', async () => {
    await _setCalendarFilter('all');
    _setLegendVisibility(false, false);
  });

  document.getElementById('tab-events')?.addEventListener('click', async () => {
    await _setCalendarFilter('university');
    _setLegendVisibility(true, false);
  });

  document.getElementById('tab-assessments')?.addEventListener('click', async () => {
    await _setCalendarFilter('assessment');
    _setLegendVisibility(false, true);
  });

  document.getElementById('tab-my-events')?.addEventListener('click', async () => {
    await _setCalendarFilter('mine');
  });

  document.getElementById('calendar-main').addEventListener('click', (e) => {
    const tag = e.target.closest('.event-tag');
    if (!tag) return;

    e.stopPropagation();

    const ev = _eventsCache[tag.dataset.eventId];
    if (!ev) return;

    if (_activePopoverTag === tag) {
      _hidePopover();
    } else {
      _showPopover(ev, tag);
    }
  }, true);

  document.getElementById('event-popover').addEventListener('click', async (e) => {
    const reportOpenBtn = e.target.closest('#btn-popover-report');
    const reportSubmitBtn = e.target.closest('#btn-report-submit');
    const reportCancelBtn = e.target.closest('#btn-report-cancel');
    const reportForm = e.target.closest('#popover-report-form');
    const deleteBtn = e.target.closest('#btn-popover-cancel');
    const editBtn = e.target.closest('#btn-popover-edit');

    if (reportOpenBtn) {
      e.preventDefault();
      e.stopPropagation();

      if (_popoverEvent && _popoverEvent.isReported) {
        alert('Ten wpis został już zgłoszony.');
        return;
      }

      document.getElementById('popover-report-form').hidden = false;
      document.getElementById('popover-report-text').focus();
      return;
    }

    if (reportCancelBtn) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('popover-report-form').hidden = true;
      document.getElementById('popover-report-text').value = '';
      return;
    }

    if (reportSubmitBtn) {
      e.preventDefault();
      e.stopPropagation();
      await _submitReport();
      return;
    }

    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      _editEvent();
      return;
    }

    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      await _deleteEvent();
      return;
    }

    if (reportForm) {
      e.stopPropagation();
      return;
    }

    _hidePopover();
  });
});

document.addEventListener('calendarRendered', async () => {
  await _renderSemesterDays();
  await _renderCalendarEvents();

  if (window.APP_IS_LOGGED_IN === true) {
    _setupCellClickHandlers();
    document.getElementById('editor-date-title').textContent = 'Wybierz datę ↑';
    document.getElementById('event-list').innerHTML = '';
    _closeForm(false);
  }
});

async function _setCalendarFilter(filter) {
  _calendarFilter = filter;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('tab-btn--active');
  });

  if (filter === 'all') {
    document.getElementById('tab-calendar')?.classList.add('tab-btn--active');
  }

  if (filter === 'university') {
    document.getElementById('tab-events')?.classList.add('tab-btn--active');
  }

  if (filter === 'assessment') {
    document.getElementById('tab-assessments')?.classList.add('tab-btn--active');
  }

  if (filter === 'mine') {
    document.getElementById('tab-my-events')?.classList.add('tab-btn--active');
  }

  await _renderSemesterDays();
  await _renderCalendarEvents();
}

async function _loadOptions() {
  const res = await fetch('event-options.php');
  _options = await res.json();

  _fillSelect('form-subject-id', _options.subjects);
  _fillSelect('form-lecturer-id', _options.lecturers);
  _fillSelect('form-student-group-id', _options.student_groups);
  _fillTargetGroups(_options.student_groups);
  _renderLegend();
}

function _fillSelect(id, items) {
  const select = document.getElementById(id);
  if (!select) return;

  select.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());

  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.appendChild(option);
  });
}

function _fillTargetGroups(items) {
  const wrapper = document.getElementById('form-target-groups-list');
  if (!wrapper) return;

  wrapper.innerHTML = '';

  items.forEach(item => {
    const label = document.createElement('label');
    label.style.display = 'block';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'target_groups[]';
    checkbox.value = item.id;
    checkbox.className = 'form-target-group-checkbox';

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' ' + item.name));

    wrapper.appendChild(label);
  });
}

function _activateEditorUI() {
  const editorBadge = document.getElementById('editor-badge');
  if (editorBadge) editorBadge.hidden = false;

  const tabEdit = document.getElementById('tab-edit');
  if (tabEdit) {
    tabEdit.hidden = false;
    tabEdit.addEventListener('click', _enterEditingMode);
  }

  const tabCalendar = document.getElementById('tab-calendar');
  if (tabCalendar) {
    tabCalendar.addEventListener('click', _leaveEditingMode);
  }
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
  _closeForm(false);
}

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

function _loadEditorPanel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);

  document.getElementById('editor-date-title').textContent =
    `${d} ${PL_MONTHS_GEN[m - 1]} ${y}`;

  document.getElementById('event-list').innerHTML = '';
  _openForm();
}

function _openForm() {
  _selectedEntry = null;
  _editingEvent = null;

  document.getElementById('event-form').hidden = false;
  document.getElementById('form-data').value = _selectedDate || '';
  document.getElementById('form-czas-od').value = '';
  document.getElementById('form-czas-do').value = '';
  document.getElementById('form-title').value = '';
  document.getElementById('form-location').value = '';
  document.getElementById('form-description').value = '';
  document.getElementById('form-subject-id').value = '';
  document.getElementById('form-lecturer-id').value = '';
  document.getElementById('form-student-group-id').value = '';
  document.querySelectorAll('.form-target-group-checkbox').forEach(cb => cb.checked = false);

  document.getElementById('form-kat-banner').hidden = true;
  document.getElementById('form-title-label').hidden = true;
  document.getElementById('form-assessment-fields').hidden = true;
  document.getElementById('form-location-label').hidden = true;
  document.getElementById('form-target-groups-wrapper').hidden = true;
  document.getElementById('form-data').closest('label').hidden = true;
  document.getElementById('form-czas-od').closest('label').hidden = true;
  document.getElementById('form-description').closest('label').hidden = true;

  document.getElementById('btn-confirm').disabled = true;
  document.getElementById('btn-confirm').textContent = 'ZATWIERDŹ';

  _renderTypeButtons();
}

function _renderTypeButtons() {
  const grid = document.getElementById('form-kat-grid');
  grid.innerHTML = '';

  _options.assessment_types.forEach(type => {
    const btn = _createTypeButton(type, 'assessment');
    grid.appendChild(btn);
  });

  _options.event_types.forEach(type => {
    const btn = _createTypeButton(type, 'university');
    grid.appendChild(btn);
  });

  grid.hidden = false;
}

function _createTypeButton(type, entryType) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'form-kat-btn';
  btn.textContent = type.name;
  btn.dataset.id = type.id;
  btn.dataset.entryType = entryType;

  if (type.color) {
    btn.style.backgroundColor = type.color;
  }

  btn.addEventListener('click', () => _selectEntryType(type, entryType));

  return btn;
}

function _selectEntryType(type, entryType) {
  _selectedEntry = {
    id: type.id,
    name: type.name,
    color: type.color,
    entryType: entryType
  };

  document.getElementById('form-kat-grid').hidden = true;

  const banner = document.getElementById('form-kat-banner');
  banner.textContent = type.name.toUpperCase();
  banner.hidden = false;

  if (type.color) {
    banner.style.backgroundColor = type.color;
  }

  document.getElementById('form-title-label').hidden = entryType !== 'university';
  document.getElementById('form-assessment-fields').hidden = entryType !== 'assessment';
  document.getElementById('form-location-label').hidden = false;
  document.getElementById('form-target-groups-wrapper').hidden = entryType !== 'university';
  document.getElementById('form-data').closest('label').hidden = false;
  document.getElementById('form-czas-od').closest('label').hidden = false;
  document.getElementById('form-description').closest('label').hidden = false;

  document.getElementById('btn-confirm').disabled = false;
}

function _closeForm(clearSelection = false) {
  const form = document.getElementById('event-form');
  if (form) form.hidden = true;

  _selectedEntry = null;
  _editingEvent = null;

  if (clearSelection) {
    _clearCellSelection();
    _selectedDate = null;
  }
}

async function _handleFormSubmit(e) {
  e.preventDefault();

  if (!_selectedEntry) return;

  const date = document.getElementById('form-data').value;
  const timeStart = document.getElementById('form-czas-od').value;
  const timeEnd = document.getElementById('form-czas-do').value;

  if (!date || !timeStart || !timeEnd) {
    alert('Uzupełnij datę oraz godziny.');
    return;
  }

  const formData = new FormData();

  if (_editingEvent) {
    formData.append('id', _editingEvent.rawId);
  }

  formData.append('type', _selectedEntry.entryType);
  formData.append('start_datetime', `${date} ${timeStart}:00`);
  formData.append('end_datetime', `${date} ${timeEnd}:00`);
  formData.append('location', document.getElementById('form-location').value.trim());
  formData.append('description', document.getElementById('form-description').value.trim());

  if (_selectedEntry.entryType === 'assessment') {
    formData.append('assessment_type_id', _selectedEntry.id);
    formData.append('subject_id', document.getElementById('form-subject-id').value);
    formData.append('lecturer_id', document.getElementById('form-lecturer-id').value);
    formData.append('student_group_id', document.getElementById('form-student-group-id').value);

    if (!document.getElementById('form-subject-id').value || !document.getElementById('form-lecturer-id').value) {
      alert('Wybierz przedmiot i prowadzącego.');
      return;
    }
  }

  if (_selectedEntry.entryType === 'university') {
    formData.append('event_type_id', _selectedEntry.id);
    formData.append('title', document.getElementById('form-title').value.trim());

    document.querySelectorAll('.form-target-group-checkbox:checked').forEach(checkbox => {
      formData.append('target_groups[]', checkbox.value);
    });

    if (!document.getElementById('form-title').value.trim()) {
      alert('Wpisz tytuł wydarzenia.');
      return;
    }
  }

  const btn = document.getElementById('btn-confirm');
  btn.disabled = true;

  const url = _editingEvent ? 'event-update.php' : 'event-save.php';

  let result;

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    result = await res.json();
  } catch (e) {
    alert('Nie udało się zapisać wpisu.');
    btn.disabled = false;
    return;
  }

  if (result.success) {
    alert(result.message);
    _closeForm(false);
    await _renderCalendarEvents();
    _loadEditorPanel(date);
  } else {
    alert(result.message || 'Wystąpił błąd.');
  }

  btn.disabled = false;
}

async function _renderCalendarEvents() {
  document.querySelectorAll('#calendar-main .event-tag').forEach(el => el.remove());
  _eventsCache = {};

  const text = document.getElementById('current-date-paragraph').innerText.trim();
  const parts = text.split(' ');
  if (parts.length < 2) return;

  const monthIdx = months.indexOf(parts[0]) + 1;
  const year = parseInt(parts[1]);

  if (!monthIdx || isNaN(year)) return;

  const res = await fetch(`event-list.php?year=${year}&month=${monthIdx}`);
  const events = await res.json();

  events.forEach(ev => {

    if (_calendarFilter === 'university' && ev.source !== 'university') return;
    if (_calendarFilter === 'assessment' && ev.source !== 'assessment') return;

    if (
      _calendarFilter === 'mine' &&
      String(ev.createdByUserId) !== String(window.APP_USER_ID)
    ) {
      return;
    }

    // Sprawdza czy jest w filtrze
    if (currentFilter.length > 0 && !currentFilter.includes(String(ev.studentGroupId))) return;

    _eventsCache[ev.id] = ev;

    const cell = document.querySelector(`#calendar-main td[data-date="${ev.date}"]`);
    if (!cell) return;

    const tag = document.createElement('span');
    tag.className = 'event-tag';
    tag.dataset.eventId = ev.id;

    if (ev.isReported) {
      tag.innerHTML = `
        <span class="event-tag-title">${ev.timeStart} ${ev.title}</span>
        <span class="event-report-flag">⚠</span>
      `;
    } else {
      tag.textContent = `${ev.timeStart} ${ev.title}`;
    }

    if (ev.color) {
      tag.style.backgroundColor = ev.color;
    }

    cell.appendChild(tag);
  });
}

function _showPopover(ev, anchorTag) {
  _activePopoverTag = anchorTag;
  _popoverEvent = ev;

  const popover = document.getElementById('event-popover');
  const header = document.getElementById('popover-header');

  document.querySelectorAll('.popover-lecturer').forEach(el => el.remove());

  header.textContent = ev.typeName.toUpperCase();
  header.className = 'popover-header';

  if (ev.color) {
    header.style.backgroundColor = ev.color;
  }

  document.getElementById('popover-main').textContent = ev.title;

  const timeEl = document.getElementById('popover-time');
  timeEl.textContent = `${ev.timeStart} – ${ev.timeEnd}`;
  timeEl.hidden = false;

  const groupEl = document.getElementById('popover-group');
  if (ev.group) {
    groupEl.textContent = `Grupy: ${ev.group}`;
    groupEl.hidden = false;
  } else {
    groupEl.hidden = true;
  }

  const locationEl = document.getElementById('popover-location');
  if (ev.location) {
    locationEl.textContent = ev.location;
    locationEl.hidden = false;
  } else {
    locationEl.hidden = true;
  }

  if (ev.lecturer) {
    const lecturerDiv = document.createElement('div');
    lecturerDiv.textContent = `Prowadzący: ${ev.lecturer}`;
    lecturerDiv.className = 'popover-lecturer';
    locationEl.insertAdjacentElement('beforebegin', lecturerDiv);
  }

  const detailsEl = document.getElementById('popover-details');
  if (ev.description) {
    detailsEl.textContent = ev.description;
    detailsEl.hidden = false;
  } else {
    detailsEl.hidden = true;
  }

  const reportViewEl = document.getElementById('popover-report-view');

  const canSeeReportText =
    ev.isReported &&
    window.APP_IS_LOGGED_IN === true &&
    (
      window.APP_ROLE_NAME === 'ADMIN' ||
      String(ev.createdByUserId) === String(window.APP_USER_ID)
    );

  if (reportViewEl) {
    if (canSeeReportText && ev.reportText) {
      reportViewEl.innerHTML = `
        <strong>Treść zgłoszenia:</strong>
        <div>${ev.reportText}</div>
      `;
      reportViewEl.hidden = false;
    } else {
      reportViewEl.innerHTML = '';
      reportViewEl.hidden = true;
    }
  }

  document.getElementById('popover-actions').hidden = window.APP_IS_LOGGED_IN !== true;
  document.getElementById('popover-report-form').hidden = true;
  document.getElementById('popover-report-text').value = '';

  const reportBtn = document.getElementById('btn-popover-report');

  if (reportBtn) {
    if (ev.isReported) {
      reportBtn.disabled = true;
      reportBtn.textContent = '⚠ Zgłoszono';
    } else {
      reportBtn.disabled = false;
      reportBtn.textContent = '⚠ Zgłoś';
    }
  }

  popover.hidden = false;
  popover.classList.remove('event-popover--closing');
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

function _renderLegend() {
  const legend = document.getElementById('calendar-legend-items');
  if (!legend || !_options) return;

  legend.innerHTML = '<h3 class="legend-title">LEGENDA</h3>';

  const allTypes = [
    ..._options.assessment_types,
    ..._options.event_types
  ];

  let current = 'event'

  allTypes.forEach(type => {
    if (type.id === 1) {
      if (current === 'assessment') {
        current = 'event';
      } else {
        current = 'assessment'
      }
    }
    const item = document.createElement('div');
    item.classList.add('legend-item');
    item.classList.add(current);

    const dot = document.createElement('span');
    dot.classList.add('legend-dot');
    dot.classList.add('legend-dot--' + type.name.normalize('NFKD').replace(/[^\w]/g, '').replace(/\s/g, "").toLowerCase());
    dot.style.backgroundColor = type.color || '#999';
    dot.addEventListener("click", function () {
      currentColor = dot.classList[1];
      openPicker();
    })

    item.appendChild(dot);
    item.appendChild(document.createTextNode(type.name));

    legend.appendChild(item);
  });
}

function _editEvent() {
  if (!_popoverEvent) return;

  const ev = _popoverEvent;

  if (
    window.APP_ROLE_NAME !== 'ADMIN' &&
    String(ev.createdByUserId) !== String(window.APP_USER_ID)
  ) {
    alert('Nie masz uprawnień do edycji tego wpisu.');
    return;
  }

  _editingEvent = ev;

  _hidePopover();

  if (document.getElementById('editor-panel').hidden) {
    _enterEditingMode();
  }

  _selectedDate = ev.date;

  const typeList = ev.source === 'assessment'
    ? _options.assessment_types
    : _options.event_types;

  const wantedTypeId = ev.source === 'assessment'
    ? String(ev.assessmentTypeId)
    : String(ev.eventTypeId);

  const typeObj = typeList.find(t => String(t.id) === wantedTypeId);

  if (!typeObj) {
    alert('Nie udało się znaleźć typu wpisu.');
    return;
  }

  _selectedEntry = {
    id: typeObj.id,
    name: typeObj.name,
    color: typeObj.color,
    entryType: ev.source
  };

  document.getElementById('event-form').hidden = false;
  document.getElementById('form-kat-grid').hidden = true;

  const banner = document.getElementById('form-kat-banner');
  banner.textContent = typeObj.name.toUpperCase();
  banner.hidden = false;
  if (typeObj.color) banner.style.backgroundColor = typeObj.color;

  document.getElementById('form-title-label').hidden = ev.source !== 'university';
  document.getElementById('form-assessment-fields').hidden = ev.source !== 'assessment';
  document.getElementById('form-location-label').hidden = false;
  document.getElementById('form-target-groups-wrapper').hidden = ev.source !== 'university';
  document.getElementById('form-data').closest('label').hidden = false;
  document.getElementById('form-czas-od').closest('label').hidden = false;
  document.getElementById('form-description').closest('label').hidden = false;

  document.getElementById('form-data').value = ev.date;
  document.getElementById('form-czas-od').value = ev.timeStart;
  document.getElementById('form-czas-do').value = ev.timeEnd;
  document.getElementById('form-location').value = ev.location || '';
  document.getElementById('form-description').value = ev.description || '';
  document.getElementById('form-title').value = ev.source === 'university' ? ev.title : '';

  if (ev.source === 'assessment') {
    document.getElementById('form-subject-id').value = ev.subjectId || '';
    document.getElementById('form-lecturer-id').value = ev.lecturerId || '';
    document.getElementById('form-student-group-id').value = ev.studentGroupId || '';
  }

  if (ev.source === 'university') {
    document.querySelectorAll('.form-target-group-checkbox').forEach(cb => {
      cb.checked = false;
    });

    if (Array.isArray(ev.targetGroupIds)) {
      document.querySelectorAll('.form-target-group-checkbox').forEach(cb => {
        cb.checked = ev.targetGroupIds.map(String).includes(String(cb.value));
      });
    }
  }

  document.getElementById('btn-confirm').disabled = false;
  document.getElementById('btn-confirm').textContent = 'ZAPISZ ZMIANY';
}

async function _submitReport() {
  if (!_popoverEvent) return;

  if (_popoverEvent.isReported) {
    alert('Ten wpis został już zgłoszony.');
    return;
  }

  const text = document.getElementById('popover-report-text').value.trim();

  if (!text) {
    alert('Wpisz treść zgłoszenia.');
    return;
  }

  const formData = new FormData();
  formData.append('source', _popoverEvent.source);
  formData.append('id', _popoverEvent.rawId);
  formData.append('report_text', text);

  const res = await fetch('event-report.php', {
    method: 'POST',
    body: formData
  });

  const result = await res.json();

  if (result.success) {
    alert(result.message);
    document.getElementById('popover-report-form').hidden = true;
    document.getElementById('popover-report-text').value = '';

    _hidePopover();
    await _renderCalendarEvents();
  } else {
    alert(result.message || 'Nie udało się wysłać zgłoszenia.');
  }
}

async function _deleteEvent() {
  if (!_popoverEvent) return;

  if (!confirm("Czy na pewno chcesz usunąć ten wpis?")) {
    return;
  }

  const formData = new FormData();
  formData.append("source", _popoverEvent.source);
  formData.append("id", _popoverEvent.rawId);

  let result;

  try {
    const res = await fetch("event-delete.php", {
      method: "POST",
      body: formData
    });

    result = await res.json();
  } catch (e) {
    alert("Nie udało się usunąć wpisu.");
    return;
  }

  if (result.success) {
    alert(result.message);
    _hidePopover();
    await _renderCalendarEvents();
  } else {
    alert(result.message || "Nie masz uprawnień do usunięcia wpisu.");
  }
}

async function _renderSemesterDays() {
  document.querySelectorAll('#calendar-main .semester-day-info').forEach(el => el.remove());

  const text = document.getElementById('current-date-paragraph').innerText.trim();
  const parts = text.split(' ');
  if (parts.length < 2) return;

  const monthIdx = months.indexOf(parts[0]) + 1;
  const year = parseInt(parts[1]);

  if (!monthIdx || isNaN(year)) return;

  const res = await fetch(`semester-days-list.php?year=${year}&month=${monthIdx}`);
  const days = await res.json();

  const realWeekDays = [
    'Niedziela',
    'Poniedziałek',
    'Wtorek',
    'Środa',
    'Czwartek',
    'Piątek',
    'Sobota'
  ];

  days.forEach(day => {
    const cell = document.querySelector(`#calendar-main td[data-date="${day.date}"]`);
    if (!cell) return;

    const realDayName = realWeekDays[new Date(day.date + 'T00:00:00').getDay()];
    const dbDayName = (day.week_day || '').trim();
    const virtualDay = dbDayName && dbDayName !== realDayName;

    const info = document.createElement('div');
    info.className = 'semester-day-info';

    info.innerHTML = `
      <div>tydzień ${day.week_number}</div>
      ${virtualDay ? `<div>${dbDayName}</div>` : ''}
    `;

    cell.appendChild(info);
  });
}

function _setLegendVisibility(eventHidden, assessmentHidden) {
  document.querySelectorAll('.assessment').forEach(el => el.hidden = assessmentHidden);
  document.querySelectorAll('.event').forEach(el => el.hidden = eventHidden);
}