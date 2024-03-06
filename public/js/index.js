const addbotton = document.getElementsByClassName('ajoutProduit');

let addprod = async function () {
    let attribute = this.getAttribute("id");
    let data = {
        id_produit: attribute,
        quantite: 1,
    };

    let response = await fetch('/produit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        popup("produit ajoute","");
    }else{
        popup(await response.text(), "error")
    }
};

for (let i = 0; i < addbotton.length; i++) {
    addbotton[i].addEventListener('click', addprod, false);
}



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