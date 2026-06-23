let legendClass = null;

// Mapowanie klasy legend-dot na CSS variable używaną w całym projekcie
const legendDotToCssVar = {
    "legend-dot--kolokwium"             : "--color-cat-kolokwium",
    "legend-dot--egzamin"               : "--color-cat-egzamin",
    "legend-dot--innezaliczenie"        : "--color-cat-innezaliczenie",
    "legend-dot--wydarzenieuczelniane"  : "--color-cat-wydarzenieuczelniane",
    "legend-dot--godzinyrektorskie"     : "--color-cat-rektorskie",
    "legend-dot--godzinydziekanskie"    : "--color-cat-dziekanskie",
    "legend-dot--innewydarzenie"        : "--color-cat-innewydarzenie"
}

const colorsDefault = {
    "legend-dot--kolokwium"             : "#f5a623",
    "legend-dot--egzamin"               : "#e74c3c",
    "legend-dot--innezaliczenie"        : "#26c6da",
    "legend-dot--wydarzenieuczelniane"  : "#f06292",
    "legend-dot--godzinyrektorskie"     : "#7cc142",
    "legend-dot--godzinydziekanskie"    : "#276221",
    "legend-dot--innewydarzenie"        : "#26c6da"
}

let colorsFromMemory = null;

// ============================================================
//   IKONY — 30 ikon podzielonych na 7 kategorii (~4-5 na kat.)
// ============================================================
const ICONS = [
    // Kolokwium (5)
    { key: 'pencil',      label: 'Ołówek',       char: '✏️' },
    { key: 'clipboard',   label: 'Notatnik',     char: '📋' },
    { key: 'book',        label: 'Książka',      char: '📚' },
    { key: 'ruler',       label: 'Linijka',      char: '📏' },
    { key: 'calculator',  label: 'Kalkulator',   char: '🧮' },
    // Egzamin (4)
    { key: 'mortarboard', label: 'Dyplom',       char: '🎓' },
    { key: 'scroll',      label: 'Certyfikat',   char: '📜' },
    { key: 'glasses',     label: 'Okulary',      char: '👓' },
    { key: 'hourglass',   label: 'Klepsydra',    char: '⌛' },
    // Inne zaliczenie (4)
    { key: 'check',       label: 'Zaliczone',    char: '✅' },
    { key: 'star',        label: 'Gwiazdka',     char: '⭐' },
    { key: 'medal',       label: 'Medal',        char: '🏅' },
    { key: 'thumbsup',    label: 'Kciuk w górę', char: '👍' },
    // Wydarzenie uczelniane (4)
    { key: 'calendar',    label: 'Kalendarz',    char: '📅' },
    { key: 'building',    label: 'Budynek',      char: '🏛️' },
    { key: 'people',      label: 'Ludzie',       char: '👥' },
    { key: 'flag',        label: 'Flaga',        char: '🚩' },
    // Godziny rektorskie (4)
    { key: 'crown',       label: 'Korona',       char: '👑' },
    { key: 'briefcase',   label: 'Teczka',       char: '💼' },
    { key: 'hammer',      label: 'Młotek',       char: '🔨' },
    { key: 'tie',         label: 'Krawat',       char: '👔' },
    // Godziny dziekańskie (4)
    { key: 'shield',      label: 'Tarcza',       char: '🛡️' },
    { key: 'key',         label: 'Klucz',        char: '🔑' },
    { key: 'lock',        label: 'Kłódka',       char: '🔒' },
    { key: 'badge',       label: 'Odznaka',      char: '🪪' },
    // Inne wydarzenie (5)
    { key: 'bell',        label: 'Dzwonek',      char: '🔔' },
    { key: 'lightbulb',   label: 'Żarówka',      char: '💡' },
    { key: 'info',        label: 'Info',         char: '❕' },
    { key: 'tag',         label: 'Etykieta',     char: '🏷️' },
    { key: 'heart',       label: 'Serce',        char: '❤️' },
];

// Map legendDotClass → icon key (np. { "legend-dot--kolokwium": "pencil" })
let iconsFromMemory = {};

// Mapowanie event-tag class → legend-dot class
const tagClassToLegendClass = {
    'event-tag--kolokwium':             'legend-dot--kolokwium',
    'event-tag--egzamin':               'legend-dot--egzamin',
    'event-tag--innezaliczenie':        'legend-dot--innezaliczenie',
    'event-tag--wydarzenieuczelniane':  'legend-dot--wydarzenieuczelniane',
    'event-tag--rektorskie':            'legend-dot--godzinyrektorskie',
    'event-tag--dziekanskie':           'legend-dot--godzinydziekanskie',
    'event-tag--innewydarzenie':        'legend-dot--innewydarzenie',
};

// ============================================================
//   KOLOR — funkcje
// ============================================================

function colorEdit(legendClassIn) {
    if (colorsFromMemory == null) {
        colorsFromMemory = { ...colorsDefault };
    }
    const hex = document.getElementById("color-input").value;
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
    document.getElementById("color-input").value = colorsFromMemory[legendClassIn];
}

function colorRestoreToDefault(legendClassIn) {
    if (colorsFromMemory == null) {
        colorsFromMemory = { ...colorsDefault };
    }
    const color = colorsDefault[legendClassIn];
    document.getElementById("color-input").value = color;
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
//   IKONY — funkcje
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

// Zwraca emoji ikony dla podanej nazwy kategorii (typeName z API)
function iconGetCharForType(typeName) {
    const typeToLegendClass = {
        "Kolokwium"             : "legend-dot--kolokwium",
        "Egzamin"               : "legend-dot--egzamin",
        "Inne zaliczenie"       : "legend-dot--innezaliczenie",
        "Wydarzenie uczelniane" : "legend-dot--wydarzenieuczelniane",
        "Godziny rektorskie"    : "legend-dot--godzinyrektorskie",
        "Godziny dziekańskie"   : "legend-dot--godzinydziekanskie",
        "Inne wydarzenie"       : "legend-dot--innewydarzenie",
    };
    const legendClass = typeToLegendClass[typeName];
    if (!legendClass) return '';
    const iconKey = iconsFromMemory[legendClass];
    return iconKey ? iconGetChar(iconKey) : '';
}

// Odświeża ikony na kropkach legendy (wywoływane po _renderLegend)
function iconApplyToLegend() {
    document.querySelectorAll('.legend-item').forEach(item => {
        const dot = item.querySelector('.legend-dot');
        if (!dot) return;

        const legendClass = Object.keys(legendDotToCssVar).find(cls => dot.classList.contains(cls));
        if (!legendClass) return;

        // Usuń poprzednią ikonę jeśli była
        const existing = item.querySelector('.legend-dot-icon');
        if (existing) existing.remove();

        const iconKey = iconsFromMemory[legendClass];
        if (iconKey) {
            const iconEl = document.createElement('span');
            iconEl.className = 'legend-dot-icon';
            iconEl.textContent = iconGetChar(iconKey);
            dot.insertAdjacentElement('afterend', iconEl);
        }
    });
}

// Odświeża ikony na tagach eventów w kalendarzu (wywoływane po _renderCalendarEvents)
function iconApplyToTags() {
    document.querySelectorAll('.event-tag').forEach(tag => {
        // Usuń poprzednią ikonę jeśli była
        tag.querySelectorAll('.event-tag-icon').forEach(el => el.remove());

        for (const [tagClass, legendClass] of Object.entries(tagClassToLegendClass)) {
            if (tag.classList.contains(tagClass)) {
                const iconKey = iconsFromMemory[legendClass];
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
//   PICKER — otwieranie/zamykanie
// ============================================================

function openPicker() {
    document.getElementById("calendar-legend").hidden = true;
    document.getElementById("calendar-color").hidden = false;
    // Upewnij się że widoczny jest color-picker-view, nie icon-picker-view
    document.getElementById("color-picker-view").hidden = false;
    document.getElementById("icon-picker-view").hidden = true;

    // Ustaw kolor input na aktualny kolor kategorii i zaktualizuj podgląd
    if (currentColor) {
        colorReset(currentColor);
        _updateColorPreview();
    }
}

function closePicker() {
    document.getElementById("calendar-legend").hidden = false;
    document.getElementById("calendar-color").hidden = true;
    document.getElementById("icon-picker-view").hidden = true;
    document.getElementById("color-picker-view").hidden = false;
}

function openIconPicker() {
    document.getElementById("color-picker-view").hidden = true;
    document.getElementById("icon-picker-view").hidden = false;
    _renderIconPicker();
}

function closeIconPicker() {
    document.getElementById("icon-picker-view").hidden = true;
    document.getElementById("color-picker-view").hidden = false;
}

function _updateColorPreview() {
    const previewDot = document.querySelector(".legend-dot--color");
    if (previewDot) {
        previewDot.style.backgroundColor = document.getElementById("color-input").value;
    }
}

function _renderIconPicker() {
    const grid = document.getElementById("icon-picker-grid");
    if (!grid) return;
    grid.innerHTML = '';

    const currentIconKey = currentColor ? iconsFromMemory[currentColor] : null;

    // Przycisk "Brak"
    const noneBtn = document.createElement('button');
    noneBtn.className = 'icon-picker-btn icon-picker-btn--none' + (!currentIconKey ? ' icon-picker-btn--selected' : '');
    noneBtn.type = 'button';
    noneBtn.innerHTML = '<span class="icon-picker-char">—</span><span class="icon-picker-label">Brak</span>';
    noneBtn.title = 'Brak ikony';
    noneBtn.addEventListener('click', () => {
        iconSave(currentColor, null);
        iconApplyToLegend();
        iconApplyToTags();
        currentColor = null;
        closePicker();
    });
    grid.appendChild(noneBtn);

    // 30 ikon
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
            currentColor = null;
            closePicker();
        });
        grid.appendChild(btn);
    });
}
