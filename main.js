var express = require('express');
var session = require('express-session');
var serv = express();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var mdpHash = require('password-hash');

var con = mysql.createConnection({
  database : 'mtn0pupejwj1qvkb',
  host : 'esilxl0nthgloe1y.chr7pe7iynqr.eu-west-1.rds.amazonaws.com',
  user : 'i24s64rvoxy5nhce',
  password : 'yjil0tsu3qhkklfi'
});

serv.set('view engine', 'ejs');

serv.use(bodyParser.urlencoded({
  extended: false
}));

serv.use(bodyParser.json());

serv.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

serv.use(express.static(__dirname + '/'));

// Création de la base de données et des tables
con.connect(function (erreur) {
  if (erreur) throw erreur;
  con.query("CREATE DATABASE IF NOT EXISTS mtn0pupejwj1qvkb", function (erreur, resultat) {
    if (erreur) throw erreur;
    console.log("Base mtn0pupejwj1qvkb créée");
  });
  con.query("CREATE TABLE IF NOT EXISTS utilisateur (id_utilisateur INT AUTO_INCREMENT PRIMARY KEY, pseudo VARCHAR(255) NOT NULL UNIQUE, mdp VARCHAR(255) NOT NULL, mail VARCHAR(255) NOT NULL UNIQUE)", function (erreur, resultat) {
    if (erreur) throw erreur;
    console.log("Table utilisateur créée");
  });
  con.query("CREATE TABLE IF NOT EXISTS memo (id_memo INT AUTO_INCREMENT PRIMARY KEY, titre VARCHAR(255), memo TEXT, id_utilisateur INT, FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur))", function (erreur, resultat) {
    if (erreur) throw erreur;
    console.log("Table memo créée");
  });
  con.query("CREATE TABLE IF NOT EXISTS partage (memo INT, utilisateur INT, FOREIGN KEY (memo) REFERENCES memo (id_memo), FOREIGN KEY (utilisateur) REFERENCES utilisateur (id_utilisateur))", function (erreur, resultat) {
    if (erreur) throw erreur;
    console.log("Table partage créée");
  });
});

// MÉTHODES GET
// Page sur laquelle le site s'ouvre
serv.get('/', function (req, res) {
  if (req.session.estConnecte == true) {
    console.log("L'utilisateur connecté est " + req.session.pseudo);
    res.render("accueilConnecte.ejs");
  }else{
    res.render("accueil.ejs");
  }
});

serv.get('/inscription.ejs', function (req, res) {
  res.render("inscription.ejs");
});

serv.get('/connexion.ejs', function (req, res) {
  res.render("connexion.ejs");
});

serv.get('/deconnexion.ejs', function (req, res, next) {
  if (req.session) {
    req.session.estConnecte = false;
    req.session.destroy(function(erreur) {
      if(erreur) {
        return next(erreur);
      } else {
        return res.render('accueil.ejs');
      }
    });
  }
});

serv.get('/memo.ejs', function (req, res) {
  if (req.session.estConnecte == true) {
    con.query("SELECT id_utilisateur FROM utilisateur WHERE pseudo = ?", [req.session.pseudo], function (erreur, resultat) {
      if (erreur) throw erreur;
      if (resultat.length>0){
        con.query("SELECT * FROM memo WHERE id_utilisateur = ?", [resultat[0].id_utilisateur], function (erreur, res2) {
          if (erreur) throw erreur;
          con.query("SELECT pseudo FROM utilisateur WHERE pseudo <> ?", [req.session.pseudo], function (erreur, utilisateurs) {
            if (erreur) throw erreur;
            res.render('memo.ejs', {pseudo: req.session.pseudo, utilisateurs});
          });
        });
      }
    });
  } else {
    res.render('connexion.ejs')
  }
});

serv.get('/mesMemos.ejs', function (req, res) {
  if(req.session.estConnecte == true){
    con.query("SELECT id_utilisateur FROM utilisateur WHERE pseudo = ?", [req.session.pseudo], function (erreur, resultat) {
      if (erreur) throw erreur;
      if (resultat.length>0){
        con.query("SELECT titre, memo.memo, pseudo FROM memo, partage, utilisateur WHERE partage.memo = id_memo AND memo.id_utilisateur = utilisateur.id_utilisateur AND partage.utilisateur = ?", [resultat[0].id_utilisateur], function (erreur, res3) {
          if (erreur) throw erreur;
          con.query("SELECT * FROM memo WHERE id_utilisateur = ?", [resultat[0].id_utilisateur], function (erreur, res2) {
            if (erreur) throw erreur;
            con.query("SELECT pseudo FROM utilisateur WHERE pseudo <> ?", [req.session.pseudo], function (erreur, utilisateurs) {
              if (erreur) throw erreur;
              res.render('mesMemos.ejs', {pseudo: req.session.pseudo,res2, utilisateurs, res3});
            });
          });
        });
      }
    });
  } else {
    res.render('connexion.ejs');
  }
});

serv.get('/modifierMemo.ejs', function (req, res) {
  con.query("SELECT * FROM memo WHERE id_memo = ?", req.body.id_memo, function (erreur, result2) {
    if (erreur) throw erreur;
    res.render('modifierMemo.ejs', {result2, pseudo: req.session.pseudo});
  });
});


// MÉTHODES POST
serv.post('/inscription.ejs', function (req, res) {
  var h = mdpHash.generate(req.body.mdp);
  if(mdpHash.verify(req.body.mdp2, h)){
    var user = [req.body.pseudo, h, req.body.mail];
    con.query("INSERT INTO utilisateur (pseudo, mdp, mail) VALUES (?,?,?)",user, function (erreur, res) {
      if (erreur) throw erreur;
      console.log("L'utilisateur a été créé");
    });
    res.render("accueil.ejs");
  }
  else{
    console.log("Les mots de passe doivent être identiques");
    res.render("inscription.ejs");
  }
});

serv.post('/connexion.ejs', function (req, res) {
  req.session.estConnecte = false;
  var pseudo = req.body.pseudo;
  var mdp = req.body.mdp;
  var val = [pseudo, mdp];
  if (pseudo && mdp){
    con.query("SELECT mdp FROM utilisateur WHERE pseudo = ?", val, function (erreur, results) {
      if (erreur) throw erreur;
      if (results.length>0){
        if (mdpHash.verify(mdp, results[0].mdp)){
          req.session.estConnecte = true;
          req.session.pseudo = pseudo;
          res.redirect('/');
        }
      } else {
        res.render("connexion.ejs");
      }
    });
  } else {
    res.render('connexion.ejs');
  }
});

serv.post('/memo.ejs', function (req, res) {
  if (req.session.estConnecte == true){
    var v = [req.session.pseudo];
    var t = req.body.titre;
    var m = req.body.memo;
    con.query("SELECT id_utilisateur FROM utilisateur WHERE pseudo = ?", v, function (erreur, resu) {
      if (erreur) throw erreur;
      var val = [t, m, resu[0].id_utilisateur];
      if (t && m){
        con.query("INSERT INTO memo (titre, memo, id_utilisateur) VALUES (?,?,?)", val, function (erreur, result) {
          if (erreur) throw erreur;
          var values = req.body.partage;
          if (req.body.partage){
            con.query("SELECT id_memo FROM memo WHERE titre = ? AND memo = ?", [t, m], function (erreur, res2) {
              if (erreur) throw erreur;
              if (values.length>0){
                for (i = 0; i < values.length; i++){
                  con.query("SELECT id_utilisateur FROM utilisateur WHERE pseudo = ?", [values[i]], function (erreur, res1) {
                    if (erreur) throw erreur;
                    con.query("INSERT INTO  partage (memo, utilisateur) VALUES (?, ?)", [res2[0].id_memo, res1[0].id_utilisateur], function (erreur, rPart) {
                      if (erreur) throw erreur;
                      console.log("Le memo a été ajouté et partagé");
                    });
                  });
                }
              }
            });
          } console.log("Le memo a été ajouté");
        });
      } else {
          console.log("Il manque des éléments, le memo n'a pas été ajouté");
     }
      res.redirect('/')
    });
  };
});

serv.post('/supprimerMemo.ejs', function (req, res) {
  con.query("DELETE FROM partage WHERE memo = ?", [req.body.id_memo], function (erreur, res1) {
    if (erreur) throw erreur;
    con.query("DELETE FROM memo WHERE id_memo = ?", [req.body.id_memo], function (erreur, res2) {
      if (erreur) throw erreur;
      console.log("Le memo a été supprimé");
      res.redirect('/')
    });
  });
});

serv.post('/modifierMemo.ejs', function (req, res) {
  con.query("SELECT * FROM memo WHERE id_memo = ?", req.body.id_memo, function (erreur, result2) {
    if (erreur) throw erreur;
    res.render('modifierMemo.ejs', {result2, pseudo: req.session.pseudo});
  });
});

serv.post('/memoModifier.ejs', function (req, res) {
  con.query("UPDATE memo SET titre = ?, memo = ? WHERE id_memo = ?", [req.body.titre2, req.body.memo2, req.body.id_memo], function (erreur, resu) {
    if (erreur) throw erreur;
    console.log("Le memo a été modifié");
    res.redirect('/');
  });
});

serv.listen(3306);
// console.log("Accès au site: localhost:8080/");
