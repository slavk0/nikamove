document.onload = moveOut();

function moveOut() {
    move(".left").set("margin-left", 150).delay("1s").end();
    move(".right").set("margin-right", 150).delay("1s").end();
}
