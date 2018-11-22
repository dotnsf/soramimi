//. settings.js
exports.s2t_apikey = '';
exports.s2t_url = 'https://gateway.watsonplatform.net/speech-to-text/api/';

if( process.env.VCAP_SERVICES ){
  var VCAP_SERVICES = JSON.parse( process.env.VCAP_SERVICES );
  if( VCAP_SERVICES && VCAP_SERVICES.speech_to_text ){
    exports.s2t_apikey = VCAP_SERVICES.speech_to_text[0].credentials.apikey;
    exports.s2t_username = VCAP_SERVICES.speech_to_text[0].credentials.username;
    exports.s2t_password = VCAP_SERVICES.speech_to_text[0].credentials.password;
    exports.s2t_url = VCAP_SERVICES.speech_to_text[0].credentials.url;
  }
}

