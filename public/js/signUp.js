function newUser() {
  var username = document.getElementsByClassName('username')[0].value;
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
  var userInfo = {
    username: username,
    password: sha256(username + password),
  };
  sendPostRequest('/newUser', userInfo, function(response) {
    if (response.success) {
      window.location = 'home/' + response.user;
    }
    else {
      document.getElementById('error').innerText = '⚠️ ' + response.message;
    }
  });
}