var http = require('./_lib/http');
var auth = require('./_lib/auth');
var rig = require('./_lib/rig');

// GET  → de rig (bassen, uitgang, speelstijl)
// POST → { rig } opslaan (beheer)
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    return http.stuur(res, 200, { rig: await rig.laad() });
  }

  if (!auth.vereisAdmin(req, res)) return;
  var b = http.body(req);
  if (!b.rig || !Array.isArray(b.rig.bassen) || !b.rig.bassen.length) {
    return http.stuur(res, 400, { error: 'Minstens één bas is nodig' });
  }
  try {
    return http.stuur(res, 200, { ok: true, rig: await rig.bewaar(b.rig) });
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }
};
