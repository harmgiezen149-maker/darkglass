var http = require('./_lib/http');
var auth = require('./_lib/auth');
var redis = require('./_lib/redis');
var blokken = require('./_lib/blokken');

// GET            → huidige blokken
// GET ?reset=1   → herstel naar eigen standaard (of ingebouwde lijst) — beheer
// POST           → { blocks, setDefault } opslaan — beheer
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST'])) return;
  var q = http.query(req);

  if (req.method === 'GET' && q.reset !== '1') {
    return http.stuur(res, 200, { blocks: await blokken.laad() });
  }

  if (!auth.vereisAdmin(req, res)) return;
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Redis niet geconfigureerd' });

  if (req.method === 'GET') {
    try {
      var eigen = await redis.getJson(blokken.KEY_STANDAARD);
      if (Array.isArray(eigen) && eigen.length) {
        await redis.setJson(blokken.KEY, eigen);
        return http.stuur(res, 200, { blocks: eigen, source: 'custom-default' });
      }
      var std = blokken.getDefaultBlocks();
      await redis.setJson(blokken.KEY, std);
      return http.stuur(res, 200, { blocks: std, source: 'hardcoded' });
    } catch (e) {
      return http.stuur(res, 500, { error: e.message });
    }
  }

  var b = http.body(req);
  if (!Array.isArray(b.blocks)) return http.stuur(res, 400, { error: 'Geen blokken opgegeven' });
  try {
    await redis.setJson(blokken.KEY, b.blocks);
    if (b.setDefault === true) await redis.setJson(blokken.KEY_STANDAARD, b.blocks);
    return http.stuur(res, 200, { ok: true, savedAsDefault: b.setDefault === true });
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }
};
