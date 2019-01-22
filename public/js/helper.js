function createCsrfTokenField() {

}

function catchGenericError(error) {
  window.alert('An error occured on the server.');
}

function sendPostRequest(url, data, success, error=catchGenericError)
{
  sendHTTPRequest(url, data, success, false, true, error);
}

function sendGetRequestForJSON(url,query,success,error=catchGenericError)
{
  sendHTTPRequest(url, query, success, true, true, error);
}

function sendGetRequestForHTML(url,query,success,error=catchGenericError)
{
  sendHTTPRequest(url, query, success, true, false, error);
}

function sendHTTPRequest(url, params, responseHandler, sendGet, handleAsJson, error=catchGenericError)
{
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
      if (xhr.readyState == 4) {
          var response = xhr.responseText;
          if (xhr.status == 200) {
              if (handleAsJson)
                  response = JSON.parse(response);
              responseHandler(response)
          }
          else {
              error(response);
          }
      }
  }, false);
  if (sendGet) {
      var url = url + '?params=' + encodeURIComponent(JSON.stringify(params));
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.setRequestHeader("X-CSRF-Token", csrf_token);
      xhr.send();
  }
  else {
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.setRequestHeader("X-CSRF-Token", csrf_token);
      var data = JSON.stringify(params);
      xhr.send(data);
  }
}