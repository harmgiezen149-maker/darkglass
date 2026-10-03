var http = require('./_lib/http');
var auth = require('./_lib/auth');
var limiet = require('./_lib/ratelimit');
var claude = require('./_lib/claude');
var prompts = require('./_lib/prompts');
var blokken = require('./_lib/blokken');
var rigLib = require('./_lib/rig');

var MAX_LEN = { artist: 120, song: 160, extra: 1500, vraag: 1500, preset: 40000 };

function kort(s, n) { return String(s || '').trim().slice(0, n); }

// POST { modus: 'analyse'|'chat'|'vertaal', ... } → Server-Sent Events:
//   data: {"text": "..."}          tekst-delta
//   data: {"status": "..."}        voortgang
//   data: {"waarschuwing": "..."}  bv. afgekapt antwoord
//   data: {"fout": "..."}          fout tijdens het streamen
//   data: [DONE]
module.exports = async function handler(req, res) {
  if (!http.vereisMethode(req, res, ['POST'])) return;
  if (!auth.vereisApp(req, res)) return;

  var b = http.body(req);
  var modus = b.modus;
  var taal = b.taal === 'en' ? 'en' : 'nl';

  var verzoek, effort;
  try {
    var secties = await blokken.laad();
    var rig = await rigLib.laad();
    if (modus === 'analyse') {
      var artist = kort(b.artist, MAX_LEN.artist), song = kort(b.song, MAX_LEN.song);
      if (!artist || !song) return http.stuur(res, 400, { error: 'Artiest en song zijn verplicht' });
      verzoek = prompts.analyse({ secties: secties, rig: rig, artist: artist, song: song, bassen: b.bassen, extra: kort(b.extra, MAX_LEN.extra), taal: taal });
      effort = 'high';
    } else if (modus === 'chat') {
      if (!b.preset || !b.vraag) return http.stuur(res, 400, { error: 'Preset en vraag zijn verplicht' });
      verzoek = prompts.chat({
        secties: secties, rig: rig, basId: b.basId, taal: taal,
        preset: kort(b.preset, MAX_LEN.preset), vraag: kort(b.vraag, MAX_LEN.vraag),
        context: kort(b.context, 200), geschiedenis: Array.isArray(b.geschiedenis) ? b.geschiedenis : []
      });
      effort = 'medium';
    } else if (modus === 'vertaal') {
      if (!b.tekst) return http.stuur(res, 400, { error: 'Geen tekst' });
      verzoek = prompts.vertaal({ tekst: kort(b.tekst, MAX_LEN.preset), taal: taal });
      effort = 'low';
    } else {
      return http.stuur(res, 400, { error: 'Onbekende modus' });
    }
  } catch (e) {
    return http.stuur(res, 500, { error: e.message });
  }

  var rl = await limiet.claude(req, modus === 'analyse' ? 'analyse' : 'chat', auth.isAdmin(req));
  if (!rl.ok) return http.stuur(res, 429, { error: rl.melding });

  var c;
  try { c = claude.client(); } catch (e) { return http.stuur(res, 500, { error: e.message }); }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.statusCode = 200;
  function zend(obj) { res.write('data: ' + (typeof obj === 'string' ? obj : JSON.stringify(obj)) + '\n\n'); }

  try {
    var stream = c.beta.messages.stream(claude.metFallback({
      model: claude.MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: { effort: effort },
      system: verzoek.system,
      messages: verzoek.messages
    }));

    var denktGemeld = false;
    for await (var ev of stream) {
      if (ev.type === 'content_block_start' && ev.content_block && ev.content_block.type === 'thinking' && !denktGemeld) {
        zend({ status: 'denkt na' });
        denktGemeld = true;
      } else if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
        zend({ text: ev.delta.text });
      }
    }
    var msg = await stream.finalMessage();
    if (msg.stop_reason === 'max_tokens') zend({ waarschuwing: 'Het antwoord is afgekapt omdat het te lang werd.' });
    if (msg.stop_reason === 'refusal') zend({ fout: 'Claude heeft dit verzoek geweigerd.' });
    await claude.registreerKosten(modus, claude.kostenVan(msg.usage));
    zend('[DONE]');
  } catch (e) {
    console.error('Claude-fout:', e);
    var melding = e instanceof claude.Anthropic.RateLimitError ? 'Claude is even overbelast, probeer het zo opnieuw.'
      : e instanceof claude.Anthropic.APIError ? 'Claude API-fout (' + e.status + ')'
      : 'Interne fout';
    zend({ fout: melding });
  }
  res.end();
};
