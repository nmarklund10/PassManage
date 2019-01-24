function login() {
  var username = document.getElementsByClassName('username')[0].value;
  var password = document.getElementsByClassName('password')[0].value;
  if (username == '') {
    document.getElementById('error').innerText = '⚠️ Username field required!';
    return;
  }
  if (password == '') {
    document.getElementById('error').innerText = '⚠️ Password field required!';
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
  sendPostRequest('/login', userInfo, function(response) {
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