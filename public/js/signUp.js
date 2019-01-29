function setupEnterKeyListeners() {
  document.getElementById('username').addEventListener('keyup', function(e) {
    if (e.keyCode === 13) {
      newUser();
    }
  });
  document.getElementsByClassName('password')[0].addEventListener('keyup', function(e) {
    if (e.keyCode === 13) {
      newUser();
    }
  });
  document.getElementsByClassName('password')[1].addEventListener('keyup', function(e) {
    if (e.keyCode === 13) {
      newUser();
    }
  });
  document.getElementById('username').focus();
  document.getElementById('username').select();
}

function newUser() {
  var username = document.getElementById('username').value;
  var password = document.getElementsByClassName('password')[0].value;
  var passwordCheck = document.getElementsByClassName('password')[1].value;
  if (username == '') {
    document.getElementById('error').innerText = '⚠️ Username field required!';
    return;
  }
  if (username.length < 6 || username.length > 20) {
    document.getElementById('error').innerText = '⚠️ Username must be 6-20 characters long!';
    return;
  }
  if (password == '') {
    document.getElementById('error').innerText = '⚠️ Password field required!';
    return;
  }
  if (password.length < 12 || password.length > 64) {
    document.getElementById('error').innerText = '⚠️ Password must be 12-64 characters long!';
    return;
  }
  if (password != passwordCheck) {
    document.getElementById('error').innerText = '⚠️ Passwords do not match!';
    return;
  }
  document.getElementById('error').innerText = '';
  var hash = sha256(username + password);
  for (var i = 0; i < 4999; i++) {
    hash = sha256(hash);
  }
  window.sessionStorage['decKey'] = hash;
  hash = sha256(hash);
  var userInfo = {
    username: username,
    hash: hash,
  };
  sendPostRequest('/newUser', userInfo, function(response) {
    if (response.success) {
      sendPostRequest('/home', {token: response.token}, function(secondResponse) {
        window.sessionStorage['vault'] = secondResponse.vault;
        window.sessionStorage['ctr'] = secondResponse.ctr;
        window.sessionStorage['user'] = username;
        window.location = '/dashboard';
      });
    }
    else {
      document.getElementById('error').innerText = '⚠️ ' + response.message;
    }
  });
}