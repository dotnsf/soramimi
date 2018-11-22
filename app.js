//.  app.js
var express = require( 'express' ),
    basicAuth = require( 'basic-auth-connect' ),
    cfenv = require( 'cfenv' ),
    multer = require( 'multer' ),
    bodyParser = require( 'body-parser' ),
    fs = require( 'fs' ),
    ejs = require( 'ejs' ),
    s2t = require( 'watson-developer-cloud/speech-to-text/v1' ),
    settings = require( './settings' ),
    app = express();
var speech_to_text = null;
if( settings.s2t_apikey ){
  //speech_to_text = new s2t({ iam_apikey: settings.s2t_apikey, url: 'https://gateway.watsonplatform.net/speech-to-text/api/' } ); 
  speech_to_text = new s2t({ username: 'apikey', password: settings.s2t_apikey, url: settings.s2t_url } ); 
}else if( settings.s2t_username && settings.s2t_password ){
  speech_to_text = new s2t({ username: settings.s2t_username, password: settings.s2t_password });
}
var appEnv = cfenv.getAppEnv();

app.use( multer( { dest: './tmp/' } ).single( 'data' ) );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.static( __dirname + '/public' ) );

var lang = 'ja';

app.get( '/', function( req, res ){
  var template = fs.readFileSync( __dirname + '/public/index.ejs', 'utf-8' );
  res.write( ejs.render( template, { lang: lang } ) );
  res.end();
});

app.post( '/s2t', function( req, res ){
console.log( req.body );
  //. https://www.ibm.com/watson/developercloud/speech-to-text/api/v1/?node#recognize_sessionless_nonmp12
  //. req.file.path に audio/wav
  var filepath = req.file.path;
  var model = req.body.voice;  //'ja-JP_BroadbandModel';
console.log( 'model = ' + model );

  var params = {
    audio: fs.createReadStream( filepath ),
    content_type: 'audio/wav',
    model: model,
    timestamps: true
  };
console.log( params );
  speech_to_text.recognize( params, function( error, result ){
    if( error ){
console.log( error );
      res.write( JSON.stringify( { status: false, error: error }, 2, null ) );
      res.end();
    }else{
      console.log( JSON.stringify( result, null, 2 ) );
      res.write( JSON.stringify( { status: true, results: result.results }, 2, null ) );
      res.end();
    }
    fs.unlink( filepath, function(e){} );
  });
});


var port = appEnv.port || 3000;
app.listen( port );
console.log( "server starting on " + port + " ..." );



