function login() {
    console.log("Sent");
    let login = document.getElementsByTagName("input")[0].value;
    let password = document.getElementsByTagName("input")[1].value;
    console.log(login+"|"+password);
    if (checkLogin(login, password)){
        document.getElementById("login-error-section").style = "visibility:hidden";
        //TODO: Nie działa przejście między stronami
        window.location = "/00-02-panel.html";
    } else {
        document.getElementById("login-error-section").style = "visibility:visible";
    }
}

function reset() {

}

function checkLogin(login, password) {
    //TODO: Add checking password with database
    if ((login == "test" && password == "1234") || (login == "test" && password == "test")){
        return true;
    }
    return false;
}