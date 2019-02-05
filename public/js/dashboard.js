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
  hideFloatingButtons();
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
                  showFloatingButtons();
                  Metro.dialog.close(dialog);
                }
              }
            ]
          });
        }
      },
      {
        caption: 'Cancel',
        cls: 'js-dialog-close secondary',
        onclick: function() {
          showFloatingButtons();
        }
      }
    ]
  });
}

function initialize() {
  document.getElementById('welcome').innerText = window.sessionStorage['user'];
  document.getElementById('user').src = '/public/images/user.png';
  displayVault();
}

function displayCardActions(card) {
  var footerChildren = card.childNodes[1].childNodes;
  footerChildren[1].style.visibility = 'visible';
  footerChildren[2].style.visibility = 'visible';
}

function clearCardActions(card) {
  var footerChildren = card.childNodes[1].childNodes;
  footerChildren[1].style.visibility = 'hidden';
  footerChildren[2].style.visibility = 'hidden';
}

function searchVault(input) {
  var tempVault = JSON.parse(decryptVault());
  var sortedVault = [];
  for(var i = 0; i < tempVault.length; i++) {
    var currentSite = tempVault[i];
    if (currentSite.name.includes(input)) {
      sortedVault.push(currentSite);
    }
    else if (currentSite.username.includes(input)) {
      sortedVault.push(currentSite);
    }
    else if (currentSite.url.includes(input)) {
      sortedVault.push(currentSite);
    }
  }
  displayVault(sortedVault, 'No Sites Found!');
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

function compareSite(one, two) {
  var site1 = one.name.toLowerCase();
  var site2 = two.name.toLowerCase();
  if (site1 > site2) {
    return 1;
  }
  else if (site1 < site2) {
    return -1;
  }
  return 0;
}

function addRow(num) {
  var newRow = document.createElement('div');
  newRow.className = 'row';
  newRow.id = 'row' + num;
  document.getElementById('vaultDisplay').appendChild(newRow);
  return newRow;
}

function displayEmptyVault(msg='You have no sites yet!') {
  var row = addRow(0);
  var newCell = document.createElement('div');
  newCell.className = 'empty cell-4 offset-4';
  newCell.innerText = '\n' + msg;
  row.appendChild(newCell);
  document.getElementsByClassName('action-button')[0].style.visibility = 'visible';
  document.getElementsByClassName('action-button')[1].style.visibility = 'hidden';
}

function clearGrid() {
  document.getElementById('vaultDisplay').innerHTML = '';
}

function checkImageExistence(header, imageUrl) {
  var image = new Image();
  image.onload = function(image) {
    if (image.width != 0) {
      header.style.backgroundImage = 'url(\''+ imageUrl +'\')';
    }
  }
  image.src = imageUrl;
}

function setCardBackground(header, url) {
  var splitUrl = url.split('://');
  header.style.backgroundImage = 'url(\'https://localhost/public/images/default.png\')';
  if (splitUrl.length == 1) {
    var imageUrl = 'https://' + splitUrl[0] + '/favicon.ico';
    checkImageExistence(header, imageUrl);
  }
  else {
    var protocol = splitUrl[0];
    var host = splitUrl[1].split('/')[0];
    var imageUrl = protocol + '://' + host + '/favicon.ico';
    checkImageExistence(header, imageUrl);
  }
}

function makeCardHeader(card, url) {
  var header = document.createElement('div');
  header.className = 'card-header';
  setCardBackground(header, url);

  card.appendChild(header);
}

function openEditSite(num) {
  hideFloatingButtons();
  var tempVault = JSON.parse(decryptVault());
  var site = tempVault[num];
  var dialog = Metro.dialog.create({
    title: "Edit Site",
    content: '<div class="p-1 edit">Url:</div> \
              <input type="text" id="url" value=\"' + site.url + '\"/> \
              <div class="p-1 edit">Name:</div> \
              <input type="text" id="name" value=\"' + site.name + '\"/> \
              <div class="p-1 edit">Username:</div> \
              <input type="text" id="username" value=\"' + site.username + '\"/> \
              <div class="p-1 edit">Password:</div> \
              <input type="password" data-role="input" id="password" value=\"' + site.password + '\"/> \
              <div class="p-1" style="color: red" id="error"></div>',
    actions: [
      {
        caption: 'Save Changes',
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
            tempVault[num] = {url: url, name: name, username: username, password: password};
            tempVault.sort(compareSite);
            var decryptedVault = aesjs.utils.utf8.toBytes(JSON.stringify(tempVault));
            var ctr = generateCounter();
            var key = aesjs.utils.hex.toBytes(window.sessionStorage['decKey']);
            var aes = new aesjs.ModeOfOperation.ctr(key, aesjs.utils.hex.toBytes(ctr));
            var encryptedVault = aesjs.utils.hex.fromBytes(aes.encrypt(decryptedVault));
            updateVault(encryptedVault, ctr);
            Metro.dialog.close(dialog);
          }
        }
      },
      {
        caption: 'Close',
        cls: 'secondary',
        onclick: function() {
          Metro.dialog.create({
            title: 'Any unsaved changes will be lost!',
            actions: [
              {
                caption: 'Ok',
                cls: 'js-dialog-close primary',
                onclick: function() {
                  showFloatingButtons();
                  Metro.dialog.close(dialog);
                }
              },
              {
                caption: 'Cancel',
                cls: 'js-dialog-close secondary'
              }
            ]
          });
        }
      }
    ]
  });
}

function hideFloatingButtons() {
  document.getElementsByClassName('action-button')[0].style.visibility = 'hidden';
  document.getElementsByClassName('action-button')[1].style.visibility = 'hidden';
}

function showFloatingButtons() {
  document.getElementsByClassName('action-button')[0].style.visibility = 'visible';
  document.getElementsByClassName('action-button')[1].style.visibility = 'visible';
}

function openDeleteSite(num) {
  hideFloatingButtons();
  var dialog = Metro.dialog.create({
    title: 'Are you sure you want to delete this site?',
    actions: [
      {
        caption: 'Delete Site',
        cls: 'primary js-dialog-close',
        onclick: function() {
          var tempVault = JSON.parse(decryptVault());
          tempVault.splice(num, 1);
          tempVault.sort(compareSite);
          var decryptedVault = aesjs.utils.utf8.toBytes(JSON.stringify(tempVault));
          var ctr = generateCounter();
          var key = aesjs.utils.hex.toBytes(window.sessionStorage['decKey']);
          var aes = new aesjs.ModeOfOperation.ctr(key, aesjs.utils.hex.toBytes(ctr));
          var encryptedVault = aesjs.utils.hex.fromBytes(aes.encrypt(decryptedVault));
          updateVault(encryptedVault, ctr);
        }
      },
      {
        caption: "Cancel",
        cls: "js-dialog-close",
        onclick: function() {
          showFloatingButtons();
        }
    }
    ]
  });
}

function makeCardFooter(card, name, username, num) {
  var newFooter = document.createElement('div');
  newFooter.className = 'card-footer';
  var text = document.createElement('div');
  text.className = 'text';
  text.innerHTML = '<strong>' + name + '</strong><br/><div>' + username + '</div></div>';
  var editButton = document.createElement('button');
  editButton.className = 'button primary';
  editButton.title = 'View Site';
  editButton.innerHTML = '<span class=\'mif-wrench\'></span>';
  editButton.onclick = () => {
    openEditSite(num);
  }
  var deleteButton = document.createElement('button');
  deleteButton.className = 'delete button bg-red fg-white';
  deleteButton.title = 'Delete Site';
  deleteButton.innerHTML = '<span class=\'mif-bin\'></span>';
  deleteButton.onclick = () => {
    openDeleteSite(num);
  }
  newFooter.appendChild(text);
  newFooter.appendChild(editButton);
  newFooter.appendChild(deleteButton);
  card.appendChild(newFooter);
}

function addCell(num, row, site) {
  var newCell = document.createElement('div');
  newCell.className = 'cell-3';
  var newCard = document.createElement('div');
  newCard.className = 'card image-header bg-white';
  newCard.id = 'site' + num;
  makeCardHeader(newCard, site.url);
  makeCardFooter(newCard, site.name, site.username, num);
  newCard.onmouseover = function() {
    displayCardActions(newCard);
  }
  newCard.onmouseleave = function() {
    clearCardActions(newCard);
  }
  newCell.appendChild(newCard);
  row.appendChild(newCell);
}

function displayVault(alt=0, msg='You have no sites yet!') {
  if ('vault' in window.sessionStorage && 'decKey' in window.sessionStorage) {
    var tempVault = alt;
    if (alt == 0) {
      tempVault = JSON.parse(decryptVault());
    }
    clearGrid();
    if (tempVault.length == 0) {
      displayEmptyVault(msg);
    }
    else {
      var numRows = ((tempVault.length - 1)  / 4) + 1;
      var siteNum = 0;
      for (var i = 0; i < numRows; ++i) {
        var newRow = addRow(i);
        var numCells;
        var progress = tempVault.length - siteNum;
        if (progress >= 4) {
          numCells = 4;
        }
        else {
          numCells = progress % 4;
        }
        for (var j = 0; j < numCells; ++j) {
          addCell(siteNum, newRow, tempVault[siteNum]);
          siteNum++;
        }
      }
      document.getElementsByClassName('action-button')[1].style.visibility = 'visible';
    }
    document.getElementsByClassName('action-button')[0].style.visibility = 'visible';
  }
  else {
    clearSession();
    window.location = '/';
  }
}

function openAddSite() {
  var clearVaultVisibility = document.getElementsByClassName('action-button')[1].style.visibility;
  hideFloatingButtons();
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
        cls: 'js-dialog-close secondary',
        onclick: function() {
          document.getElementsByClassName('action-button')[0].style.visibility = 'visible';
          document.getElementsByClassName('action-button')[1].style.visibility = clearVaultVisibility;
        }
      }
    ]
  });
}

function addSite(url, name, username, password) {
  var tempVault = JSON.parse(decryptVault());
  tempVault.push({url: url, name: name, username: username, password: password});
  tempVault.sort(compareSite);
  var decryptedVault = aesjs.utils.utf8.toBytes(JSON.stringify(tempVault));
  var ctr = generateCounter();
  var key = aesjs.utils.hex.toBytes(window.sessionStorage['decKey']);
  var aes = new aesjs.ModeOfOperation.ctr(key, aesjs.utils.hex.toBytes(ctr));
  var encryptedVault = aesjs.utils.hex.fromBytes(aes.encrypt(decryptedVault));
  updateVault(encryptedVault, ctr);
}