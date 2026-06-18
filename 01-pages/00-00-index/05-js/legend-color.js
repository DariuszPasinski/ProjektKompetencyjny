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

// const events = await fetch('get_events_types.php');
// const assessments = await fetch('get_assessments_types.php');
// legend = [...await events.json(), ...await assessments.json()];

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

// Zapisz nowy kolor do localStorage i od razu zastosuj
function colorEdit(legendClassIn) {
    if (colorsFromMemory == null) {
        colorsFromMemory = { ...colorsDefault };
    }
    const hex = document.getElementById("color-input").value;
    colorsFromMemory[legendClassIn] = hex;
    localStorage.setItem("colors", JSON.stringify(colorsFromMemory));
    colorSet(legendClassIn, hex);
}

// Wczytaj kolory z localStorage i zastosuj przez CSS variables
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

// Ustaw kolor przez nadpisanie CSS variable na :root
// Działa dla WSZYSTKICH elementów — obecnych i przyszłych (eventy z bazy, tagi, itp.)
function colorSet(legendDotClass, color) {
    const cssVar = legendDotToCssVar[legendDotClass];
    console.log(cssVar);
    if (!cssVar) return;

    // Usuń ewentualne "FF" na końcu (format z poprzedniej wersji)
    const cleanColor = color.length === 9 && color.endsWith("FF")
        ? color.slice(0, 7)
        : color;

    document.documentElement.style.setProperty(cssVar, cleanColor);
}

function openPicker() {
    document.getElementById("calendar-legend").hidden = true;
    document.getElementById("calendar-color").hidden = false;
}

function closePicker() {
    document.getElementById("calendar-legend").hidden = false;
    document.getElementById("calendar-color").hidden = true;
}