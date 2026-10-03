var http = require('./_lib/http');
var auth = require('./_lib/auth');
var limiet = require('./_lib/ratelimit');
var claude = require('./_lib/claude');
var sse = require('./_lib/sse');
var ontwerp = require('./_lib/ontwerp');

function kort(s, n) { return String(s || '').trim().slice(0, n); }

function geldigeScene(s) {
  return s && typeof s === 'object' && typeof s.bas_id === 'string' && Array.isArray(s.blokken) && JSON.stringify(s).length < 60000;
}

// POST { modus: 'chat', scene, vraag, geschiedenis, onderzoek, context, taal }
// POST { modus: 'vertaal', scene, taal }
// Antwoord als Server-Sent Events (zie api/analyse.js), met
//   data: {"resultaat": {"scene": {...}, "antwoord": "..."}}
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['POST'])) return;
  if (!auth.vereisApp(req, res)) return;
  var b = http.body(req);
  var taal = b.taal === 'en' ? 'en' : 'nl';
  if (b.modus !== 'chat' && b.modus !== 'vertaal') return http.stuur(res, 400, { error: 'Onbekende modus' });
  if (!geldigeScene(b.scene)) return http.stuur(res, 400, { error: 'Geen geldige preset' });
  if (b.modus === 'chat' && !kort(b.vraag, 10)) return http.stuur(res, 400, { error: 'Vraag ontbreekt' });

  var rl = await limiet.claude(req, 'chat', auth.isAdmin(req));
  if (!rl.ok) return http.stuur(res, 429, { error: rl.melding });
  try { claude.client(); } catch (e) { return http.stuur(res, 500, { error: e.message }); }

  var s = sse.start(res);
  try {
    var r;
    if (b.modus === 'vertaal') {
      s.zend({ fase: 'vertaal', tekst: 'Vertalen' });
      r = await ontwerp.vertaal(b.scene, taal);
    } else {
      var onderzoek = b.onderzoek && typeof b.onderzoek === 'object' && JSON.stringify(b.onderzoek).length < 30000 ? b.onderzoek : null;
      r = await ontwerp.chat({
        scene: b.scene, vraag: kort(b.vraag, 1500), taal: taal, onderzoek: onderzoek, context: kort(b.context, 200),
        geschiedenis: Array.isArray(b.geschiedenis) ? b.geschiedenis.map(String) : [],
        onStatus: function(v) { if (v.tekst) s.zend({ fase: v.fase, tekst: v.tekst }); }
      });
    }
    await claude.registreerKosten(b.modus, r.kosten);
    s.zend({ resultaat: r });
  } catch (e) {
    console.error('Chat mislukt:', e);
    s.zend({ fout: sse.foutMelding(e) });
  }
  s.einde();
};
