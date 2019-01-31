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

function searchVault(input) {
  //TODO
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
    var temp_vault = JSON.parse(decryptVault());
    console.log(temp_vault.length);
    if (temp_vault.length == 0) {
      var newRow = document.createElement('div');
      newRow.className = 'cell-4 offset-4';
      newRow.innerText = '\nYou have no sites yet!';
      document.getElementById('row1').appendChild(newRow);
    }
    else {
      document.getElementById('row1').innerHTML = '';
    }
  }
  else {
    window.sessionStorage = {};
    window.location = '/';
  }
}

function openAddSite() {
  var dialog = Metro.dialog.create({
    title: "Add Site",
    content: '<input name="url" type="text" id="url" placeholder="Site URL"/> \
              <div class="p-1"></div> \
              <input name="name" type="text" id="name" placeholder="Name"/> \
              <div class="p-1"></div> \
              <input name="username" type="text" id="username" placeholder="Username"/> \
              <div class="p-1"></div> \
              <input name="password" type="password" id="password" placeholder="Password"/> \
              <div class="p-1" style="color: red" id="error"></div>',
    actions: [
      {
        caption: 'Add',
        cls: 'primary',
        onclick: function() {
          var url = document.getElementById('url').value.trim();
          var name = document.getElementById('name').value.trim();
          var username = document.getElementById('username').value.trim();
          var password = document.getElementById('password').value.trim();
          if (url == '') {
            document.getElementById('error').innerText = '⚠️ URL field required!';
          }
          else if (name == '') {
            document.getElementById('error').innerText = '⚠️ Name field required!';
          }
          else if (username == '') {
            document.getElementById('error').innerText = '⚠️ Username field required!';
          }
          else if (password == '') {
            document.getElementById('error').innerText = '⚠️ Password field required!';
          }
          else {
            addSite(url, name, username, password);
            Metro.dialog.close(dialog);
          }
        }
      },
      {
        caption: 'Cancel',
        cls: 'js-dialog-close secondary'
      }
    ]
  });
}

function addSite(url, name, username, password) {
  var temp_vault = JSON.parse(decryptVault());
  temp_vault.push({url: url, name: name, username: username, password: password});
  console.log(temp_vault);
  var decryptedVault = aesjs.utils.utf8.toBytes(JSON.stringify(temp_vault));
  var ctr = generateCounter();
  var key = aesjs.utils.hex.toBytes(window.sessionStorage['decKey']);
  var aes = new aesjs.ModeOfOperation.ctr(key, aesjs.utils.hex.toBytes(ctr));
  var encryptedVault = aesjs.utils.hex.fromBytes(aes.encrypt(decryptedVault));
  updateVault(encryptedVault, ctr);
}