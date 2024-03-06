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

app.use(bodyParser.urlencoded({ extended: true }));

function isconn(request) {
    if (request.session.passport)
        if (request.session.passport.user) {
            if (request.session.passport.user.id_utilisateur != undefined)
                return true
        }
    return false
}

app.use(function (request, response, next) {
    if (request.session.passport == undefined || request.session.passport.user == undefined || request.session.passport.user == null) {
        request.session.passport = {};
        request.session.passport.user = {};
    }
    next();
})



app.get('/', async (request, response) => {
    response.render('index', {
        titre: 'Menu',
        styles: ['/css/style.css'],
        scripts: ['/js/index.js'],
        produits: await getProduits(),
        isconnected: isconnected(request)
    });
});

app.get('/login', async (request, response) => {
    response.render('login', {
        titre: 'login',
        styles: ['/css/style.css'],
        scripts: ['/js/index.js'],
        isconnected: isconnected(request)
    });
});



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
    response.redirect("/");
});


app.post('/login', async function (request, response, next) {
    if (!(await emailExiste(request.body.username))) {
        response.render('login', {
            titre: 'login',
            styles: ['/css/style.css'],
            scripts: ['/js/index.js'],
            message: "email ou mot de passe incorrect!",
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


app.get('/logout', async (request, response, next) => {
    request.logout(function (err) {
        if (err) { return next(err); }
        response.redirect('/');
    });
});



app.get('/panier', async (request, response) => {
    if (!isconn(request)) {
        response.redirect("/login");
        return;
    }
    const panier = request.session.passport.user == {} ? [] : (await getpanier(request.session.passport.user.id_utilisateur));
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
    let total = 0;
    panier.map((element) => {
        total += element.total;
        element.edit = true;
    })
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

function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals);
}

app.get('/pan', async (request, response) => {
    if (!isconn(request)) {
        response.redirect("/login");
        return;
    }
    let panier = await getpanierwithid(request.session.passport.user.id_utilisateur, request.query.id);

    if (request.session.passport.user.id_type_utilisateur && request.session.passport.user.id_type_utilisateur == 2) {
        panier = await getpanierforadmin(request.query.id);
    } else {
        panier = await getpanierwithid(request.session.passport.user.id_utilisateur, request.query.id);
    }
    let total = 0;
    panier.map((element) => {
        total += element.total;
        element.edit = false;
    })
    response.render('panier', {
        titre: 'panier',
        styles: ['/css/style.css'],
        panier: panier,
        prix_total: round(total, 2),
        edit: false,
        isconnected: isconnected(request)
    });
});

app.get('/commande', async (request, response) => {
    if (!isconn(request)) {
        response.redirect("/login");
        return;
    }
    if (request.session.passport.user.id_type_utilisateur == 2) {
        const commands = await getallcommand(request.session.passport.user.id_utilisateur);
        response.render('commande', {
            titre: 'panier',
            styles: ['/css/style.css'],
            scripts: ['/js/etat.js'],
            commands: commands,
            isconnected: isconnected(request)
        });
    }
    else {
        const commands = await getallcommandById(request.session.passport.user.id_utilisateur);
        response.render('commandeuser', {
            titre: 'panier',
            styles: ['/css/style.css'],
            scripts: ['/js/etat.js'],
            commands: commands,
            isconnected: isconnected(request)
        });
    }
});

app.post('/commande', async (request, response) => {
    if (request.session.passport.user == {}) {
        response.status(404).send("page 404");
        return;
    }
    if (request.session.passport.user.id_type_utilisateur != 2) {
        response.status(403).send("vous devait etre un admin pour modifier l'etat");
        return;
    }
    if (request.body.etat < 2 || request.body.etat > 4) {
        response.status(403).send("etat invalid");
        return;
    }
    const commands = await updatecommande(request.body.id_commande, request.body.etat);
    response.sendStatus(200);
});

app.post('/produit', async (request, response) => {
    if (!request.session.passport.user.id_utilisateur) {
        response.status(403).send("vous devait vous connecte!");
        return;
    }
    let commade = await getCommande(request.session.passport.user.id_utilisateur);
    if (commade.length == 0) {
        await create_commande(request.session.passport.user.id_utilisateur);
    }
    commade = await getCommande(request.session.passport.user.id_utilisateur);
    await addproduit(commade[0].id_commande, +request.body.id_produit, request.body.quantite, true);
    response.sendStatus(201);
});

app.post('/updateproduit', async (request, response) => {
    if (request.session.passport.user == {}) {
        response.sendStatus(403);
        return;
    }
    let commade = await getCommande(request.session.passport.user.id_utilisateur);
    if (commade.length == 0) {
        response.status(404).send("commande non trouve");
    }
    await addproduit(commade[0].id_commande, +request.body.id_produit, request.body.quantite);
    response.sendStatus(200);
});

app.post('/sendcommande', async (request, response) => {
    if (request.session.passport.user == {}) {
        response.sendStatus(403);
        return;
    }
    await passelacommande(request.session.passport.user.id_utilisateur);
    response.sendStatus(200);
});
app.post('/deletepanier', async (request, response) => {
    if (request.session.passport.user == {}) {
        response.status(403);
        return;
    }
    await deleteallCommande(request.session.passport.user.id_utilisateur);
    response.sendStatus(200);
});


let credentials = {
    key: fs.readFileSync('./https/key.key'),
    cert: fs.readFileSync('./https/cert.cert')
};
// Démarrer le serveur
let httpsServer = https.createServer(credentials, app);
if(process.env.NODE_ENV === 'production')
httpsServer.listen(process.env.PORT);
else
app.listen(process.env.PORT);
console.log(`Serveur démarré sur: http${(process.env.NODE_ENV === 'production')?"s":''}://localhost:${process.env.PORT}`);
