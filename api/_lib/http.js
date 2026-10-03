// Kleine helpers voor de Vercel-handlers.

function body(req) {
  var b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch (e) { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}

function query(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  var q = {};
  var i = (req.url || '').indexOf('?');
  if (i !== -1) new URLSearchParams(req.url.slice(i + 1)).forEach(function(v, k) { q[k] = v; });
  return q;
}

function stuur(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(data);
}

// Muterende verzoeken moeten JSON zijn: een cross-site formulier kan geen
// application/json sturen zonder preflight, en die staan we niet toe.
function isJsonVerzoek(req) {
  var ct = (req.headers && req.headers['content-type']) || '';
  return ct.indexOf('application/json') !== -1;
}

function clientIp(req) {
  var f = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '';
  return String(f).split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'onbekend';
}

// Controleert methode en JSON-content-type. Geeft false terug als er al een
// antwoord is gestuurd.
function vereisMethode(req, res, methodes) {
  if (methodes.indexOf(req.method) === -1) {
    res.setHeader('Allow', methodes.join(', '));
    stuur(res, 405, { error: 'Methode niet toegestaan' });
    return false;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && !isJsonVerzoek(req)) {
    stuur(res, 415, { error: 'Verwacht application/json' });
    return false;
  }
  return true;
}

module.exports = { body: body, query: query, stuur: stuur, clientIp: clientIp, vereisMethode: vereisMethode };
