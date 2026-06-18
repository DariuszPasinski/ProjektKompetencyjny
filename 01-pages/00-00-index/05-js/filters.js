let studentGroups;

document.addEventListener("DOMContentLoaded", async function () {
    const filters = await fetch('get_groups.php');
    studentGroups = await filters.json();

    currentFilter = readFilters();
    _updateFilterBadge();
    createMenu();
});

function openFilter() {
    document.getElementById("filers-section").hidden = false;
    document.getElementById("calendar-main").hidden = true;
    document.getElementById("calendar-legend").hidden = true;
}

function closeFilter() {
    document.getElementById("filers-section").hidden = true;
    document.getElementById("calendar-main").hidden = false;
    document.getElementById("calendar-legend").hidden = false;
}

function readFilters() {
    const filters = localStorage.getItem("filters");
    if (filters) {
        return JSON.parse(filters);
    } else {
        return [];
    }
}

function setFilters(filters) {
    localStorage.setItem("filters", JSON.stringify(filters));
    _updateFilterBadge();
    _renderCalendarEvents();
}

function _updateFilterBadge() {
    const btn = document.getElementById("legend-button");
    if (!btn) return;
    const count = currentFilter.length;
    btn.textContent = count > 0 ? `Filtry (${count})` : "Filtry";
}

function createMenu() {
    while (studentGroups == null) {}
    const filters = document.getElementById("filers-section");

    const filtersTab = document.createElement("div");
    filtersTab.className = "filters-tab";
    filters.appendChild(filtersTab);

    const semestry = [...new Set(studentGroups.map(g => g.semester))].sort((a, b) => a - b);
    createVerticalMenu(filters, filtersTab, semestry);

    return null;
}

function createVerticalMenu(filters, filtersTab, semestry) {
    semestry.forEach(function (semestr) {
        let button = document.createElement("button");
        button.innerHTML = semestr;
        button.classList.add("filters-tablinks-vertical");
        button.addEventListener("click", function(event) {
            openMenuVertical(event, semestr);
        });
        filtersTab.appendChild(button);

        let div = document.createElement("div");
        div.classList.add("filters-tabcontent-vertical");
        div.hidden = true;
        div.id = "sem-" + semestr;
        let title = document.createElement("h3");
        title.innerText = "Semestr " + semestr;
        div.appendChild(title);
        filters.appendChild(div);

        createHorizontalMenu(div, semestr);
    });
    let button = document.createElement("button");
    button.innerHTML = "&#10006;";
    button.classList.add("filters-tablinks-vertical");
    button.addEventListener("click", function(event) {
        closeFilter();
    });
    filtersTab.appendChild(button);

    return null;
}

function getKierunki(semestr) {
    const grupy = studentGroups.filter(g => g.semester === semestr);

    const mapa = {};
    grupy.forEach(g => {
        if (!mapa[g.field_of_study]) {
            mapa[g.field_of_study] = new Set();
        }
        mapa[g.field_of_study].add(g.group_type_id);
    });

    return Object.entries(mapa).map(([kierunek, types]) => ({
        field_of_study: kierunek,
        group_types: [...types]
    }));
}

function createHorizontalMenu(section, semestr) {
    const kierunki = getKierunki(semestr);

    kierunki.forEach(function (kierunek) {
        const button = document.createElement("button");
        button.innerHTML = kierunek.field_of_study;
        button.classList.add("filters-tablinks-horizontal");
        button.addEventListener("click", function (event) {
            openMenuHorizontal(event, section, kierunek.field_of_study);
        });
        section.appendChild(button);

        const div = document.createElement("div");
        div.classList.add("filters-tabcontent-horizontal");
        div.id = section.id + "-" + kierunek.field_of_study;
        div.hidden = true;
        section.appendChild(div);

        const title = document.createElement("h3");
        title.innerText = kierunek.field_of_study;
        div.appendChild(title);

        // console.log(semestr + " " + kierunek.field_of_study + " " + kierunek.group_types.length);
       if (kierunek.group_types.length === 1) {
            // Nie ma podziału na specjalizacje
            let groups = studentGroups.filter(g =>
                g.semester === semestr &&
                g.field_of_study === kierunek.field_of_study
            );
           createGroupButtons(div, groups);
       } else {
            // Jest podział na specjalizację
           let groups = studentGroups.filter(g =>
               g.semester === semestr &&
               g.field_of_study === kierunek.field_of_study &&
               g.group_type_id === 2
           );
           // console.log(groups);
           createGroupButtons(div, groups);

           let electives = studentGroups.filter(g =>
               g.semester === semestr &&
               g.field_of_study === kierunek.field_of_study &&
               g.group_type_id === 3
           );
           // console.log(electives);
           if (electives.length > 0) {
               // console.log(electives.length);
               const specializationTitle = document.createElement("h4");
               specializationTitle.innerText = "Przedmioty obieralne";
               div.appendChild(specializationTitle);
               createGroupButtons(div, electives);
           }

           // electives.forEach(elective => {
           //     let groupButton = document.createElement("button");
           //     groupButton.innerHTML = elective.name;
           //     groupButton.id = "Przedmiot Obieralny:" + elective.id;
           //     groupButton.classList.add("filters-group-button");
           //     groupButton.addEventListener("click", function () {
           //         toggleGroupButton(groupButton.id);
           //     });
           //     div.appendChild(groupButton);
           // })
       }
    });

    return null;
}

function createGroupButtons(div, groups) {
    groups.forEach(group => {
        let groupButton = document.createElement("button");
        groupButton.innerHTML = group.name;
        groupButton.id = "Group:" + group.id;
        groupButton.classList.add("filters-group-button");
        groupButton.addEventListener("click", function () {
            toggleGroupButton(groupButton.id);
        });
        div.appendChild(groupButton);
    })

}

function toggleGroupButton(id) {
    if (document.getElementById(id).classList.contains("filters-group-button")) {
        // Toggle on
        currentFilter.push(id.split(":")[1]);
        currentFilter.sort();
        document.getElementById(id).classList.remove("filters-group-button");
        document.getElementById(id).classList.add("filters-group-button-clicked");
    } else {
        // Toggle off
        const index = currentFilter.indexOf(id.split(":")[1]);
        if (index >= 0) {
            currentFilter.splice(index, 1);
            document.getElementById(id).classList.add("filters-group-button");
            document.getElementById(id).classList.remove("filters-group-button-clicked");
        }
    }
    setFilters(currentFilter);
    return null;
}

function openMenuVertical(event, semestr) {
    const wszystkieTabcontent = document.querySelectorAll(".filters-tabcontent-vertical");
    const wszystkieTablinks = document.querySelectorAll(".filters-tablinks-vertical");

    const cel = document.getElementById("sem-" + semestr);
    const juzOtwarte = !cel.hidden;

    // Zamknij wszystkie
    wszystkieTabcontent.forEach(div => div.hidden = true);
    wszystkieTablinks.forEach(btn => btn.classList.remove("active"));

    // Otwórz kliknięty (jeśli był zamknięty)
    if (!juzOtwarte) {
        cel.hidden = false;
        event.currentTarget.classList.add("active");
    }
}

function openMenuHorizontal(event, section, kierunek) {
    const wszystkieTabcontent = section.querySelectorAll(".filters-tabcontent-horizontal");
    const wszystkieTablinks = section.querySelectorAll(".filters-tablinks-horizontal");

    const cel = document.getElementById(section.id + "-" + kierunek);
    const juzOtwarte = !cel.hidden;

    // Zamknij wszystkie w tej sekcji
    wszystkieTabcontent.forEach(div => div.hidden = true);
    wszystkieTablinks.forEach(btn => btn.classList.remove("active"));

    // Otwórz kliknięty (jeśli był zamknięty)
    if (!juzOtwarte) {
        cel.hidden = false;
        event.currentTarget.classList.add("active");
    }
}
