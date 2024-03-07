// Importing necessary modules
import { connectionPromise } from '../connexion.js'
import bcrypt from 'bcrypt';

// Function to hash a password
function hashpass(password) {
    return new Promise(resolve => {
        // Generate a salt and hash the password
        bcrypt.genSalt(parseInt(process.env.SALT), function (err, salt) {
            bcrypt.hash(password, salt, function (err, hash) {
                resolve(hash);
            });
        });
    });
}

// Function to compare a password with a hash
function comparehash(password, hash) {
    return new Promise(resolve => {
        // Compare the password with the hash
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

// Function to check if an email exists in the database
export async function emailExiste(email) {
    let connection = await connectionPromise;
    let result = await connection.all(
        `SELECT id_utilisateur FROM utilisateur WHERE courriel = ?`, [email]
    );
    if (result.length == 0)
        return false;
    return true;
}

// Function to create a new account
export async function creerUnCompte(nom, prenom, email, password) {
    let connection = await connectionPromise;
    await connection.run(
        `INSERT INTO utilisateur
        (courriel, mot_de_passe, prenom,nom,id_type_utilisateur)
        VALUES(?, ?, ?, ?, ?);`, [email, await hashpass(password), prenom, nom, 1]
    );
}

// Function to authenticate a user
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

// Function to validate the sign in form
export function checksingin(body) {
    if (!ValidateEmail(body.email)) {
        return "email pas correct!";
    }
    if (!/^[a-zA-Z ]+$/.test(body.nom)) {
        return "nom invalide";
    }
    if (!/^[a-zA-Z ]+$/.test(body.prenom)) {
        return "prenom invalide";
    }
    if (body.motdepasse.length < 8) {
        return "mot de passe trop court";
    }
    if (body.motdepasse != body.remotdepasse) {
        return "Les mots de passe ne correspends pas";
    }
}

// Function to validate an email address
function ValidateEmail(mail) {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
        return (true)
    }
    return (false)
}

// Function to check if a user is connected
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
