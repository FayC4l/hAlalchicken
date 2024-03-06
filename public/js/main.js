const panier_element = document.getElementsByClassName('quantite');
let updateprod = async function () {
    let attribute = this.getAttribute("name");
    attribute = attribute.replace('produit', '')
    let data = {
        id_produit: +attribute,
        quantite: this.value,
    };

    let response = await fetch('/updateproduit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (response.ok) {
        location.reload();
    }else{
        popup("erreur request!!","error");
    }
};

for (let i = 0; i < panier_element.length; i++) {
    panier_element[i].addEventListener('change', updateprod, false);
}

    const submit = document.getElementById('submit');
    submit.addEventListener('click', async () => {
        let response = await fetch('/sendcommande', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: ''
        });
        if (response.ok) {
            location.href = "/commande";
            popup("commande ajoute","");
        }else{
            popup("erreur request!!","error");
        }
    })

    const delet = document.getElementById('delete');
    delet.addEventListener('click', async () => {
        let response = await fetch('/deletepanier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: ''
        });
        if (response.ok) {
            location.reload();
        }else{
            popup("erreur request!!","error");
        }
    })






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