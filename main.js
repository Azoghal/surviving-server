var express = require('express');
var querystring = require('querystring');
var request = require('request'); 
var cookieParser = require('cookie-parser');
var cors = require('cors');

var client_id = process.env.SPOTIFY_CLIENT_ID;
var client_secret = process.env.SPOTIFY_CLIENT_SECRET;
var redirect_uri = "https://gcp-test-379914.nw.r.appspot.com/callback"
var app_url = "https://surviving-song.vercel.app/survivingSongs"; 

var stateKey = 'spotify_auth_state';

var app = express();
app.use(express.static(__dirname + '/public')).use(cors()).use(cookieParser());

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.get('/',(req,res)=>{
  var message = 'Spotify-Auth-Server for Surviving-Song ';
  res.send(message);
})

// Various gets on different paths to redirect to different pages? Can't be the best way

app.get('/login', (req, res) => {
  // set a cookie with random state
  var state = generateRandomString(16);
  res.cookie(stateKey, state);


  console.log(`login request from: ${req.protocol}://${req.get('host')}${req.originalUrl}`)

  // required scopes for playlist reading
  var scope = 'playlist-read-private playlist-read-collaborative user-read-email user-read-private';
  res.redirect('https://accounts.spotify.com/authorize?' + 
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    })
  )
})

app.get('/callback', (req, res) => {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies? req.cookies[stateKey] : null;

  if(state === null || state !== storedState) {
    res.redirect('/#' + 
      querystring.stringify({
        error: 'state_mismatch'
      }));
  }
  else{
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code:code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        // res.send({
        //   access_token: access_token,
        //   refresh_token: refresh_token,
        // })

        //we can also pass the token to the browser to make requests from there
        res.redirect(app_url+'/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' + querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

// app.get('/refresh_token', function(req, res) {
//   var refresh_token = req.query.refresh_token;
//   var authOptions = {
//     url: 'https://accounts.spotify.com/api/token',
//     headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
//     form:{
//       grant_type: 'refresh_token',
//       refresh_token: refresh_token
//     },
//     json: true
//   };

//   request.post(authOptions, function(error, response, body) {
//     if (!error && response.statusCode === 200) {
//       var access_token = body.access_token;
//       res.send({
//         'access_token': access_token
//       });
//     }
//   });
// })

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});