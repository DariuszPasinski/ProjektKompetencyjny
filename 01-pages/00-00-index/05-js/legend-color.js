let legendClass = null;

const legendDotToCssVar = {
    "legend-dot--kolokwium"             : "--color-cat-kolokwium",
    "legend-dot--egzamin"               : "--color-cat-egzamin",
    "legend-dot--innezaliczenie"        : "--color-cat-innezaliczenie",
    "legend-dot--wydarzenieuczelniane"  : "--color-cat-wydarzenieuczelniane",
    "legend-dot--rektorskie"            : "--color-cat-rektorskie",
    "legend-dot--dziekanskie"           : "--color-cat-dziekanskie",
    "legend-dot--innewydarzenie"        : "--color-cat-innewydarzenie"
}

const colorsDefault = {
    "legend-dot--kolokwium"             : "#f5a623",
    "legend-dot--egzamin"               : "#e74c3c",
    "legend-dot--innezaliczenie"        : "#26c6da",
    "legend-dot--wydarzenieuczelniane"  : "#f06292",
    "legend-dot--rektorskie"            : "#7cc142",
    "legend-dot--dziekanskie"           : "#276221",
    "legend-dot--innewydarzenie"        : "#26c6da"
}

let colorsFromMemory = null;

const ICONS = [
    { key: 'pencil',      label: 'Ołówek',       char: '✏️' },
    { key: 'clipboard',   label: 'Notatnik',     char: '📋' },
    { key: 'book',        label: 'Książka',      char: '📚' },
    { key: 'ruler',       label: 'Linijka',      char: '📏' },
    { key: 'calculator',  label: 'Kalkulator',   char: '🧮' },
    { key: 'mortarboard', label: 'Dyplom',       char: '🎓' },
    { key: 'scroll',      label: 'Certyfikat',   char: '📜' },
    { key: 'glasses',     label: 'Okulary',      char: '👓' },
    { key: 'hourglass',   label: 'Klepsydra',    char: '⌛' },
    { key: 'check',       label: 'Zaliczone',    char: '✅' },
    { key: 'star',        label: 'Gwiazdka',     char: '⭐' },
    { key: 'medal',       label: 'Medal',        char: '🏅' },
    { key: 'thumbsup',    label: 'Kciuk w górę', char: '👍' },
    { key: 'calendar',    label: 'Kalendarz',    char: '📅' },
    { key: 'building',    label: 'Budynek',      char: '🏛️' },
    { key: 'people',      label: 'Ludzie',       char: '👥' },
    { key: 'flag',        label: 'Flaga',        char: '🚩' },
    { key: 'crown',       label: 'Korona',       char: '👑' },
    { key: 'briefcase',   label: 'Teczka',       char: '💼' },
    { key: 'hammer',      label: 'Młotek',       char: '🔨' },
    { key: 'tie',         label: 'Krawat',       char: '👔' },
    { key: 'shield',      label: 'Tarcza',       char: '🛡️' },
    { key: 'key',         label: 'Klucz',        char: '🔑' },
    { key: 'lock',        label: 'Kłódka',       char: '🔒' },
    { key: 'badge',       label: 'Odznaka',      char: '🪪' },
    { key: 'bell',        label: 'Dzwonek',      char: '🔔' },
    { key: 'lightbulb',   label: 'Żarówka',      char: '💡' },
    { key: 'info',        label: 'Info',         char: '❕' },
    { key: 'tag',         label: 'Etykieta',     char: '🏷️' },
    { key: 'heart',       label: 'Serce',        char: '❤️' },
];

let iconsFromMemory = {};

const tagClassToLegendClass = {
    'event-tag--kolokwium':             'legend-dot--kolokwium',
    'event-tag--egzamin':               'legend-dot--egzamin',
    'event-tag--innezaliczenie':        'legend-dot--innezaliczenie',
    'event-tag--wydarzenieuczelniane':  'legend-dot--wydarzenieuczelniane',
    'event-tag--rektorskie':            'legend-dot--rektorskie',
    'event-tag--dziekanskie':           'legend-dot--dziekanskie',
    'event-tag--innewydarzenie':        'legend-dot--innewydarzenie',
};

// ============================================================
//   HELPER — active color input (desktop or mobile)
// ============================================================

function _colorInputEl() {
    const mobilePanel = document.getElementById("mobile-color-panel");
    if (mobilePanel && !mobilePanel.hidden) {
        return document.getElementById("mobile-color-input");
    }
    return document.getElementById("color-input");
}

// ============================================================
//   KOLOR
// ============================================================

function colorEdit(legendClassIn) {
    if (colorsFromMemory == null) {
        colorsFromMemory = { ...colorsDefault };
    }
    const el = _colorInputEl();
    if (!el) return;
    const hex = el.value;
    colorsFromMemory[legendClassIn] = hex;
    localStorage.setItem("colors", JSON.stringify(colorsFromMemory));
    colorSet(legendClassIn, hex);
}

function colorRead() {
    const stored = localStorage.getItem("colors");
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            colorsFromMemory = (typeof parsed === "string") ? JSON.parse(parsed) : parsed;
        } catch (e) {
            colorsFromMemory = { ...colorsDefault };
        }
    } else {
        colorsFromMemory = { ...colorsDefault };
    }

    Object.keys(colorsFromMemory).forEach(function(key) {
        colorSet(key, colorsFromMemory[key]);
    });
}

function colorReset(legendClassIn) {
    if (colorsFromMemory == null) {
        colorsFromMemory = { ...colorsDefault };
    }
    const el = _colorInputEl();
    if (el) el.value = colorsFromMemory[legendClassIn] || colorsDefault[legendClassIn] || '#000000';
}

function colorRestoreToDefault(legendClassIn) {
    if (colorsFromMemory == null) {
        colorsFromMemory = { ...colorsDefault };
    }
    const color = colorsDefault[legendClassIn];
    const el = _colorInputEl();
    if (el) el.value = color;
    colorEdit(legendClassIn);
}

function colorSet(legendDotClass, color) {
    const cssVar = legendDotToCssVar[legendDotClass];
    if (!cssVar) return;

    const cleanColor = color.length === 9 && color.endsWith("FF")
        ? color.slice(0, 7)
        : color;

    document.documentElement.style.setProperty(cssVar, cleanColor);
}

// ============================================================
//   IKONY
// ============================================================

function iconRead() {
    const stored = localStorage.getItem("icons");
    if (stored) {
        try {
            iconsFromMemory = JSON.parse(stored) || {};
        } catch(e) {
            iconsFromMemory = {};
        }
    } else {
        iconsFromMemory = {};
    }
}

function iconSave(legendDotClass, iconKey) {
    if (iconKey === null || iconKey === undefined || iconKey === '') {
        delete iconsFromMemory[legendDotClass];
    } else {
        iconsFromMemory[legendDotClass] = iconKey;
    }
    localStorage.setItem("icons", JSON.stringify(iconsFromMemory));
}

function iconGetChar(iconKey) {
    const icon = ICONS.find(i => i.key === iconKey);
    return icon ? icon.char : '';
}

function iconGetCharForType(typeName) {
    const typeToLegendClass = {
        "Kolokwium"             : "legend-dot--kolokwium",
        "Egzamin"               : "legend-dot--egzamin",
        "Inne zaliczenie"       : "legend-dot--innezaliczenie",
        "Wydarzenie uczelniane" : "legend-dot--wydarzenieuczelniane",
        "Godziny rektorskie"    : "legend-dot--rektorskie",
        "Godziny dziekańskie"   : "legend-dot--dziekanskie",
        "Inne wydarzenie"       : "legend-dot--innewydarzenie",
    };
    const lc = typeToLegendClass[typeName];
    if (!lc) return '';
    const iconKey = iconsFromMemory[lc];
    return iconKey ? iconGetChar(iconKey) : '';
}

function iconApplyToLegend() {
    document.querySelectorAll('.legend-item').forEach(item => {
        const dot = item.querySelector('.legend-dot');
        if (!dot) return;

        const lc = Object.keys(legendDotToCssVar).find(cls => dot.classList.contains(cls));
        if (!lc) return;

        const existing = item.querySelector('.legend-dot-icon');
        if (existing) existing.remove();

        const iconKey = iconsFromMemory[lc];
        if (iconKey) {
            const iconEl = document.createElement('span');
            iconEl.className = 'legend-dot-icon';
            iconEl.textContent = iconGetChar(iconKey);
            dot.insertAdjacentElement('afterend', iconEl);
        }
    });
}

function iconApplyToTags() {
    document.querySelectorAll('.event-tag').forEach(tag => {
        tag.querySelectorAll('.event-tag-icon').forEach(el => el.remove());

        for (const [tagClass, lc] of Object.entries(tagClassToLegendClass)) {
            if (tag.classList.contains(tagClass)) {
                const iconKey = iconsFromMemory[lc];
                if (iconKey) {
                    const char = iconGetChar(iconKey);
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'event-tag-icon';
                    iconSpan.textContent = char;
                    tag.prepend(iconSpan);
                }
                break;
            }
        }
    });
}

// ============================================================
//   ICON BUTTON STATE
// ============================================================

function _updateIconButtonState() {
    const hasIcon = !!(currentColor && iconsFromMemory[currentColor]);

    ['color-icon', 'mobile-color-icon'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.textContent = hasIcon ? '✎ Edytuj ikonę' : '+ Dodaj ikonę';
    });

    ['color-remove-icon', 'mobile-color-remove-icon'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.hidden = !hasIcon;
    });
}

// ============================================================
//   PICKER — otwieranie/zamykanie (desktop + mobile)
// ============================================================

function openPicker() {
    const mobilePanel = document.getElementById("mobile-color-panel");
    if (mobilePanel) {
        mobilePanel.hidden = false;
        document.getElementById("mobile-color-picker-view").hidden = false;
        document.getElementById("mobile-icon-picker-view").hidden = true;
    } else {
        document.getElementById("calendar-legend").hidden = true;
        document.getElementById("calendar-color").hidden = false;
        document.getElementById("color-picker-view").hidden = false;
        document.getElementById("icon-picker-view").hidden = true;
    }

    if (currentColor) {
        colorReset(currentColor);
        _updateColorPreview();
    }

    _updateIconButtonState();
}

function closePicker() {
    const mobilePanel = document.getElementById("mobile-color-panel");
    if (mobilePanel) {
        mobilePanel.hidden = true;
    } else {
        document.getElementById("calendar-legend").hidden = false;
        document.getElementById("calendar-color").hidden = true;
        document.getElementById("icon-picker-view").hidden = true;
        document.getElementById("color-picker-view").hidden = false;
    }
}

function openIconPicker() {
    const mobilePanel = document.getElementById("mobile-color-panel");
    if (mobilePanel && !mobilePanel.hidden) {
        document.getElementById("mobile-color-picker-view").hidden = true;
        document.getElementById("mobile-icon-picker-view").hidden = false;
    } else {
        document.getElementById("color-picker-view").hidden = true;
        document.getElementById("icon-picker-view").hidden = false;
    }
    _renderIconPicker();
}

function closeIconPicker() {
    const mobilePanel = document.getElementById("mobile-color-panel");
    if (mobilePanel && !mobilePanel.hidden) {
        document.getElementById("mobile-icon-picker-view").hidden = true;
        document.getElementById("mobile-color-picker-view").hidden = false;
    } else {
        document.getElementById("icon-picker-view").hidden = true;
        document.getElementById("color-picker-view").hidden = false;
    }
}

function _updateColorPreview() {
    const mobilePanel = document.getElementById("mobile-color-panel");
    let previewDot;
    if (mobilePanel && !mobilePanel.hidden) {
        previewDot = mobilePanel.querySelector(".legend-dot--color");
    } else {
        const desktopPanel = document.getElementById("color-picker-view");
        previewDot = desktopPanel ? desktopPanel.querySelector(".legend-dot--color") : null;
    }
    if (previewDot) {
        const el = _colorInputEl();
        if (el) previewDot.style.backgroundColor = el.value;
    }
}

function _renderIconPicker() {
    const mobilePanel = document.getElementById("mobile-color-panel");
    const isMobile = mobilePanel && !mobilePanel.hidden;
    const gridId = isMobile ? "mobile-icon-picker-grid" : "icon-picker-grid";
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';

    const currentIconKey = currentColor ? iconsFromMemory[currentColor] : null;

    ICONS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-picker-btn' + (currentIconKey === icon.key ? ' icon-picker-btn--selected' : '');
        btn.title = icon.label;
        btn.innerHTML = `<span class="icon-picker-char">${icon.char}</span><span class="icon-picker-label">${icon.label}</span>`;
        btn.addEventListener('click', () => {
            iconSave(currentColor, icon.key);
            iconApplyToLegend();
            iconApplyToTags();
            closeIconPicker();
            _updateIconButtonState();
        });
        grid.appendChild(btn);
    });
}
