var http = require('./_lib/http');
var auth = require('./_lib/auth');
var limiet = require('./_lib/ratelimit');

// GET    → wie ben ik (app/admin-status)
// POST   → { rol: 'app'|'admin', wachtwoord } zet een sessie-cookie
// DELETE → uitloggen
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST', 'DELETE'])) return;

  if (req.method === 'GET') return http.stuur(res, 200, auth.status(req));

  if (req.method === 'DELETE') {
    auth.wisSessies(res, req);
    return http.stuur(res, 200, { ok: true });
  }

  var b = http.body(req);
  var rol = b.rol === 'admin' ? 'admin' : 'app';

  // Remt raden van wachtwoorden af: 10 pogingen per kwartier per IP.
  var r = await limiet.tel('login:' + http.clientIp(req), 10, 900);
  if (!r.ok) return http.stuur(res, 429, { error: 'Te veel pogingen, probeer het later opnieuw.' });

  if (!auth.wachtwoordKlopt(rol, b.wachtwoord)) {
    return http.stuur(res, 401, { error: 'Verkeerd wachtwoord', rol: rol });
  }
  auth.zetSessie(res, req, rol);
  return http.stuur(res, 200, { ok: true, rol: rol });
};
