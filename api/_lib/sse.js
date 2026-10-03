// Server-Sent Events naar de browser: elke regel "data: <json>".
var claude = require('./claude');

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

function foutMelding(e) {
  if (e instanceof claude.Anthropic.RateLimitError) return 'Claude is even overbelast, probeer het zo opnieuw.';
  if (e instanceof claude.Anthropic.APIError) return 'Claude API-fout (' + e.status + '): ' + (e.message || '').slice(0, 200);
  return e && e.message ? e.message : 'Interne fout';
}

module.exports = { start: start, foutMelding: foutMelding };
