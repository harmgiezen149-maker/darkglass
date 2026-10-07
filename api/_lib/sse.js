// Server-Sent Events naar de browser: elke regel "data: <json>".
var fouten = require('./fouten');

function start(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.statusCode = 200;
  var gesloten = false;
  return {
    zend: function(obj) { if (!gesloten) res.write('data: ' + (typeof obj === 'string' ? obj : JSON.stringify(obj)) + '\n\n'); },
    einde: function() { if (!gesloten) { res.write('data: [DONE]\n\n'); res.end(); gesloten = true; } }
  };
}

// Korte melding met uitleg (zie fouten.js), voor het "fout"-event.
function foutMelding(e) {
  return fouten.korteMelding(e);
}

// Zendt een fout met details (status, type, request-id, uitleg) en bewaart hem
// voor het API-statusvenster.
async function zendFout(s, waar, e) {
  s.zend({ fout: foutMelding(e), foutDetail: Object.assign({ tijd: new Date().toISOString(), waar: waar }, fouten.beschrijf(e)) });
  await fouten.registreer(waar, e);
}

module.exports = { start: start, foutMelding: foutMelding, zendFout: zendFout };
