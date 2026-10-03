var http = require('./_lib/http');
var auth = require('./_lib/auth');
var redis = require('./_lib/redis');

// Presets staan in één Redis-hash (veld = preset-id). Oude losse sleutels
// "preset:<id>" worden de eerste keer automatisch overgezet.
var HASH = 'anagram:presets';
var MIGRATIE = 'anagram:presets:gemigreerd';
var MAX_BYTES = 400000;

async function migreerOudeSleutels() {
  if (await redis.cmd(['GET', MIGRATIE])) return;
  var keys = await redis.cmd(['KEYS', 'preset:*']) || [];
  if (keys.length) {
    var waarden = await redis.cmd(['MGET'].concat(keys));
    var hset = [HASH];
    keys.forEach(function(k, i) { if (waarden[i]) hset.push(k.slice('preset:'.length), waarden[i]); });
    if (hset.length > 1) await redis.cmd(['HSET'].concat(hset));
  }
  await redis.cmd(['SET', MIGRATIE, '1']);
}

async function alle() {
  await migreerOudeSleutels();
  var plat = await redis.cmd(['HGETALL', HASH]) || [];
  var presets = {};
  for (var i = 0; i < plat.length; i += 2) {
    var p = redis.parseJson(plat[i + 1]);
    if (p && typeof p === 'object') presets[plat[i]] = p;
  }
  return presets;
}

function geldigId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST', 'DELETE'])) return;
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Upstash niet geconfigureerd' });
  if (!auth.vereisApp(req, res)) return;

  try {
    if (req.method === 'GET') {
      return http.stuur(res, 200, { presets: await alle() });
    }

    var b = http.body(req);

    if (req.method === 'POST') {
      var preset = b.preset;
      if (!preset || !geldigId(preset.id)) return http.stuur(res, 400, { error: 'Geen geldige preset' });
      var json = JSON.stringify(preset);
      if (json.length > MAX_BYTES) return http.stuur(res, 413, { error: 'Preset is te groot' });
      await redis.cmd(['HSET', HASH, preset.id, json]);
      return http.stuur(res, 200, { ok: true });
    }

    // DELETE: alleen beheer, zodat bezoekers niets kunnen wissen.
    if (!auth.vereisAdmin(req, res)) return;
    if (!geldigId(b.id)) return http.stuur(res, 400, { error: 'Geen id opgegeven' });
    await redis.pipeline([['HDEL', HASH, b.id], ['DEL', 'preset:' + b.id]]);
    return http.stuur(res, 200, { ok: true });
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }
};

module.exports.HASH = HASH;
module.exports.alle = alle;
