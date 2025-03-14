const $ = (id) => document.getElementById(id);

$("create-new").onclick = async function () {
    // TODO: Replace w/ user id in future
    const id = crypto.randomUUID();
    console.log(id);

    // TODO: Error handling
    await fetch("/api/session/create", {
        method: 'POST',
        headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
        },
        body: JSON.stringify({UserId: id})
      }).then(res => res.json()
        .then(data => {
            console.log(data)

            window.location.href = data["urlToRedirect"]
        }));
}
