// Stap A van de analyse: uitzoeken hoe de bas op de opname klinkt en waarom.
// Claude zoekt met web search/web fetch naar gear, techniek en productie en
// levert een toneprofiel met per bevinding een zekerheid en bronnen.
// MusicBrainz levert vooraf (gratis) de juiste opname en de bassist als hint.
// Resultaten worden per song bewaard, zodat een tweede analyse niet opnieuw zoekt.

var redis = require('./redis');
var claude = require('./claude');
var Catalogus = require('../../shared/catalogus');

var CACHE_DAGEN = 180;
var ZEKERHEID = { type: 'string', enum: ['hoog', 'middel', 'laag'] };

var TONEPROFIEL_TOOL = {
  name: 'lever_toneprofiel',
  description: 'Lever het toneprofiel van de baspartij op deze opname. Roep dit één keer aan als je onderzoek klaar is.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false,
    required: ['artiest', 'song', 'opname', 'bassist', 'genre', 'samenvatting', 'b_snaar_vereist', 'stemming', 'speeltechniek', 'klank', 'bevindingen', 'bronnen', 'zekerheid'],
    properties: {
      artiest: { type: 'string', description: 'Officiële artiestnaam' },
      song: { type: 'string', description: 'Officiële songtitel' },
      opname: { type: 'string', description: 'Welke opname: album en jaar (of live/versie)' },
      bassist: { type: 'string', description: 'Wie speelt bas op deze opname, leeg als onbekend' },
      genre: { type: 'string' },
      samenvatting: { type: 'string', description: 'Twee tot vier zinnen over de bassound en hoe die tot stand komt' },
      b_snaar_vereist: { type: 'boolean', description: 'True als de baspartij noten onder de lage E gebruikt' },
      stemming: { type: 'string', description: 'Basstemming op de opname, bv. E standaard, Drop D, Drop C' },
      speeltechniek: { type: 'string', description: 'Vingers, plectrum, slap, palm mute, enz.' },
      klank: {
        type: 'object', additionalProperties: false,
        required: ['karakter', 'eq', 'compressie', 'distortion', 'effecten'],
        properties: {
          karakter: { type: 'string' },
          eq: { type: 'string', description: 'Frequentiebeeld: wat is luid, wat is weggesneden' },
          compressie: { type: 'string' },
          distortion: { type: 'string', description: 'Soort en hoeveelheid vervorming, eventueel parallel' },
          effecten: { type: 'string', description: 'Modulatie, octaver, filter, delay, enz. of "geen"' }
        }
      },
      bevindingen: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          required: ['onderwerp', 'waarde', 'zekerheid', 'bron_urls'],
          properties: {
            onderwerp: { type: 'string', description: 'Bv. Bas, Pickups, Snaren, Versterker, Cabinet, Pedalen, DI/opname, Productie' },
            waarde: { type: 'string' },
            zekerheid: ZEKERHEID,
            bron_urls: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      bronnen: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['titel', 'url'],
          properties: { titel: { type: 'string' }, url: { type: 'string' } }
        }
      },
      zekerheid: {
        type: 'object', additionalProperties: false, required: ['algemeen', 'toelichting'],
        properties: { algemeen: ZEKERHEID, toelichting: { type: 'string' } }
      }
    }
  }
};

function cacheKey(artist, song) {
  return 'onderzoek:' + Catalogus.slug(artist) + ':' + Catalogus.slug(song);
}

async function uitCache(artist, song) {
  if (!redis.isGeconfigureerd()) return null;
  try { return await redis.getJson(cacheKey(artist, song)); } catch (e) { return null; }
}

async function naarCache(artist, song, profiel) {
  if (!redis.isGeconfigureerd()) return;
  try { await redis.setJson(cacheKey(artist, song), profiel, CACHE_DAGEN * 86400); } catch (e) { console.error('Onderzoek cachen mislukt:', e.message); }
}

// ---------- MusicBrainz (best effort, max ~4 s) ----------
async function mbFetch(url) {
  var ctrl = new AbortController();
  var t = setTimeout(function() { ctrl.abort(); }, 4000);
  try {
    var r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'DarkglassToneArchitect/2.0 (https://github.com/harmgiezen149-maker/darkglass)', Accept: 'application/json' } });
    return r.ok ? await r.json() : null;
  } finally { clearTimeout(t); }
}

function mbQuote(s) { return '"' + String(s).replace(/["\\]/g, ' ') + '"'; }

async function musicbrainz(artist, song) {
  try {
    var q = 'recording:' + mbQuote(song) + ' AND artist:' + mbQuote(artist);
    var zoek = await mbFetch('https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query=' + encodeURIComponent(q));
    var rec = zoek && (zoek.recordings || []).find(function(r) { return (r.score || 0) >= 80; });
    if (!rec) return null;
    var hint = {
      titel: rec.title,
      artiest: (rec['artist-credit'] || []).map(function(a) { return a.name; }).join(', '),
      jaar: (rec['first-release-date'] || '').slice(0, 4),
      album: rec.releases && rec.releases[0] ? rec.releases[0].title : '',
      bassisten: []
    };
    var detail = await mbFetch('https://musicbrainz.org/ws/2/recording/' + encodeURIComponent(rec.id) + '?fmt=json&inc=artist-rels');
    (detail && detail.relations || []).forEach(function(rel) {
      var attr = (rel.attributes || []).join(' ').toLowerCase();
      if (rel.type === 'instrument' && /bass/.test(attr) && rel.artist && hint.bassisten.indexOf(rel.artist.name) === -1) hint.bassisten.push(rel.artist.name);
    });
    return hint;
  } catch (e) {
    return null;
  }
}

function hintTekst(h) {
  if (!h) return '';
  var t = 'Hint uit MusicBrainz: "' + h.titel + '" van ' + h.artiest;
  if (h.album) t += ', album "' + h.album + '"';
  if (h.jaar) t += ' (' + h.jaar + ')';
  if (h.bassisten.length) t += '. Bas op deze opname: ' + h.bassisten.join(', ');
  return t + '. Controleer dit; het kan om een andere versie gaan.\n';
}

// Beschrijft een server-tool-aanroep voor de voortgangsweergave.
function voortgangVan(blok) {
  if (!blok || blok.type !== 'server_tool_use') return null;
  var inp = blok.input || {};
  if (blok.name === 'web_search' && inp.query) return { zoekt: String(inp.query).slice(0, 120) };
  if (blok.name === 'web_fetch' && inp.url) return { leest: String(inp.url).slice(0, 160) };
  return null;
}

// Volgt server_tool_use-blokken in de stream en meldt zoekopdrachten.
function streamVolger(onStatus) {
  var open = {};
  return function(ev) {
    if (ev.type === 'content_block_start' && ev.content_block && ev.content_block.type === 'server_tool_use') {
      open[ev.index] = { blok: ev.content_block, json: '' };
    } else if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'input_json_delta' && open[ev.index]) {
      open[ev.index].json += ev.delta.partial_json || '';
    } else if (ev.type === 'content_block_stop' && open[ev.index]) {
      var o = open[ev.index];
      delete open[ev.index];
      var input = o.blok.input || {};
      if (o.json) { try { input = JSON.parse(o.json); } catch (e) {} }
      var v = voortgangVan({ type: 'server_tool_use', name: o.blok.name, input: input });
      if (v && onStatus) onStatus(v);
    }
  };
}

function veiligeUrl(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u) ? u.slice(0, 500) : null;
}

function schoonProfiel(p) {
  p.bronnen = (p.bronnen || []).filter(function(b) { return veiligeUrl(b.url); }).slice(0, 12);
  p.bevindingen = (p.bevindingen || []).slice(0, 20).map(function(b) {
    b.bron_urls = (b.bron_urls || []).map(veiligeUrl).filter(Boolean).slice(0, 4);
    return b;
  });
  return p;
}

// Voert het onderzoek uit. opties: { taal, extra, vers, model, effort, onStatus }
async function onderzoek(artist, song, opties) {
  opties = opties || {};
  if (!opties.vers) {
    var c = await uitCache(artist, song);
    if (c) { c.uitCache = true; return { profiel: c, kosten: { dollar: 0, tokens: 0 } }; }
  }
  if (opties.onStatus) opties.onStatus({ tekst: 'MusicBrainz raadplegen' });
  var hint = await musicbrainz(artist, song);
  if (hint && opties.onStatus) opties.onStatus({ tekst: 'Opname gevonden: ' + hint.titel + (hint.jaar ? ' (' + hint.jaar + ')' : '') + (hint.bassisten.length ? ', bas: ' + hint.bassisten.join(', ') : '') });

  var taal = opties.taal === 'en' ? 'Write all text fields in English.' : 'Schrijf alle tekstvelden in het Nederlands.';
  var params = {
    model: opties.model || claude.MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: opties.effort || 'medium' },
    system: 'Je bent een onderzoeker voor bassounds. Je zoekt uit hoe de bas op een specifieke opname klinkt en waardoor: instrument, pickups, snaren, versterker/DI, pedalen, speeltechniek en productie. '
      + 'Zoek gericht (maximaal ongeveer 5 zoekopdrachten), bijvoorbeeld op Equipboard, in interviews (Bass Player, Premier Guitar, No Treble), rig rundowns en betrouwbare forumdraadjes. '
      + 'Lees de meest relevante pagina\'s met web_fetch. Onderscheid feiten met een bron van inschattingen op gehoor of op basis van het genre, en geef dat aan met de zekerheid (hoog = bevestigd door een bron over deze opname of periode, middel = waarschijnlijk, laag = inschatting). '
      + 'Verzin geen bronnen: noem alleen URL\'s die je echt gevonden hebt. ' + taal
      + ' Rond af door de tool lever_toneprofiel aan te roepen.',
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 6 },
      { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 4 },
      TONEPROFIEL_TOOL
    ],
    messages: [{
      role: 'user',
      content: 'Onderzoek de bassound van "' + song + '" van ' + artist + '.\n' + hintTekst(hint)
        + (opties.extra ? 'Context van de gebruiker: ' + opties.extra + '\n' : '')
    }]
  };

  var volger = streamVolger(opties.onStatus);
  var msg = await claude.voltooi(params, { onEvent: volger });
  var kosten = msg.kosten;
  var profiel = claude.toolInput(msg, 'lever_toneprofiel');
  if (!profiel && msg.stop_reason !== 'refusal') {
    // Geen rapport: vraag er expliciet om, met het onderzoek tot nu toe.
    params.messages = params.messages.concat([
      { role: 'assistant', content: msg.content },
      { role: 'user', content: 'Roep nu lever_toneprofiel aan met je bevindingen.' }
    ]);
    params.tools = [TONEPROFIEL_TOOL];
    var tweede = await claude.voltooi(params);
    kosten = claude.telOp(kosten, tweede.kosten);
    profiel = claude.toolInput(tweede, 'lever_toneprofiel');
  }
  if (!profiel) throw new Error('Geen toneprofiel ontvangen');

  profiel = schoonProfiel(profiel);
  profiel.musicbrainz = hint;
  profiel.datum = new Date().toISOString();
  await naarCache(artist, song, profiel);
  return { profiel: profiel, kosten: kosten };
}

// Compacte versie voor in de ontwerp-prompt.
function voorPrompt(p) {
  if (!p) return 'Geen onderzoek beschikbaar: baseer je op je eigen kennis en geef aan wat een inschatting is.';
  var kort = {
    opname: p.opname, bassist: p.bassist, genre: p.genre, samenvatting: p.samenvatting,
    stemming: p.stemming, b_snaar_vereist: p.b_snaar_vereist, speeltechniek: p.speeltechniek, klank: p.klank,
    bevindingen: (p.bevindingen || []).map(function(b) { return b.onderwerp + ': ' + b.waarde + ' (zekerheid ' + b.zekerheid + ')'; }),
    zekerheid: p.zekerheid
  };
  return JSON.stringify(kort, null, 1);
}

module.exports = {
  onderzoek: onderzoek, voorPrompt: voorPrompt, musicbrainz: musicbrainz, cacheKey: cacheKey,
  streamVolger: streamVolger, TONEPROFIEL_TOOL: TONEPROFIEL_TOOL
};
