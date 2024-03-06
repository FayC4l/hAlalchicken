const etats = document.getElementsByClassName('etats');


let updateetat = async function () {
    let attribute = this.getAttribute("name").split('-');
    const commande = attribute[0].replace('etat', '')
    const user = attribute[1].replace('user', '')
    let data = {
        id_commande: +commande,
        id_user:+user,
        etat: this.value,
    };

    let response = await fetch('/commande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (response.ok) {
        popup("etat est a jour ","");
        location.reload();
    }else{
        popup("etat non a jour ","error");
    }

};


for (let i = 0; i < etats.length; i++) {
    etats[i].addEventListener('change', updateetat, false);
}

setInterval(async () => {
    try{
    const page = await fetch('/commande');
    let body = await page.text();
    body = body.split('<!-- commande end -->')[0];
    body = body.split('<!-- commande begin -->')[1];
    document.getElementsByClassName('panier')[0].innerHTML = body;
    const etats = document.getElementsByClassName('etats');
    for (let i = 0; i < etats.length; i++) {
        etats[i].addEventListener('change', updateetat, false);
    }
    console.log("ok")}catch(err){
        console.log(err)
    }
}, 3000);



function popup(message, type) {
    const box = document.getElementById("popup");
    const boxtext = document.getElementById("popuptext");
    boxtext.innerText = message;
    if(type == "error"){
        box.style.backgroundColor = "red";
    }else{
        box.style.backgroundColor = "green";
    }
    box.style.opacity = 1;
    setTimeout(function () { box.style.opacity = 0 }, 2000);
}