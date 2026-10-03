var http = require('./_lib/http');
var auth = require('./_lib/auth');
var redis = require('./_lib/redis');

// Setlists: { id, naam, items: [presetId], notitie, datum } in één Redis-hash.
// GET → alle setlists · POST { setlist } → opslaan · DELETE { id } → verwijderen (beheer)
var HASH = 'anagram:setlists';

function geldigId(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id); }

function schoon(s) {
  return {
    id: s.id,
    naam: String(s.naam || 'Setlist').slice(0, 80),
    notitie: String(s.notitie || '').slice(0, 1000),
    items: (Array.isArray(s.items) ? s.items : []).filter(geldigId).slice(0, 100),
    datum: String(s.datum || '').slice(0, 40)
  };
}

module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST', 'DELETE'])) return;
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Redis niet geconfigureerd' });
  if (!auth.vereisApp(req, res)) return;
  try {
    if (req.method === 'GET') {
      var plat = await redis.cmd(['HGETALL', HASH]) || [];
      var lijst = {};
      for (var i = 0; i < plat.length; i += 2) { var s = redis.parseJson(plat[i + 1]); if (s) lijst[plat[i]] = s; }
      return http.stuur(res, 200, { setlists: lijst });
    }
    var b = http.body(req);
    if (req.method === 'POST') {
      if (!b.setlist || !geldigId(b.setlist.id)) return http.stuur(res, 400, { error: 'Geen geldige setlist' });
      var sl = schoon(b.setlist);
      await redis.cmd(['HSET', HASH, sl.id, JSON.stringify(sl)]);
      return http.stuur(res, 200, { ok: true, setlist: sl });
    }
    if (!auth.vereisAdmin(req, res)) return;
    if (!geldigId(b.id)) return http.stuur(res, 400, { error: 'Geen id' });
    await redis.cmd(['HDEL', HASH, b.id]);
    return http.stuur(res, 200, { ok: true });
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }
};
