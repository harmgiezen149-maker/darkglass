var http = require('./_lib/http');
var auth = require('./_lib/auth');
var limiet = require('./_lib/ratelimit');
var claude = require('./_lib/claude');
var sse = require('./_lib/sse');
var ontwerp = require('./_lib/ontwerp');
var tijden = require('./_lib/tijden');

function kort(s, n) { return String(s || '').trim().slice(0, n); }

// POST { artist, song, bassen: [ids], extra, taal, vers, model, effort, diepte: 'hoog'|'laag' } → Server-Sent Events:
//   data: {"fase": "onderzoek"|"ontwerp"|"controle", "tekst": "..."}   voortgang
//   data: {"onderzoek": {...}}                                        toneprofiel zodra het klaar is
//   data: {"resultaat": {artiest, song, scenes, onderzoek, kosten}}
//   data: {"fout": "..."}
//   data: [DONE]
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['POST'])) return;
  if (!auth.vereisApp(req, res)) return;
  var b = http.body(req);
  var artist = kort(b.artist, 120), song = kort(b.song, 160);
  if (!artist || !song) return http.stuur(res, 400, { error: 'Artiest en song zijn verplicht' });

  var rl = await limiet.claude(req, 'analyse', auth.isAdmin(req));
  if (!rl.ok) return http.stuur(res, 429, { error: rl.melding });
  try { claude.client(); } catch (e) { return http.stuur(res, 500, { error: e.message }); }

  var s = sse.start(res);
  try {
    var r = await ontwerp.analyse({
      artist: artist, song: song,
      bassen: Array.isArray(b.bassen) ? b.bassen.slice(0, 3).map(String) : [],
      extra: kort(b.extra, 1500), taal: b.taal === 'en' ? 'en' : 'nl', vers: b.vers === true,
      model: b.model, effort: b.effort, diepte: b.diepte === 'hoog' ? 'hoog' : 'laag',
      onStatus: function(v) {
        if (v.onderzoek) s.zend({ onderzoek: v.onderzoek });
        if (v.tekst) s.zend({ fase: v.fase, tekst: v.tekst });
      }
    });
    await claude.registreerKosten('analyse', r.kosten, r.ai.model);
    await tijden.registreer(r);
    s.zend({ resultaat: r });
  } catch (e) {
    console.error('Analyse mislukt:', e);
    s.zend({ fout: sse.foutMelding(e) });
  }
  s.einde();
};
