var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var sha256 = require('sha256');
var randomNumber = require('csprng');
// var fs = require('fs');
var http = require('http');
// var https = require('https');
// var privateKey = fs.readFileSync('certificates/server.key', 'utf8');
// var certificate = fs.readFileSync('certificates/server.cert', 'utf8');
// var credentials = {key: privateKey, cert: certificate};
// var httpsServer = https.createServer(credentials, app);
var path = require('path')
var httpServer = http.Server(app);
const port = process.env.PORT || 8000;
var session = require('cookie-session');
var csrf = require('csurf');
var nunjucks = require('nunjucks');
var Sequelize = require('sequelize');
var pg = require('pg');

var sessions = {};

function hexToBin(hexStr) {
  var bytes = new Uint8Array(Math.ceil(hexStr.length / 2));
  for (var i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
  }
  return bytes;
}

function sendJSON(res, obj={}) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(obj));
}

function sendSuccess(res, obj={}) {
  obj.success = true;
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(obj));
}

function sendError(res, msg='Error has occured on server') {
  sendJSON(res, {success: false, message: msg});
}

function sendFile(res, fileName) {
  res.render(path.join(__dirname + '/views/' + fileName));
}

function addSession(username) {
  var index = randomNumber(64, 16);
  sessions[index] = username;
  return index;
}

function getSession(token) {
  if (token in sessions) {
    return sessions[token];
  }
  return ""
}

function removeSession(token) {
  delete sessions[token];
}

var connStr = "postgres://dolboqpe:TNtV1OkpdshJq_oaRbTZB3xKdowhK8Jy@stampy.db.elephantsql.com:5432/dolboqpe";
const sequelize = new Sequelize(connStr, {
  dialect: 'postgres',
  operatorsAliases: false
});

const Users = sequelize.define('users', {
  username: Sequelize.STRING(20),
  hash: Sequelize.STRING(256),
  salt: Sequelize.STRING(16),
  ctr: Sequelize.STRING(32),
  vault: Sequelize.STRING(65535)
},{
  timestamps: false
});

function createUser(username, hash, salt, ctr='', vault='') {
  return Users.create({
    username: username,
    hash: hash,
    salt: salt,
    ctr: ctr,
    vault: vault
  });
}

function findUser(username) {
  return Users.findOne({
    where: {
      username: username
    }
  });
}

function updateUser(username, updateData={}) {
  Users.update(updateData, { where: {username: username}});
}

function deleteUser(username) {
  return Users.destroy({
    where: {
      username: username
    }
  });
}

app.use(session({
  name: 'session',
  secret: randomNumber(8, 16),
  maxAge: 60 * 60 * 1000 // 1 hours
  // resave: true,
  // saveUninitialized: true,
  // cookie: {
  //   secure: false,
  //   httpOnly: true,
  //   // Cookie will expire in 1 hour from when it's generated
  //   expires: new Date(Date.now() + 60 * 60 * 1000)
  // }
}));

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

// app.use(function(req, res, next) {
//   if (req.secure) {
//     next();
//   }
//   else {
//     res.redirect('https://' + req.headers.host + ':' + port + req.url);
//   }
// });

app.use(bodyParser.json());
app.use(csrf());

app.use('/home', function(req, res, next) {
  if (!req.body.token) {
    res.redirect('/');
  }
  else {
    var user = getSession(req.body.token);
    if (user == '') {
      res.redirect('/');
    }
    else {
      removeSession(req.body.token);
      req.username = user;
      next();
    }
  }
});

app.use('/public', express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  res.locals.csrfToken = req.csrfToken();
  sendFile(res, 'login.html');
});

app.get('/signUp', function(req, res) {
  res.locals.csrfToken = req.csrfToken();
  sendFile(res, 'signUp.html');
});

app.get('/dashboard', function(req, res) {
  res.locals.csrfToken = req.csrfToken();
  sendFile(res, 'dashboard.html');
});

app.post('/login', function(req, res) {
  var loginInfo = req.body;
  findUser(loginInfo.username).then(function(userInfo) {
    if (userInfo) {
      if (userInfo.hash == sha256(hexToBin(userInfo.salt) + loginInfo.hash)) {
        sendSuccess(res, {token: addSession(userInfo.username)});
      }
      else {
        sendError(res, 'Incorrect username or password!');
      }
    }
    else {
      sendError(res, 'Username not found!');
    }
  });
});

app.post('/newUser', function(req, res) {
  var userInfo = req.body;
  findUser(userInfo.username).then(function(user) {
    if (user) {
      sendError(res, 'Username already in use!')
    }
    else {
      userInfo.salt = randomNumber(64, 16);
      userInfo.hash = sha256(hexToBin(userInfo.salt) + userInfo.hash);
      createUser(userInfo.username, userInfo.hash, userInfo.salt);
      sendSuccess(res, {token: addSession(userInfo.username)});
    }
  });
});

app.post('/home', function(req, res) {
  res.locals.csrfToken = req.csrfToken();
  findUser(req.username).then(function(vaultData) {
    sendSuccess(res, {vault: vaultData.vault, ctr: vaultData.ctr});
  });
});

app.post('/updateVault', function(req, res) {
  var updateInfo = req.body;
  findUser(updateInfo.username).then(function(userInfo) {
    if (userInfo) {
      if (userInfo.hash == sha256(hexToBin(userInfo.salt) + updateInfo.hash)) {
        updateUser(userInfo.username, {
          vault: updateInfo.vault,
          ctr: updateInfo.ctr
        });
        sendSuccess(res);
      }
      else {
        sendError(res, 'wrong credentials');
      }
    }
    else {
      sendError(res, 'no user found');
    }
  });
});

app.post('/deleteAccount', function(req, res) {
  var deleteInfo = req.body;
  findUser(deleteInfo.username).then(function(userInfo) {
    if (userInfo) {
      if (userInfo.hash == sha256(hexToBin(userInfo.salt) + deleteInfo.hash)) {
        deleteUser(userInfo.username);
        sendSuccess(res);
      }
      else {
        sendError(res, 'Incorrect Password!');
      }
    }
    else {
      sendError(res, 'User not found!');
    }
  });
});

// httpsServer.listen(port, () => console.log('Listening on https://localhost:' + port));
httpServer.listen(port, () => console.log('Listening on http://localhost:' + port));