const $ = (id) => document.getElementById(id);

$("create-new").onclick = async function () {
    const id = crypto.randomUUID();
    console.log(id);
    var raw = await fetch("/api/session/create", {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({id: id})
      });
      
      var response = raw.json();
      
      console.log(response)
}
