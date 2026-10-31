var http = require('./_lib/http');
var auth = require('./_lib/auth');
var redis = require('./_lib/redis');
var sleutel = require('./_lib/claudesleutel');

// De Claude-koppeling beheren (alleen beheerders, vanuit beheer.html).
// GET → huidige sleutel · POST → nieuwe sleutel (trekt de oude in) · DELETE → intrekken
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST', 'DELETE'])) return;
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Redis niet geconfigureerd' });
  if (!auth.vereisAdmin(req, res)) return;
  try {
    if (req.method === 'GET') return http.stuur(res, 200, { sleutel: await sleutel.huidige() });
    if (req.method === 'POST') return http.stuur(res, 200, { sleutel: await sleutel.maak() });
    await sleutel.wis();
    return http.stuur(res, 200, { sleutel: null });
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }
};
