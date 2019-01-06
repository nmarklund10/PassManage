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
  var userInfo = {
    username: username,
    password: sha256(username + password),
  };
  sendPostRequest('/login', userInfo, function(response) {
    if (response.success) {
      window.location = 'home/' + response.user;
    }
    else {
      document.getElementById('error').innerText = '⚠️ ' + response.message;
    }
  });
}