import { connectionPromise } from '../connexion.js'
import bcrypt from 'bcrypt';

function hashpass(password) {
    return new Promise(resolve => {
        bcrypt.genSalt(parseInt(process.env.SALT), function (err, salt) {
            bcrypt.hash(password, salt, function (err, hash) {
                resolve(hash);
            });
        });
    });

}

function comparehash(password, hash) {
    return new Promise(resolve => {
        bcrypt.compare(password, hash, function (err, result) {
            if (result) {
                resolve(true);
            }
            else {
                resolve(false);
            }
        });
    });
}


export async function emailExiste(email) {
    let connection = await connectionPromise;
    let result = await connection.all(
        `SELECT id_utilisateur FROM utilisateur WHERE courriel = ?`, [email]
    );
    if (result.length == 0)
        return false;
    return true;
}

export async function creerUnCompte(nom, prenom, email, password) {
    let connection = await connectionPromise;
    await connection.run(
        `INSERT INTO utilisateur
        (courriel, mot_de_passe, prenom,nom,id_type_utilisateur)
        VALUES(?, ?, ?, ?, ?);`, [email, await hashpass(password), prenom, nom, 1]
    );
}

export async function connecte(email,password, cb) {

    let connection = await connectionPromise;
    let results = await connection.all(
        `SELECT * FROM utilisateur WHERE courriel = ? LIMIT 1;`, [email]
    );
    if (results.length == 0)
        return cb(null, false);
    else {
        if (await comparehash(password, results[0]['mot_de_passe'])) {
            delete results[0]['mot_de_passe'];
            return cb(null, results[0]);
        }
        else
            return cb(null, false, { message: 'email ou mot de passe invalide' });
    }
}

export function checksingin(body) {
    if (!ValidateEmail(body.email)) {
        return "email pas correct!";
    }
    if (!/^[a-zA-Z ]+$/.test(body.nom)) {
        return "nom invalide!";
    }
    if (!/^[a-zA-Z ]+$/.test(body.prenom)) {
        return "prenom invalide!";
    }
    if (body.motdepasse.length < 8) {
        return "mot de passe faible!";
    }
    if (body.motdepasse != body.remotdepasse) {
        return "mot de passe faible!";
    }
}

function ValidateEmail(mail) {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
        return (true)
    }
    return (false)
}

export function isconnected(request) {
    let user = request.session.passport.user;
    const response = {
        nom: undefined,
        prenom: undefined,
        email: undefined,
        isconnected: (user.id_utilisateur != undefined),
        link: "login",
        linkname: "ce connecte",
    }
    if (response.isconnected) {
        response.nom = user.nom;
        response.prenom = user.prenom;
        response.email = user.email;
        response.link = "logout";
        response.linkname = "ce deconnecte";
    }
    return [response];
}