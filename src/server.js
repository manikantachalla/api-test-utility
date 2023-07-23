const http = require('http');
const express = require('express');
var bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/oauth2/ausefjy7k3J5S1AXz297/v1/token', urlencodedParser, (req, res) => {
  console.log(req.headers.authorization)
  console.log(req.body.grant_type)
  if (req.headers.authorization != "Basic MG9hanVyaXlxamJGU3lRbGEyOTc6bzVQZjc5S0o4bkhQM2pGWUc3LXNSbEJZOFBQSG5hY2NlbTYzSzVWTg==") {
    res.status(403)
    return res.send("Random format")
  } 
  if (!req.body.grant_type) {
    res.status(400)
    return res.send({
      "error": "invalid_request",
      "error_description": "The token request must specify a 'grant_type'. Valid values: [client_credentials]"
    })
  }
  if (req.body.grant_type !== "client_credentials") {
    res.status(400)
    return res.send({
      "error": "unsupported_grant_type",
      "error_description": "The authorization grant type is not supported by the authorization server. Configured grant types: [client_credentials]."
    })
  }
  return res.send({
    "token_type": "Bearer",
    "expires_in": 900,
    "access_token": "eyJraWQiOiJ4TXZCb3Q4Wm5KN2NRdVZHRGVDYmN2X0lPcU1qeFFMWEFsbzVsSWFGa1JvIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULk8tUlhnX1owZ28ycVkwMnBSRGc2elBkVGlvTW1zemMwNGRFMHRMUmczaEUiLCJpc3MiOiJodHRwczovL3BvcnRhbHNzb3FhLmVsZXZhbmNlaGVhbHRoLmNvbS9vYXV0aDIvYXVzZWZqeTdrM0o1UzFBWHoyOTciLCJhdWQiOiJlbGV2YW5jZWhlYWx0aC5jb20iLCJpYXQiOjE2ODg2MTc2NDUsImV4cCI6MTY4ODYxODU0NSwiY2lkIjoiMG9hanVyaXlxamJGU3lRbGEyOTciLCJzY3AiOlsiZGVmYXVsdHNjb3BlIl0sInN1YiI6IjBvYWp1cml5cWpiRlN5UWxhMjk3In0.CNYQ2KOxs02EFNcsOELBvPoNo-5yOP6c2Zwt13kILePLxM-mQmvtl3q2x3qRP1StINzyILWzFADHrB88w6j4BolxIQGrOHY6Lj-H53iXfsSiHEdr7aw2hxxGRJlyfbATFPMlxEJih00Ki7MWeKi_tX3W5tY2j8auDXCKgEShg__7pO3wyX4MosL43LA7_gTEQROxSPEh5r8PwXVNE-FAOmw9IJSbtZsSS0QqYTCW_S2aH34anu1MchKh1_8PN-74INH9uSwSsRmkXBObzFihFj12umGc8N2QPaCCcxBOtL_XKeKKTI3jxfH6VAXEg86tDDKKPqNfqOpiQWkmlFkJ5Q",
    "scope": "defaultscope"
  })
})

app.post('/oauth2/*', urlencodedParser, (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(Buffer.from(`<!DOCTYPE html>
  <html lang="en">
  
  <head>
    <meta charset="utf-8">
    <title>Error</title>
  </head>
  
  <body>
    <pre>Cannot POST /oauth2/ausefjy7k3J5S1AXz297/v1/tokens</pre>
  </body>
  
  </html>
  `));
})

app.use(express.static('public'));

server.listen(7777, function () {
  console.log('Server running');
});