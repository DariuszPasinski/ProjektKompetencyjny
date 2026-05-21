const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

const tableHTML = [
    "<tr><th>Pon</th><th>Wt</th><th>Śr</th><th>Czw</th><th>Pt</th><th>Sob</th><th>Nd</th></tr>"
]

function start() {
    let month = "", year = "";
    let d = getCurrentDate();
    month = d[0];
    year = d[1];
    console.log(month + " " + year);
    document.getElementById("current-date-paragraph").innerText = month + " " + year;
    //TODO: Add making table from month
    //TODO: Add geting info from database
    makeCallendar(month);
    return;
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function getCurrentDate() {
    const d = new Date();
    let month = months[d.getMonth()];
    let year = d.getFullYear();
    return [month, year];
}

function makeCallendar(month) {
    let table = "";
    document.getElementsByTagName("thead")[0].innerHTML = tableHTML[0];

    let fragmented = getCallendarDate();
    let startDate = getMonthStartDate(fragmented[0], fragmented[1]);
    let endDate = getMonthEndDate(fragmented[0], fragmented[1]);

    while (true) {
        if (startDate.getDay() == 1) {
            table += "<tr>";
        }

        let day = startDate.getDate();
        let iso = startDate.getFullYear() + "-"
                + String(startDate.getMonth() + 1).padStart(2, "0") + "-"
                + String(day).padStart(2, "0");
        if (months[startDate.getMonth()] == month) {
            table += "<td class=\"tile-calendar-active\" id=\"" + day + "\" data-date=\"" + iso + "\"><p>" + day + "</p></td>";
        } else {
            table += "<td class=\"tile-calendar-inactive\" id=\"" + day + "\" data-date=\"" + iso + "\"><p>" + day + "</p></td>";
        }

        if (startDate.getDay() == 0) {
            table += "</tr>";
        }

        if (startDate.getDate() == endDate.getDate() && startDate.getMonth() == endDate.getMonth()) {
            break;
        }
        startDate = startDate.addDays(1);
    }
    document.getElementsByTagName("tbody")[0].innerHTML = table;
    document.dispatchEvent(new CustomEvent("calendarRendered"));
}

function getMonthStartDate(month, year) {
    let startDate = new Date("1-" + month + "-" + year); 
    while (startDate.getDay() != 1) {
        startDate = startDate.addDays(-1);
    }
    return startDate;
}

function getMonthEndDate(month, year) {
    let endDate = new Date("27-" + month + "-" + year);
    let newMonth = false;
    while (!(endDate.getDay() == 0 && newMonth == true)) {
        endDate = endDate.addDays(1);
        if (endDate.addDays(1).getMonth() != endDate.getMonth()) {
            newMonth = true;
        }
    }
    return endDate;
}

function getCallendarDate() {
    let current = document.getElementById("current-date-paragraph").innerText;
    let fragmented = current.split(" ");
    return fragmented;
}

function prevMonth() {
    console.log("prevMonth() started");
    let fragmented = getCallendarDate();
    console.log(fragmented);

    let index = (months.indexOf(fragmented[0]) - 1) % 12;
    if (index < 0) {
        index = 11;
    }
    let month = months[index];
    let year = -1;
    if (fragmented[0] == months[0]) {
        year = parseInt(fragmented[1]) - 1;
    } else {
        year = fragmented[1];
    }
    //console.log(month + " " + year);

    document.getElementById("current-date-paragraph").innerText = month + " " + year;
    //console.log("prevMonth() ended");
    makeCallendar(month);
    return;
}

function nextMonth() {
    //console.log("nextMonth() started");
    let fragmented = getCallendarDate();
    //console.log(fragmented);

    let month = months[(months.indexOf(fragmented[0]) + 1) % 12];
    let year = -1;
    if (fragmented[0] == months[11]) {
        year = parseInt(fragmented[1]) + 1;
    } else {
        year = fragmented[1];
    }
    //console.log(month + " " + year);

    document.getElementById("current-date-paragraph").innerText = month + " " + year;
    //console.log("nextMonth() ended");
    makeCallendar(month);
    return;
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }   
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}