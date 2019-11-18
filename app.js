//.  app.js
var express = require( 'express' ),
    basicAuth = require( 'basic-auth-connect' ),
    execSync = require( 'child_process' ).execSync,
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
  //console.log( req.body );
  //. https://www.ibm.com/watson/developercloud/speech-to-text/api/v1/?node#recognize_sessionless_nonmp12
  //. req.file.path に audio/wav
  var filepath = req.file.path;
  var model = req.body.voice;  //'ja-JP_BroadbandModel';
  ///console.log( 'model = ' + model );

  var params = {
    audio: fs.createReadStream( filepath ),
    content_type: 'audio/wav',
    model: model,
    max_alternatives: 3,
    timestamps: true
  };
  //console.log( params );
  speech_to_text.recognize( params, function( error, result ){
    if( error ){
      console.log( JSON.stringify( error, null, 2 ) );
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

app.post( '/spleeter_s2t', function( req, res ){
//app.get( '/spleeter_s2t', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var filename = req.file.filename;   //. a6945498f7...

  res.write( JSON.stringify( { status: true, id: filename }, 2, null ) );
  res.end();

  setTimeout( function(){
    var originalname = req.file.originalname;  //. audio_example.mp3
    var filepath = req.file.path;  //. tmp/a6945498f7...
    var model = 'ja-JP_BroadbandModel'; //req.body.voice;  //'ja-JP_BroadbandModel';

    //. split vocal data
    var command = settings.spleeter_command +  ' -i ' + filepath + ' -o ./out';
    var command_result = execSync( command );

    //. .tmp/{{filename}}/vocals.wav
    var vocals = './out/' + filename + '/vocals.wav';
    var params = {
      audio: fs.createReadStream( vocals ),
      content_type: 'audio/wav',
      model: model,
      max_alternatives: 3,
      timestamps: true
    };
    //console.log( params );
    speech_to_text.recognize( params, function( error, result ){
      /* ファイルは消す必要ない？
      fs.unlinkSync( filepath );
      fs.unlinkSync( './out/' + filename + '/accompaniment.wav' );
      fs.rmdirSync( './out/' + filename );
      */
      //. オリジナルを保存
      fs.rename( filepath, './out/' + filename + '/' + originalname, function(){
        var resultfile = './out/' + filename + '/result.json';
        if( error ){
          var text = JSON.stringify( { status: false, error: err }, null, 2 );
          console.log( JSON.stringify( error, null, 2 ) );
          fs.writeFile( resultfile, text, function(){} );
          //res.write( JSON.stringify( { status: false, error: error }, 2, null ) );
          //res.end();
        }else{
          var text = JSON.stringify( { status: true, results: result.results }, null, 2 );
          console.log( JSON.stringify( result, null, 2 ) );
          fs.writeFile( resultfile, text, function(){} );
          //res.write( JSON.stringify( { status: true, results: result.results }, 2, null ) );
          //res.end();
        }
      });
    });
  }, 500 );
});

app.get( '/check/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.params.id;
  if( id ){
    var filepath = './out/' + id + '/result.json';
    if( isFileExist( filepath ) ){
      var json = fs.readFileSync( filepath, 'utf-8' );
      res.write( json );
      res.end();
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, error: 'not existed, or not finished yet.' }, 2, null ) );
      res.end();
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'parameter id required.' }, 2, null ) );
    res.end();
  }
});

function isFileExist( filepath ){
  try{
    fs.statSync( filepath );
    return true;
  }catch( err ){
    return false;
  }
}


var port = process.env.port || 3000;
app.listen( port );
console.log( "server starting on " + port + " ..." );
