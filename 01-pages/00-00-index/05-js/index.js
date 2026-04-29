const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function start() {
    const d = new Date();
    let month = months[d.getMonth()];
    let year = d.getFullYear();

    document.getElementById("current-date-paragraph").innerText = month + " " + year;
    //TODO: Add making table from month
    //TODO: Add geting info from database
    return;
}

function prevMonth() {
    console.log("prevMonth() started");
    let current = document.getElementById("current-date-paragraph").innerText;
    let fragmented = current.split(" ");
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
    console.log(month + " " + year);

    document.getElementById("current-date-paragraph").innerText = month + " " + year;
    console.log("prevMonth() ended");
    return;
}

function nextMonth() {
    console.log("nextMonth() started");
    let current = document.getElementById("current-date-paragraph").innerText;
    let fragmented = current.split(" ");
    console.log(fragmented);

    let month = months[(months.indexOf(fragmented[0]) + 1) % 12];
    let year = -1;
    if (fragmented[0] == months[11]) {
        year = parseInt(fragmented[1]) + 1;
    } else {
        year = fragmented[1];
    }
    console.log(month + " " + year);

    document.getElementById("current-date-paragraph").innerText = month + " " + year;
    console.log("nextMonth() ended");
    return;
}