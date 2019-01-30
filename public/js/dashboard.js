function generateCounter() {
  var ctrPart = new Uint32Array(4);
  window.crypto.getRandomValues(ctrPart);
  var ctr = BigInt(ctrPart[0]) << BigInt(96);
  ctr |= (BigInt(ctrPart[1]) << BigInt(64));
  ctr |= (BigInt(ctrPart[2]) << BigInt(32));
  ctr |= BigInt(ctrPart[3]);
  return ctr.toString(16);
}

function updateVault(vault, ctr) {
  var updateData = {
    vault: vault,
    ctr: ctr,
    username: window.sessionStorage['user'],
    hash: sha256(window.sessionStorage['decKey'])
  };
  sendPostRequest('/updateVault', updateData, function(response) {
    if (response.success) {
      window.sessionStorage['vault'] = vault;
      window.sessionStorage['ctr'] = ctr;
      displayVault();
    }
    else {
      alert(response.message);
    }
  });
}

function clearVault() {
  updateVault('', '');
}

function clearDialog() {
  var dialog = Metro.dialog.create({
    title: 'This will delete ALL sites in your vault!',
    actions: [
      {
        caption: 'Delete Everything',
        cls: 'primary',
        onclick: function() {
          Metro.dialog.create({
            title: 'Are you really sure?',
            actions: [
              {
                caption: 'Yes',
                cls: 'js-dialog-close primary',
                onclick: function() {
                  clearVault();
                  Metro.dialog.close(dialog);
                }
              },
              {
                caption: 'No',
                cls: 'js-dialog-close secondary',
                onclick: function() {
                  Metro.dialog.close(dialog);
                }
              }
            ]
          });
        }
      },
      {
        caption: 'Cancel',
        cls: 'js-dialog-close secondary'
      }
    ]
  });
}

function initialize() {
  document.getElementById('welcome').innerText = window.sessionStorage['user'];
  document.getElementById('user').src = '/public/images/user.svg';
  displayVault();
}

function clearSession() {
  delete window.sessionStorage.decKey;
  delete window.sessionStorage.vault;
  delete window.sessionStorage.ctr;
  delete window.sessionStorage.user;
}
function decryptVault() {
  if (window.sessionStorage['vault'] == '') {
    return '[]';
  }
  var encryptedVault = aesjs.utils.hex.toBytes(window.sessionStorage['vault']);
  var ctr = aesjs.utils.hex.toBytes(window.sessionStorage['ctr']);
  var key = aesjs.utils.hex.toBytes(window.sessionStorage['decKey']);
  var aes = new aesjs.ModeOfOperation.ctr(key, ctr);
  return aesjs.utils.utf8.fromBytes(aes.decrypt(encryptedVault));
}

function displayVault() {
  if ('vault' in window.sessionStorage && 'decKey' in window.sessionStorage) {
    document.getElementById('message').innerText = 'Your Stuff: ' + decryptVault();
  }
  else {
    window.sessionStorage = {};
    window.location = '/';
  }
}

function openAddSite() {
  Metro.dialog.create({
    title: "Add Site",
    content: '<input name="url" type="text" id="url" placeholder="Site URL"/> \
              <div class="p-1"></div> \
              <input name="username" type="text" id="username" placeholder="Username"/> \
              <div class="p-1"></div> \
              <input name="password" type="password" id="password" placeholder="Password"/>',
    actions: [
      {
        caption: 'Add',
        cls: 'js-dialog-close primary',
        onclick: function() {
          var url = document.getElementById('url').value;
          var username = document.getElementById('username').value;
          var password = document.getElementById('password').value;
          addSite(url, username, password);
        }
      },
      {
        caption: 'Cancel',
        cls: 'js-dialog-close secondary'
      }
    ]
  });
}

function addSite(url, username, password) {
  var temp_vault = JSON.parse(decryptVault());
  console.log(typeof(temp_vault));
  temp_vault.push({url: url, username: username, password: password});
  console.log(temp_vault);
  var decryptedVault = aesjs.utils.utf8.toBytes(JSON.stringify(temp_vault));
  var ctr = generateCounter();
  var key = aesjs.utils.hex.toBytes(window.sessionStorage['decKey']);
  var aes = new aesjs.ModeOfOperation.ctr(key, aesjs.utils.hex.toBytes(ctr));
  var encryptedVault = aesjs.utils.hex.fromBytes(aes.encrypt(decryptedVault));
  updateVault(encryptedVault, ctr);
}