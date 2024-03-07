import 'dotenv/config'

import express, { json } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import { engine } from 'express-handlebars'
import {
    create_commande, getCommande, getallcommandById, getpanierforadmin,
    getProduits, addproduit, getpanier, passelacommande, getallcommand,
    updatecommande, getpanierwithid, deleteallCommande
} from './model/Data.js';
import { connecte, creerUnCompte, emailExiste, checksingin, isconnected } from './model/login.js'
import session from 'express-session';
import bodyParser from 'body-parser';
import { MemoryStore } from 'express-session';
import https from 'https';
import fs from 'fs';
import passport from 'passport';
import LocalStrategy, { Strategy } from 'passport-local';


// Créer le serveur
const app = express();
console.log('Serveur créé');



// Configuration de l'engin de rendu
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(json());
app.use(express.static('public'));

// from todo-sse-030
app.use(session({
    cookie: { maxAge: 3600000 },
    name: process.env.npm_package_name,
    store: new MemoryStore({ checkPeriod: 3600000 }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET
}));

// Ajout de middlewares from 

/*
* https://www.passportjs.org/packages/passport-local/
* https://www.passportjs.org/tutorials/password/
*/
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(connecte));

passport.serializeUser((user, done) => {
    // On mets uniquement le courriel dans la session
    done(null, user);
});

passport.deserializeUser(async (user, done) => {
    // S'il y a une erreur de base de donnée, on
    // retourne l'erreur au serveur
    try {
        done(null, user);
    }
    catch (error) {
        done(error);
    }
});
// Use body-parser middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Function to check if a user is connected
function isconn(request) {
    if (request.session.passport)
        if (request.session.passport.user) {
            if (request.session.passport.user.id_utilisateur != undefined)
                return true
        }
    return false
}

// Middleware to initialize passport session if it doesn't exist
app.use(function (request, response, next) {
    if (request.session.passport == undefined || request.session.passport.user == undefined || request.session.passport.user == null) {
        request.session.passport = {};
        request.session.passport.user = {};
    }
    next();
})

// Route for the home page
app.get('/', async (request, response) => {
    response.render('index', {
        titre: 'Menu',
        styles: ['/css/style.css'],
        scripts: ['/js/index.js'],
        produits: await getProduits(),
        isconnected: isconnected(request)
    });
});

// Route for the login page
app.get('/login', async (request, response) => {
    response.render('login', {
        titre: 'login',
        styles: ['/css/style.css'],
        scripts: ['/js/index.js'],
        isconnected: isconnected(request)
    });
});

// Route for signing in
app.post('/singin', async (request, response) => {
    const validation = checksingin(request.body);
    if (validation) {
        response.render('login', {
            titre: 'login',
            styles: ['/css/style.css'],
            scripts: ['/js/index.js'],
            message: validation,
            isconnected: isconnected(request)
        });
        return;
    }
    if (await emailExiste(request.body.email)) {
        response.render('login', {
            titre: 'login',
            styles: ['/css/style.css'],
            scripts: ['/js/index.js'],
            message: "email deja utilise!",
            isconnected: isconnected(request)
        });
        return;
    }
    await creerUnCompte(request.body.nom, request.body.prenom, request.body.email, request.body.motdepasse);
    if (!(await emailExiste(request.body.email))) {
        response.render('login', {
            titre: 'login',
            styles: ['/css/style.css'],
            scripts: ['/js/index.js'],
            message: "utilise non crrer erreur de serveur!",
            isconnected: isconnected(request)
        });
        return;
    }
    
});

// Route for logging in
app.post('/login', async function (request, response, next) {
    if (!(await emailExiste(request.body.username))) {
        response.render('login', {
            titre: 'login',
            styles: ['/css/style.css'],
            scripts: ['/js/index.js'],
            message: "email ou mot de passe incorrect",
            isconnected: isconnected(request)
        });
        return;
    }
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            response.render('login', {
                titre: 'login',
                styles: ['/css/style.css'],
                scripts: ['/js/index.js'],
                message: info.message,
                isconnected: isconnected(request)
            });
            return;
        }
        request.login(user, function (err) {
            if (err) {
                return next(err);
            }
            response.redirect('/');
            return;
        });
    })(request, response, next);
});

// Route for logging out
app.get('/logout', async (request, response, next) => {
    // Logout the user and redirect to home page
    request.logout(function (err) {
        if (err) { return next(err); }
        response.redirect('/');
    });
});

// Route for the shopping cart page
app.get('/panier', async (request, response) => {
    // If the user is not connected, redirect to login page
    if (!isconn(request)) {
        response.redirect("/login");
        return;
    }
    // Get the shopping cart for the connected user
    const panier = request.session.passport.user == {} ? [] : (await getpanier(request.session.passport.user.id_utilisateur));
    // If the shopping cart is empty, render the empty cart page
    if (panier.length == 0) {
        response.render('panier', {
            titre: 'panier',
            styles: ['/css/style.css'],
            scripts: ['/js/main.js'],
            empty: true,
            isconnected: isconnected(request)
        });
        return;
    }
    // Calculate the total price of the cart
    let total = 0;
    panier.map((element) => {
        total += element.total;
        element.edit = true;
    })
    // Render the shopping cart page with the cart items and total price
    response.render('panier', {
        titre: 'panier',
        styles: ['/css/style.css'],
        scripts: ['/js/main.js'],
        panier: panier,
        prix_total: round(total, 2),
        edit: true,
        isconnected: isconnected(request)
    });
});

// Function to round a number to a certain number of decimals
function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals);
}

// Route for the shopping cart page with a specific id
app.get('/pan', async (request, response) => {
    // If the user is not connected, redirect to login page
    if (!isconn(request)) {
        response.redirect("/login");
        return;
    }
    // Get the shopping cart for the connected user with a specific id
    let panier = await getpanierwithid(request.session.passport.user.id_utilisateur, request.query.id);

    // If the user is an admin, get the shopping cart for the admin
    if (request.session.passport.user.id_type_utilisateur && request.session.passport.user.id_type_utilisateur == 2) {
        panier = await getpanierforadmin(request.query.id);
    } else {
        panier = await getpanierwithid(request.session.passport.user.id_utilisateur, request.query.id);
    }
    // Calculate the total price of the cart
    let total = 0;
    panier.map((element) => {
        total += element.total;
        element.edit = false;
    })
    // Render the shopping cart page with the cart items and total price
    response.render('panier', {
        titre: 'panier',
        styles: ['/css/style.css'],
        panier: panier,
        prix_total: round(total, 2),
        edit: false,
        isconnected: isconnected(request)
    });
});

// Route for the order page
app.get('/commande', async (request, response) => {
    // If the user is not connected, redirect to login page
    if (!isconn(request)) {
        response.redirect("/login");
        return;
    }
    // If the user is an admin, get all the orders for the admin
    if (request.session.passport.user.id_type_utilisateur == 2) {
        const commands = await getallcommand(request.session.passport.user.id_utilisateur);
        // Render the order page for the admin
        response.render('commande', {
            titre: 'panier',
            styles: ['/css/style.css'],
            scripts: ['/js/etat.js'],
            commands: commands,
            isconnected: isconnected(request)
        });
    }
    // If the user is not an admin, get all the orders for the user
    else {
        const commands = await getallcommandById(request.session.passport.user.id_utilisateur);
        // Render the order page for the user
        response.render('commandeuser', {
            titre: 'panier',
            styles: ['/css/style.css'],
            scripts: ['/js/etat.js'],
            commands: commands,
            isconnected: isconnected(request)
        });
    }
});
// Route for updating an order
app.post('/commande', async (request, response) => {
    // Check if the user is logged in
    if (request.session.passport.user == {}) {
        response.status(404).send("page 404");
        return;
    }
    // Check if the user is an admin
    if (request.session.passport.user.id_type_utilisateur != 2) {
        response.status(403).send("vous devait etre un admin pour modifier l'etat");
        return;
    }
    // Check if the order status is valid
    if (request.body.etat < 2 || request.body.etat > 4) {
        response.status(403).send("etat invalid");
        return;
    }
    // Update the order status
    const commands = await updatecommande(request.body.id_commande, request.body.etat);
    response.sendStatus(200);
});

// Route for adding a product to the cart
app.post('/produit', async (request, response) => {
    // Check if the user is logged in
    if (!request.session.passport.user.id_utilisateur) {
        response.status(403).send("vous devait vous connecte!");
        return;
    }
    // Get the current order for the user
    let commade = await getCommande(request.session.passport.user.id_utilisateur);
    // If there is no current order, create a new one
    if (commade.length == 0) {
        await create_commande(request.session.passport.user.id_utilisateur);
    }
    commade = await getCommande(request.session.passport.user.id_utilisateur);
    // Add the product to the order
    await addproduit(commade[0].id_commande, +request.body.id_produit, request.body.quantite, true);
    response.sendStatus(201);
});

// Route for updating a product in the cart
app.post('/updateproduit', async (request, response) => {
    // Check if the user is logged in
    if (request.session.passport.user == {}) {
        response.sendStatus(403);
        return;
    }
    // Get the current order for the user
    let commade = await getCommande(request.session.passport.user.id_utilisateur);
    // If there is no current order, return an error
    if (commade.length == 0) {
        response.status(404).send("commande non trouve");
    }
    // Update the product in the order
    await addproduit(commade[0].id_commande, +request.body.id_produit, request.body.quantite);
    response.sendStatus(200);
});

// Route for sending an order
app.post('/sendcommande', async (request, response) => {
    // Check if the user is logged in
    if (request.session.passport.user == {}) {
        response.sendStatus(403);
        return;
    }
    // Send the order
    await passelacommande(request.session.passport.user.id_utilisateur);
    response.sendStatus(200);
});

// Route for deleting all items in the cart
app.post('/deletepanier', async (request, response) => {
    // Check if the user is logged in
    if (request.session.passport.user == {}) {
        response.status(403);
        return;
    }
    // Delete all items in the cart
    await deleteallCommande(request.session.passport.user.id_utilisateur);
    response.sendStatus(200);
});

// Load SSL credentials
let credentials = {
    key: fs.readFileSync('./https/key.key'),
    cert: fs.readFileSync('./https/cert.cert')
};

// Create an HTTPS server with the SSL credentials
let httpsServer = https.createServer(credentials, app);

// Start the server
if(process.env.NODE_ENV === 'production')
    httpsServer.listen(process.env.PORT); // Use HTTPS in production
else
    app.listen(process.env.PORT); // Use HTTP in development

console.log(`Serveur démarré sur: http${(process.env.NODE_ENV === 'production')?"s":''}://localhost:${process.env.PORT}`);
