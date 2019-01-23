function generateCounter() {
  var ctrPart = new Uint32Array(4);
  window.crypto.getRandomValues(ctrPart);
  var ctr = BigInt(ctrPart[0]) << BigInt(96);
  ctr |= (BigInt(ctrPart[1]) << BigInt(64));
  ctr |= (BigInt(ctrPart[2]) << BigInt(32));
  ctr |= BigInt(ctrPart[3]);
  ctr = ctr.toString(16);
  return aesjs.utils.hex.toBytes(ctr);
}

function decryptVault() {
  var encryptedVault = aesjs.utils.hex.toBytes(window.sessionStorage.vault);
  var key = aesjs.utils.hex.toBytes(window.sessionStorage["decKey"]);
  var ctr = generateCounter();
  var aes = new aesjs.ModeOfOperation.cbc(key, ctr);
  var decryptedVault = aes.decrypt(encryptedVault);
}

function displayVault() {
  if ('vault' in window.sessionStorage) {
    document.getElementById('message').innerText = 'Your Stuff: ' + window.sessionStorage.vault;
  }
  else {
    window.sessionStorage = {};
    window.location = '/';
  }
}