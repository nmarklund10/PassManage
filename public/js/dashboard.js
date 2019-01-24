globals = {};

function generateCounter() {
  var ctrPart = new Uint32Array(4);
  window.crypto.getRandomValues(ctrPart);
  var ctr = BigInt(ctrPart[0]) << BigInt(96);
  ctr |= (BigInt(ctrPart[1]) << BigInt(64));
  ctr |= (BigInt(ctrPart[2]) << BigInt(32));
  ctr |= BigInt(ctrPart[3]);
  return ctr.toString(16);
}

function encryptVault() {
  if (globals.vault.length != 0) {
    var decryptedVault = aesjs.utils.utf8.toBytes(JSON.stringify(globals.vault));
    var ctr = generateCounter();
    var aes = new aesjs.ModeOfOperation.ctr(globals.key, aesjs.utils.hex.toBytes(ctr));
    var encryptedVault = aesjs.utils.hex.fromBytes(aes.encrypt(decryptedVault));
    var updateData = {
      vault: encryptedVault,
      ctr: ctr,
      username: window.sessionStorage['user'],
      hash: sha256(window.sessionStorage['decKey'])
    }
    sendPostRequest('/updateVault', updateData, function(response) {
      if (response.success) {
        window.sessionStorage['vault'] = encryptedVault;
        window.sessionStorage['ctr'] = ctr;
      }
      else {
        alert(response.message);
      }
    });
  }
  else {

  }
}

function decryptVault() {
  if (window.sessionStorage['vault'] == '') {
    globals.vault = [];
    return;
  }
  var encryptedVault = aesjs.utils.hex.toBytes(window.sessionStorage['vault']);
  var ctr = aesjs.utils.hex.toBytes(window.sessionStorage['ctr']);
  var aes = new aesjs.ModeOfOperation.ctr(globals.key, ctr);
  globals.vault = JSON.parse(aesjs.utils.utf8.fromBytes(aes.decrypt(encryptedVault)));
}

function displayVault() {
  if ('vault' in window.sessionStorage && 'decKey' in window.sessionStorage) {
    globals.key = aesjs.utils.hex.toBytes(window.sessionStorage['decKey']);
    decryptVault();
    document.getElementById('message').innerText = 'Your Stuff: ' + JSON.stringify(globals.vault);
  }
  else {
    window.sessionStorage = {};
    window.location = '/';
  }
}

function addSite(url, username, password) {
  globals.vault.push({url: url, username: username, password: password});
  encryptVault();
}