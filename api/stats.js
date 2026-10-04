var http = require('./_lib/http');
var auth = require('./_lib/auth');
var redis = require('./_lib/redis');

var Modellen = require('../shared/modellen');

var EVENTS = ['analyse', 'save', 'visit', 'chat', 'vertaal', 'feedback'];

function dagKey(d) {
  return d.toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST'])) return;
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Redis niet geconfigureerd' });

  // POST — verhoog tellers (alleen bekende events, geen vrije sleutels)
  if (req.method === 'POST') {
    var b = http.body(req);
    if (EVENTS.indexOf(b.event) === -1) return http.stuur(res, 400, { error: 'Onbekend event' });
    var meta = b.meta && typeof b.meta === 'object' ? b.meta : {};
    var bas = typeof meta.bass === 'string' ? meta.bass.replace(/[^a-z0-9_-]/gi, '').slice(0, 32) : '';
    var cmds = [
      ['INCR', 'stats:' + b.event + ':total'],
      ['INCR', 'stats:' + b.event + ':day:' + dagKey(new Date())],
      ['SET', 'stats:lastEvent', JSON.stringify({ event: b.event, meta: bas ? { bass: bas } : {}, ts: Date.now() })]
    ];
    if (bas) cmds.push(['INCR', 'stats:bass:' + bas]);
    try {
      await redis.pipeline(cmds);
      return http.stuur(res, 200, { ok: true });
    } catch (e) {
      return http.stuur(res, 500, { error: e.message });
    }
  }

  // GET — dashboard (beheer)
  if (!auth.vereisAdmin(req, res)) return;
  try {
    var dagen = [];
    for (var i = 29; i >= 0; i--) {
      var d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      dagen.push(dagKey(d));
    }
    var vast = ['stats:analyse:total', 'stats:save:total', 'stats:visit:total',
      'stats:bass:spector', 'stats:bass:pbass', 'stats:bass:beide', 'stats:lastEvent',
      'stats:kosten:micro:total', 'stats:tokens:total', 'stats:zoekopdrachten:total',
      'stats:kosten:micro:analyse', 'stats:kosten:micro:chat', 'stats:kosten:micro:vertaal', 'stats:kosten:micro:sync',
      'stats:feedback:total'];
    var modelIds = Modellen.MODELLEN.map(function(m) { return m.id; });
    var keys = vast
      .concat(dagen.map(function(k) { return 'stats:analyse:day:' + k; }))
      .concat(dagen.map(function(k) { return 'stats:kosten:micro:day:' + k; }))
      .concat(modelIds.map(function(id) { return 'stats:kosten:micro:model:' + id; }));
    var w = await redis.cmd(['MGET'].concat(keys));
    var n = function(i) { return parseInt(w[i] || '0', 10); };
    var dollar = function(i) { return n(i) / 1e6; };

    var laatst = null;
    if (w[6]) { try { laatst = JSON.parse(w[6]); } catch (e) {} }

    return http.stuur(res, 200, {
      ok: true,
      totalen: { analyses: n(0), saves: n(1), visits: n(2), feedback: n(14) },
      bassen: { spector: n(3), pbass: n(4), beide: n(5) },
      kosten: {
        totaal: dollar(7), tokens: n(8), zoekopdrachten: n(9),
        perSoort: { analyse: dollar(10), chat: dollar(11), vertaal: dollar(12), sync: dollar(13) },
        perAnalyse: n(0) ? dollar(10) / n(0) : 0,
        perModel: Modellen.MODELLEN.map(function(m, j) {
          return { id: m.id, naam: m.naam, dollar: dollar(vast.length + 2 * dagen.length + j) };
        })
      },
      dagen: dagen.map(function(k, j) {
        return { datum: k, aantal: n(vast.length + j), kosten: dollar(vast.length + dagen.length + j) };
      }),
      laatsteEvent: laatst
    });
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }
};
