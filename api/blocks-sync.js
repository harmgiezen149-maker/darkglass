var http = require('./_lib/http');
var auth = require('./_lib/auth');
var redis = require('./_lib/redis');
var sync = require('./_lib/sync');
var fouten = require('./_lib/fouten');

// GET                  → toestand van de sync (status, inventaris, voorstellen) — beheer
// GET ?cron=1          → wekelijkse controle via Vercel Cron (CRON_SECRET)
// POST { actie, ... }  → check | inventaris | sectie | vergelijk | releasenotes | toepassen | wis — beheer
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['GET', 'POST'])) return;
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Redis niet geconfigureerd' });
  var q = http.query(req);

  if (req.method === 'GET' && q.cron === '1') return cron(req, res);
  if (!auth.vereisAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      var st = await sync.toestand();
      st.updateBeschikbaar = sync.updateBeschikbaar(st);
      st.batches = st.inventaris ? sync.batches(st.inventaris) : [];
      return http.stuur(res, 200, st);
    }

    var b = http.body(req);
    switch (b.actie) {
      case 'check':
        var uit = {};
        try { uit.status = await sync.checkHandleiding(b.url); } catch (e) { uit.handleidingFout = e.message; }
        if (b.metReleaseNotes) uit.releaseNotes = await sync.releaseNotes();
        return http.stuur(res, 200, uit);
      case 'inventaris':
        var bron = b.base64 ? { base64: b.base64 } : { url: b.url };
        return http.stuur(res, 200, await sync.inventaris(bron));
      case 'sectie':
        if (!b.batch) return http.stuur(res, 400, { error: 'batch ontbreekt' });
        return http.stuur(res, 200, await sync.leesBatch(String(b.batch)));
      case 'vergelijk':
        return http.stuur(res, 200, await sync.vergelijkHandleiding());
      case 'releasenotes':
        return http.stuur(res, 200, await sync.releaseNotes());
      case 'toepassen':
        if (!Array.isArray(b.besluiten)) return http.stuur(res, 400, { error: 'besluiten ontbreken' });
        return http.stuur(res, 200, await sync.toepassen(b.besluiten));
      case 'wis':
        await sync.wisVoorstellen();
        return http.stuur(res, 200, { ok: true });
      default:
        return http.stuur(res, 400, { error: 'Onbekende actie' });
    }
  } catch (e) {
    console.error('Sync-fout:', e);
    await fouten.registreer('blok-sync', e);
    return http.stuur(res, 500, { error: fouten.korteMelding(e), foutDetail: fouten.beschrijf(e) });
  }
};

// Vercel Cron stuurt "Authorization: Bearer <CRON_SECRET>" mee als die is ingesteld.
async function cron(req, res) {
  var geheim = process.env.CRON_SECRET;
  if (!geheim || (req.headers.authorization || '') !== 'Bearer ' + geheim) {
    return http.stuur(res, 401, { error: 'Geen toegang' });
  }
  var uit = {};
  try { uit.handleiding = await sync.checkHandleiding(); } catch (e) { uit.handleidingFout = e.message; }
  if (process.env.SYNC_CRON_RELEASENOTES !== '0' && process.env.ANTHROPIC_API_KEY) {
    try { uit.releaseNotes = (await sync.releaseNotes()).status.releaseNotes; } catch (e) { uit.releaseNotesFout = e.message; }
  }
  return http.stuur(res, 200, uit);
}
