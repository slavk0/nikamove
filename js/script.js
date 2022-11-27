document.onload = moveOut();

function moveOut() {
    move("#text").set("margin-left", 200).delay("1s").end();
}
