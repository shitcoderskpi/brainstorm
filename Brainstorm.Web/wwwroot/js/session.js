const $ = (id) => document.getElementById(id);

$("submit").onclick = function() {
    var id = document.getElementById("session-id-input");
    console.log("Id:", id);
    fetch({
        method: "POST",
        body: JSON.stringify({id: id})
    });
}
