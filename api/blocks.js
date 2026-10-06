var http = require('./_lib/http');
var auth = require('./_lib/auth');
var redis = require('./_lib/redis');
var blokken = require('./_lib/blokken');
var Catalogus = require('../shared/catalogus');

// GET            → huidige blokken, meta en apparaatgrenzen
// GET ?reset=1   → herstel naar eigen standaard (of ingebouwde lijst) — beheer
// POST           → { blocks, setDefault } opslaan, of { limieten } — beheer
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST'])) return;
  var q = http.query(req);

  if (req.method === 'GET' && q.reset !== '1') {
    var r = await Promise.all([blokken.laad(), blokken.laadMeta(), blokken.laadLimieten()]);
    return http.stuur(res, 200, { blocks: r[0], meta: r[1], limieten: r[2] });
  }

  if (!auth.vereisAdmin(req, res)) return;
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Redis niet geconfigureerd' });

  if (req.method === 'GET') {
    try {
      var eigen = Catalogus.normaliseerCatalogus(await redis.getJson(blokken.KEY_STANDAARD));
      if (eigen.length) {
        await blokken.bewaar(eigen);
        return http.stuur(res, 200, { blocks: eigen, source: 'custom-default' });
      }
      var std = blokken.standaard();
      await blokken.bewaar(std);
      return http.stuur(res, 200, { blocks: std, source: 'hardcoded' });
    } catch (e) {
      return http.stuur(res, 500, { error: e.message });
    }
  }

  var b = http.body(req);
  if (b.limieten && !Array.isArray(b.blocks)) {
    try { return http.stuur(res, 200, { ok: true, limieten: await blokken.bewaarLimieten(b.limieten) }); }
    catch (e) { return http.stuur(res, 500, { error: e.message }); }
  }
  if (!Array.isArray(b.blocks)) return http.stuur(res, 400, { error: 'Geen blokken opgegeven' });
  try {
    var cat = await blokken.bewaar(b.blocks);
    if (b.setDefault === true) await redis.setJson(blokken.KEY_STANDAARD, cat);
    return http.stuur(res, 200, { ok: true, blocks: cat, savedAsDefault: b.setDefault === true });
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }
};
