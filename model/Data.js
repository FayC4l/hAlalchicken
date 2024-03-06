import { connectionPromise } from '../connexion.js'

export async function getProduits() {
    let connection = await connectionPromise;

    return await connection.all(
        `SELECT * FROM produit;`
    );
}

export async function getCommande(id_utilisateur) {
    const etat_commande = await getEtatCommande();
    const id_panier = etat_commande.filter((etat) => etat.nom == "panier")[0].id_etat_commande;

    let connection = await connectionPromise;

    return await connection.all(
        `SELECT id_commande FROM commande WHERE id_utilisateur=? AND id_etat_commande=?;`, [id_utilisateur, id_panier]
    );
}

export async function deleteallCommande(id_utilisateur) {
    const commande = await getCommande(id_utilisateur);
    if (commande.length == 0) {
        return;
    }
    for (let i = 0; i < commande.length; i++) {
        await deleteCommande_produit(commande[i].id_commande);
        await deleteCommande(commande[i].id_commande);
    }
}

async function deleteCommande_produit(id_commande) {
    let connection = await connectionPromise;
    await connection.run(
        `DELETE FROM commande_produit
        WHERE id_commande=?;`,
        [id_commande]
    );
}
async function deleteCommande(id_commande) {
    let connection = await connectionPromise;
    await connection.run(
        `DELETE FROM commande
        WHERE id_commande=?;`,
        [id_commande]
    );
}

export async function getEtatCommande() {
    let connection = await connectionPromise;

    return await connection.all(
        `SELECT * FROM etat_commande;`
    );
}

export async function create_commande(id_utilisateur) {
    const etat_commande = await getEtatCommande();
    const id_panier = etat_commande.filter((etat) => etat.nom == "panier")[0].id_etat_commande;
    let date_create = new Date;
    let connection = await connectionPromise;

    await connection.run(
        `INSERT INTO commande
        (id_utilisateur, id_etat_commande, date)
        VALUES(?, ?, ?);`,
        [id_utilisateur, id_panier, date_create]
    );
}


export async function addproduit(id_commande, id_produit, quantite, add = false) {
    let connection = await connectionPromise;

    let todos = await connection.all(
        `SELECT quantite
        FROM commande_produit WHERE id_commande=? AND id_produit=?;`, [id_commande, id_produit]
    );
    if (todos.length == 0) {
        if (quantite < 1) return;
        await connection.run(
            `INSERT INTO commande_produit
            (id_commande, id_produit, quantite)
            VALUES(?, ?, ?);`,
            [id_commande, id_produit, quantite]
        );
    } else {
        if (add)
            quantite = +todos[0].quantite + quantite;
        if (quantite > 0) {
            await connection.run(
                `UPDATE commande_produit
            SET quantite=?
            WHERE id_commande=? AND id_produit=?;`,
                [quantite, id_commande, id_produit]
            );
        } else {
            await connection.run(
                `DELETE FROM commande_produit
            WHERE id_commande=? AND id_produit=?;`,
                [id_commande, id_produit]
            );
        }
    }
    return todos;
}

export async function getpanier(id_utilisateur) {
    if(id_utilisateur == undefined)return [];
    let connection = await connectionPromise;
    const etat_commande = await getEtatCommande();
    const id_panier = etat_commande.filter((etat) => etat.nom == "panier")[0].id_etat_commande;
    let todos = await connection.all(
        `SELECT  * FROM  commande c 
        inner join etat_commande ec  on ec.id_etat_commande = c.id_etat_commande 
        INNER  JOIN  commande_produit cp on cp.id_commande = c.id_commande 
        INNER  JOIN produit p on p.id_produit  = cp.id_produit
        WHERE  c.id_utilisateur = ? AND c.id_etat_commande = ?;`, [id_utilisateur, id_panier]
    );
    todos.forEach(element => {
        element.total = element.quantite * element.prix;
    });
    return todos;
}

export async function getpanierforadmin(id) {
    let connection = await connectionPromise;
    let todos = await connection.all(
        `SELECT  * FROM  commande c 
        inner join etat_commande ec  on ec.id_etat_commande = c.id_etat_commande 
        INNER  JOIN  commande_produit cp on cp.id_commande = c.id_commande 
        INNER  JOIN produit p on p.id_produit  = cp.id_produit
        WHERE  c.id_commande = ?;`, [id]
    );
    todos.forEach(element => {
        element.total = element.quantite * element.prix;
    });
    return todos;
}

export async function getpanierwithid(id_utilisateur,id) {
    let connection = await connectionPromise;
    let todos = await connection.all(
        `SELECT  * FROM  commande c 
        inner join etat_commande ec  on ec.id_etat_commande = c.id_etat_commande 
        INNER  JOIN  commande_produit cp on cp.id_commande = c.id_commande 
        INNER  JOIN produit p on p.id_produit  = cp.id_produit
        WHERE  c.id_utilisateur = ? AND c.id_commande = ?;`, [id_utilisateur, id]
    );
    todos.forEach(element => {
        element.total = element.quantite * element.prix;
    });
    return todos;
}

export async function passelacommande(id_utilisateur) {
    const etat_commande = await getEtatCommande();
    const id_panier = etat_commande.filter((etat) => etat.nom == "cuisine")[0].id_etat_commande;
    let commade = await getCommande(id_utilisateur);
    let connection = await connectionPromise;

    await connection.run(
        `UPDATE commande
        SET id_etat_commande=?
        WHERE id_commande=? AND id_utilisateur=?;`,
        [id_panier, commade[0].id_commande, id_utilisateur]
    );
}

export async function getallcommand() {
    let connection = await connectionPromise;
    let result = await connection.all(
        `SELECT  * FROM  commande c 
        inner join etat_commande ec  on ec.id_etat_commande = c.id_etat_commande
        WHERE c.id_etat_commande <> ?`, [1]
    );
    for(let y=0;y<result.length;y++)
    {
        let element = result[y];
        let etats = await getEtatCommande();
        for(let i =1;i<etats.length;i++){
            if (element.id_etat_commande == etats[i].id_etat_commande) {
                etats[i].selected = true;
            } else {
                etats[i].selected = false;
            }
        }
        delete etats[0];
        element.etats = etats;
    }
    return result
}

export async function getallcommandById(id_utilisateur) {
    let connection = await connectionPromise;
    let result = await connection.all(
        `SELECT  * FROM  commande c 
        inner join etat_commande ec  on ec.id_etat_commande = c.id_etat_commande
        WHERE  c.id_utilisateur = ? AND  c.id_etat_commande <> ?`, [id_utilisateur,1]
    );
    for(let y=0;y<result.length;y++)
    {
        let element = result[y];
        let etats = await getEtatCommande();
        for(let i =1;i<etats.length;i++){
            if (element.id_etat_commande == etats[i].id_etat_commande) {
                etats[i].selected = true;
            } else {
                etats[i].selected = false;
            }
        }
        delete etats[0];
        element.etats = etats;
    }
    return result
}

export async function updatecommande(id, etat) {
    let connection = await connectionPromise;
    await connection.run(
        `UPDATE commande
        SET id_etat_commande = ?
        WHERE id_commande = ?;`, [etat, id]
    );
}
