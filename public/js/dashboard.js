function displayVault() {
  if ('vault' in window.sessionStorage) {
    document.getElementById('message').innerText = 'Your Stuff: ' + window.sessionStorage.vault;
  }
  else {
    window.sessionStorage = {};
    window.location = '/';
  }
}