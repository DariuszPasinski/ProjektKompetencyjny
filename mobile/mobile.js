const DAY_ABBRS_MOBILE = ['Nd', 'Pon', 'Wt', 'Śr', 'Cz', 'Pt', 'Sob'];

function makeCallendar(month) {
  const calMain = document.getElementById('calendar-main');
  calMain.innerHTML = '';

  const frag = getCallendarDate();
  const monthName = frag[0];
  const year = parseInt(frag[1]);
  const monthIdx = months.indexOf(monthName);

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const list = document.createElement('div');
  list.className = 'day-list';

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIdx, d);

    const iso = year + '-'
      + String(monthIdx + 1).padStart(2, '0') + '-'
      + String(d).padStart(2, '0');

    const abbr = DAY_ABBRS_MOBILE[date.getDay()];

    const card = document.createElement('div');
    card.className = 'day-card';
    card.dataset.date = iso;

    card.innerHTML = `
      <div class="day-card__info">
        <span class="day-card__abbr">${abbr}</span>
        <span class="day-card__num">${d}</span>
      </div>
      <div class="day-card__events"></div>
    `;

    list.appendChild(card);
  }

  calMain.appendChild(list);
  document.dispatchEvent(new CustomEvent('calendarRendered'));
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
    if (_calendarFilter === 'university' && ev.source !== 'university') {
      return;
    }

    if (_calendarFilter === 'assessment' && ev.source !== 'assessment') {
      return;
    }

    if (
      _calendarFilter === 'mine' &&
      String(ev.createdByUserId) !== String(window.APP_USER_ID)
    ) {
      return;
    }

    _eventsCache[ev.id] = ev;

    const card = document.querySelector(`#calendar-main .day-card[data-date="${ev.date}"]`);
    if (!card) return;

    const eventsDiv = card.querySelector('.day-card__events');
    if (!eventsDiv) return;

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

    eventsDiv.appendChild(tag);
  });
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
    const card = document.querySelector(`#calendar-main .day-card[data-date="${day.date}"]`);
    if (!card) return;

    const realDayName = realWeekDays[new Date(day.date + 'T00:00:00').getDay()];
    const dbDayName = (day.week_day || '').trim();
    const virtualDay = dbDayName && dbDayName !== realDayName;

    const info = document.createElement('div');
    info.className = 'semester-day-info';

    info.innerHTML = `
      <div>tydzień ${day.week_number}</div>
      ${virtualDay ? `<div>${dbDayName}</div>` : ''}
    `;

    card.appendChild(info);
  });
}

function _setupCellClickHandlers() {
  document.querySelectorAll('#calendar-main .day-card[data-date]').forEach(card => {
    card.style.cursor = 'pointer';

    const clone = card.cloneNode(true);
    card.parentNode.replaceChild(clone, card);

    clone.addEventListener('click', () => _selectDate(clone.dataset.date));
  });
}

function _selectDate(dateStr) {
  _clearCellSelection();
  _selectedDate = dateStr;

  const card = document.querySelector(`#calendar-main .day-card[data-date="${dateStr}"]`);
  if (card) card.classList.add('tile-calendar-selected');

  _loadEditorPanel(dateStr);
}

/* Backdrop + swipe */

document.addEventListener('DOMContentLoaded', () => {
  const editorPanel = document.getElementById('editor-panel');
  const popover = document.getElementById('event-popover');
  const backdrop = document.getElementById('mobile-sheet-backdrop');

  if (!editorPanel || !popover || !backdrop) return;

  let _backdropHideTimer = null;

  function _updateBackdrop() {
    const anyOpen = !editorPanel.hidden || !popover.hidden;

    if (anyOpen) {
      clearTimeout(_backdropHideTimer);
      backdrop.hidden = false;

      requestAnimationFrame(() =>
        requestAnimationFrame(() => backdrop.classList.add('is-visible'))
      );
    } else {
      backdrop.classList.remove('is-visible');
      _backdropHideTimer = setTimeout(() => {
        backdrop.hidden = true;
      }, 240);
    }
  }

  new MutationObserver(_updateBackdrop)
    .observe(editorPanel, { attributes: true, attributeFilter: ['hidden'] });

  new MutationObserver(_updateBackdrop)
    .observe(popover, { attributes: true, attributeFilter: ['hidden'] });

  backdrop.addEventListener('click', () => {
    if (!popover.hidden && typeof _hidePopover === 'function') {
      _hidePopover();
      return;
    }

    if (!editorPanel.hidden && typeof _leaveEditingMode === 'function') {
      _leaveEditingMode();
    }
  });

  _setupSwipeToClose(
    editorPanel.querySelector('.mobile-sheet-handle'),
    editorPanel,
    () => {
      if (typeof _leaveEditingMode === 'function') _leaveEditingMode();
    }
  );
});

document.addEventListener('DOMContentLoaded', () => {
  const popover = document.getElementById('event-popover');
  if (!popover) return;

  if (!popover.querySelector('.mobile-sheet-handle')) {
    const handle = document.createElement('div');
    handle.className = 'mobile-sheet-handle';
    popover.insertBefore(handle, popover.firstChild);

    _setupSwipeToClose(handle, popover, () => {
      if (typeof _hidePopover === 'function') _hidePopover();
    });
  }
});

function _setupSwipeToClose(handle, panel, closeFn) {
  if (!handle || !panel) return;

  let startY = 0;
  let currentDelta = 0;
  let dragging = false;

  function _onStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    startY = touch.clientY;
    currentDelta = 0;
    dragging = true;
    panel.style.transition = 'none';
  }

  function _onMove(e) {
    if (!dragging) return;

    const touch = e.touches ? e.touches[0] : e;
    const delta = touch.clientY - startY;

    if (delta < 0) {
      currentDelta = 0;
      panel.style.transform = '';
      return;
    }

    const eased = delta > 200 ? 200 + (delta - 200) * 0.35 : delta;
    currentDelta = delta;
    panel.style.transform = `translateY(${eased}px)`;

    if (e.cancelable) e.preventDefault();
  }

  function _onEnd() {
    if (!dragging) return;

    dragging = false;
    panel.style.transition = '';

    if (currentDelta > 80) {
      closeFn();
      setTimeout(() => {
        panel.style.transform = '';
      }, 280);
    } else {
      panel.style.transform = '';
    }

    currentDelta = 0;
  }

  handle.addEventListener('touchstart', _onStart, { passive: true });
  handle.addEventListener('touchmove', _onMove, { passive: false });
  handle.addEventListener('touchend', _onEnd);
  handle.addEventListener('touchcancel', _onEnd);

  handle.addEventListener('mousedown', (e) => {
    _onStart(e);

    const mm = (ev) => _onMove(ev);
    const mu = () => {
      _onEnd();
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };

    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}