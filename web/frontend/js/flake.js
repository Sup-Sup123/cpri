function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validateUsername(user){
    var isClean  = /[^A-Za-z0-9)(*&^$!`\_+={};:@~#>.<]/;
    return isClean.test(user);
}

  

function emailCheck() {
    var z = document.forms['reg']['email'].value;
	
	if (!validateEmail(z)) {
        email.setCustomValidity("Your email is not in the correct format, please enter a real email.");
        return false;
    }
    else{
        email.setCustomValidity('');
    }
}


function usernamePurity() {
    var user = document.forms['reg']['username'].value;
	
	if (validateUsername(user) || user.length < 4 || user.length > 12) {
        username.setCustomValidity("Your username is not suitable, it has to be between 4-12 characters including no special characters!");
        return false;
    }
    else{
        username.setCustomValidity('');
        return true;
    }
} // so i would of created two diff functions, one to check for length, one for special chars but you cant setCustomValidity twice on the same field i suppose..
// so i had to keep it all on one line, i know its bad!
function passwordCheck() {
    var pass = document.forms['reg']['password'].value;
	
	if (pass.length < 5) {
        password.setCustomValidity("Your password has to be longer than 5 characters!");
        return false;
    }
    else{
        password.setCustomValidity('');
    }
}


function passwordConfirm(){
    var password = document.forms['reg']['password'].value;
    var password_conf = document.forms['reg']['password_confirm'].value;
    if (password !== password_conf || password.length < 5){
        password_confirm.setCustomValidity("Make sure you entered the same password as before!");
    }
    else{
        password_confirm.setCustomValidity('');
    }
}

function changeImage(imgName){
    image = document.getElementById('imgDisp');
    image.src = imgName;
    var colorId = imgName.replace("./img/colors/", "");
    colorId = colorId.replace(".png", "");
    document.getElementById("penguinColorInput").value = colorId;
}