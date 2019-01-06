var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var route = express.Router();
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

function sendJSON(res, obj) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(obj));
}

function sendSuccess(res, obj) {
  obj.success = true;
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(obj));
}

function sendError(res, msg='') {
  sendJSON(res, {success: false, message: msg});
}

function sendFile(res, fileName) {
  res.sendFile(path.join(__dirname + '/views/' + fileName));
}

app.use(bodyParser.json());

app.use(function(req, res, next){
  if (req.secure) {
    next()
  }
  else {
    res.redirect('https://' + req.headers.host + ':' + port + req.url);
  }
});

app.use('/public', express.static(__dirname + '/public'));

app.get('/', function(req, res){
  sendFile(res, 'login.html');
});

app.get('/signUp', function(req, res){
  sendFile(res, 'signUp.html');
});

app.get('/home/:user', function(req, res){
  var data = fs.readFileSync('db/' + req.params.user, 'utf8');
  res.send(data);
});

app.post('/login', function(req, res) {
  var fileName = 'db/' + req.body.username;
  if (fs.existsSync(fileName)) {
    var userInfo = req.body;
    var user = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    if (user.password == userInfo.password) {
      sendSuccess(res, {user: user.username});
    }
    else {
      sendError(res, 'Incorrect username or password!');
    }
  }
  else {
    sendError(res, 'Username not found!');
  }
});

app.post('/newUser', function(req, res){
  var fileName = 'db/' + req.body.username;
  if (!fs.existsSync(fileName)) {
    var userInfo = req.body;
    userInfo.vault = '';
    if (!fs.existsSync('db/')) {
      fs.mkdirSync('db');
    }
    var writeStream = fs.createWriteStream(fileName);
    writeStream.write(JSON.stringify(userInfo));
    writeStream.end();
    sendSuccess(res, {user: userInfo.username});
  }
  else {
    sendError(res, 'Username already in use!')
  }
});

httpsServer.listen(port, () => console.log('Listening on https://localhost:' + port));
httpServer.listen(80)