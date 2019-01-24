var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var router = express.Router();
var sha256 = require('sha256');
var randomNumber = require('csprng');
var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey = fs.readFileSync('certificates/server.key', 'utf8');
var certificate = fs.readFileSync('certificates/server.cert', 'utf8');
var credentials = {key: privateKey, cert: certificate};
var path = require('path')
var httpsServer = https.createServer(credentials, app);
var httpServer = http.createServer(app);
var port = 443;
var session = require('express-session');
var csrf = require('csurf');
var nunjucks = require('nunjucks');

var sessions = {};

function hexToBin(hexStr) {
  var bytes = new Uint8Array(Math.ceil(hexStr.length / 2));
  for (var i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
  }
  return bytes;
}

function binToHex(byteArr) {
  var hexStr = '';
  for (var i = 0; i < byteArr.length; i++) {
    if (byteArr[i] < 16){
      hexStr += '0';
    }
    hexStr += byteArr[i].toString(16);
  }
  return hexStr
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

app.use(session({
  secret: randomNumber(8, 16),
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: true,
    httpOnly: true,
    // Cookie will expire in 1 hour from when it's generated
    expires: new Date(Date.now() + 60 * 60 * 1000)
  }
}));

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

app.use(csrf());
app.use(router);
app.use(bodyParser.json());

app.use(function(req, res, next) {
  if (req.secure) {
    next();
  }
  else {
    res.redirect('https://' + req.headers.host + ':' + port + req.url);
  }
});

app.use('/home', function(req, res, next) {
  if (!req.body.token) {
    res.redirect('/');
  }
  else {
    var user = getSession(req.body.token);
    if (user == "") {
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
  var fileName = 'db/' + req.body.username;
  if (fs.existsSync(fileName)) {
    var loginInfo = req.body;
    var userInfo = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
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

app.post('/newUser', function(req, res) {
  var fileName = 'db/' + req.body.username;
  if (!fs.existsSync(fileName)) {
    var userInfo = req.body;
    if (!fs.existsSync('db/')) {
      fs.mkdirSync('db');
    }
    userInfo.salt = randomNumber(64, 16);
    userInfo.hash = sha256(hexToBin(userInfo.salt) + userInfo.hash)
    userInfo.vault = '';
    userInfo.ctr = '';
    var writeStream = fs.createWriteStream(fileName);
    writeStream.write(JSON.stringify(userInfo));
    writeStream.end();
    sendSuccess(res, {token: addSession(userInfo.username)});
  }
  else {
    sendError(res, 'Username already in use!')
  }
});

app.post('/home', function(req, res) {
  res.locals.csrfToken = req.csrfToken();
  var data = JSON.parse(fs.readFileSync('db/' + req.username, 'utf-8'));
  sendSuccess(res, {vault: data.vault, ctr: data.ctr});
});

app.post('/updateVault', function(req, res) {
  var fileName = 'db/' + req.body.username;
  if (fs.existsSync(fileName)) {
    var updateInfo = req.body;
    var userInfo = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    if (userInfo.hash == sha256(hexToBin(userInfo.salt) + updateInfo.hash)) {
      userInfo.vault = updateInfo.vault;
      userInfo.ctr = updateInfo.ctr;
      var writeStream = fs.createWriteStream(fileName);
      writeStream.write(JSON.stringify(userInfo));
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

httpsServer.listen(port, () => console.log('Listening on https://localhost:' + port));
httpServer.listen(80)