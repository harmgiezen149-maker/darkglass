// Blokken synchroniseren met de officiële handleiding en de KosmOS-release notes.
//
// Verloop (aangestuurd door de blok-editor, zodat elke stap binnen de
// tijdslimiet van een serverless functie blijft):
//   1. inventaris  — PDF ophalen, uploaden naar de Files API, lijst van alle blokken
//   2. sectie      — per groep blokken de parameters uitlezen (PDF uit de cache)
//   3. vergelijk   — verschillen met de huidige catalogus → voorstellen
//   4. toepassen   — goedgekeurde voorstellen in de catalogus zetten
// Daarnaast zoekt "releasenotes" via web search naar blokken uit nieuwere
// KosmOS-versies, en doet "check" een goedkope controle of de handleiding
// veranderd is (ook wekelijks via Vercel Cron).

var crypto = require('crypto');
var redis = require('./redis');
var claude = require('./claude');
var blokken = require('./blokken');
var Catalogus = require('../../shared/catalogus');

var HANDLEIDING_URL = process.env.HANDLEIDING_URL || 'https://api.darkglass.com/static/Anagram-Manual.pdf';
var K = {
  status: 'anagram:sync:status',
  bestand: 'anagram:sync:bestand',
  inventaris: 'anagram:sync:inventaris',
  extractie: 'anagram:sync:extractie',
  voorstellen: 'anagram:sync:voorstellen',
  genegeerd: 'anagram:sync:genegeerd'
};
var MAX_PDF = 32 * 1024 * 1024;

// ---------- JSON-schema's voor structured outputs ----------
var PARAM_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['naam', 'type', 'min', 'max', 'eenheid', 'opties', 'standaard', 'omschrijving'],
  properties: {
    naam: { type: 'string', description: 'Parameternaam exact zoals op het apparaat' },
    type: { type: 'string', enum: ['knop', 'schakelaar', 'keuze', 'tekst'] },
    min: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    max: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    eenheid: { type: 'string', description: 'Een van: %, dB, Hz, kHz, ms, s, cents, dB/oct, :1 (ratio) of leeg' },
    opties: { type: 'array', items: { type: 'string' }, description: 'Vaste keuzes (bij type keuze), of extra standen naast het bereik' },
    standaard: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    omschrijving: { type: 'string', description: 'Korte uitleg als het bereik niet als getal te vangen is, anders leeg' }
  }
};

var INVENTARIS_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['kosmos', 'secties'],
  properties: {
    kosmos: { type: 'string', description: 'KosmOS-versie waar de handleiding over gaat, bv. 1.13' },
    secties: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['sectie', 'blokken'],
        properties: {
          sectie: { type: 'string' },
          blokken: {
            type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['naam', 'pagina'],
              properties: { naam: { type: 'string' }, pagina: { type: 'integer' } }
            }
          }
        }
      }
    }
  }
};

var BLOKKEN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['blokken'],
  properties: {
    blokken: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['naam', 'basis', 'pagina', 'parameters'],
        properties: {
          naam: { type: 'string' },
          basis: { type: 'string', description: 'Waar het blok op gebaseerd is (origineel apparaat), leeg als onbekend' },
          pagina: { type: 'integer' },
          parameters: { type: 'array', items: PARAM_SCHEMA }
        }
      }
    }
  }
};

var RELEASE_TOOL = {
  name: 'rapporteer_kosmos',
  description: 'Rapporteer de nieuwste KosmOS-versie en de blokken die in recente versies zijn toegevoegd. Roep dit één keer aan aan het eind van je onderzoek.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false,
    required: ['nieuwste_versie', 'releasedatum', 'bronnen', 'blokken'],
    properties: {
      nieuwste_versie: { type: 'string' },
      releasedatum: { type: 'string', description: 'Datum van de nieuwste release, of leeg' },
      bronnen: { type: 'array', items: { type: 'string' }, description: 'URL\'s waarop je je baseert' },
      blokken: {
        type: 'array', items: {
          type: 'object', additionalProperties: false,
          required: ['naam', 'sectie', 'basis', 'versie', 'bron_url', 'parameters'],
          properties: {
            naam: { type: 'string' },
            sectie: { type: 'string' },
            basis: { type: 'string' },
            versie: { type: 'string', description: 'KosmOS-versie waarin het blok verscheen' },
            bron_url: { type: 'string' },
            parameters: { type: 'array', items: PARAM_SCHEMA }
          }
        }
      }
    }
  }
};

var REGELS_PARAMETERS = 'Regels voor parameters:\n'
  + '- type "knop" voor continue regelaars (met min/max en eenheid), "schakelaar" voor aan/uit, "keuze" voor vaste standen (opties), "tekst" als niets past.\n'
  + '- Eenheden: %, dB, Hz, kHz, ms, s, cents, dB/oct, ":1" voor ratio\'s, of leeg voor schalen zonder eenheid (bv. 0-10).\n'
  + '- Verzin niets. Staat een bereik niet in de bron, zet min/max op null en leg het kort uit in omschrijving.\n';

// ---------- opslag ----------
async function lees(key, standaard) {
  var v = await redis.getJson(key);
  return v == null ? standaard : v;
}

async function zetStatus(wijziging) {
  var s = Object.assign(await lees(K.status, {}), wijziging);
  await redis.setJson(K.status, s);
  return s;
}

async function toestand() {
  var r = await redis.pipeline([['GET', K.status], ['GET', K.inventaris], ['GET', K.voorstellen], ['HGETALL', K.extractie], ['GET', K.bestand]]);
  var ext = r[3] || [];
  var klaar = [];
  for (var i = 0; i < ext.length; i += 2) klaar.push(ext[i]);
  return {
    status: redis.parseJson(r[0]) || {},
    inventaris: redis.parseJson(r[1]),
    voorstellen: redis.parseJson(r[2]) || [],
    extractieKlaar: klaar,
    bestand: redis.parseJson(r[4]),
    meta: await blokken.laadMeta(),
    handleidingUrl: HANDLEIDING_URL
  };
}

// ---------- 0. goedkope controle ----------
async function checkHandleiding(url) {
  url = url || HANDLEIDING_URL;
  var r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  if (!r.ok) throw new Error('Handleiding niet bereikbaar (HTTP ' + r.status + ')');
  var kop = {
    url: url,
    etag: r.headers.get('etag') || '',
    lastModified: r.headers.get('last-modified') || '',
    lengte: r.headers.get('content-length') || ''
  };
  var status = await lees(K.status, {});
  var vorige = status.handleiding;
  var gewijzigd = !!(vorige && (vorige.etag !== kop.etag || vorige.lastModified !== kop.lastModified || vorige.lengte !== kop.lengte));
  var nooitGelezen = !(await lees(K.bestand, null));
  return zetStatus({
    handleiding: kop,
    handleidingGewijzigd: gewijzigd || (status.handleidingGewijzigd && !nooitGelezen) || false,
    handleidingNooitGelezen: nooitGelezen,
    laatsteCheck: new Date().toISOString()
  });
}

// ---------- 1. inventaris ----------
async function haalPdf(bron) {
  var buf;
  if (bron && bron.base64) {
    buf = Buffer.from(String(bron.base64), 'base64');
  } else {
    var url = (bron && bron.url) || HANDLEIDING_URL;
    if (!/^https:\/\//i.test(url)) throw new Error('Alleen https-URL\'s');
    var r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('PDF ophalen mislukt (HTTP ' + r.status + ')');
    buf = Buffer.from(await r.arrayBuffer());
  }
  if (buf.length > MAX_PDF) throw new Error('PDF is groter dan 32 MB');
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') throw new Error('Dit is geen PDF-bestand');
  return buf;
}

async function zorgVoorBestand(bron) {
  var buf = await haalPdf(bron);
  var hash = crypto.createHash('sha256').update(buf).digest('hex');
  var bestaand = await lees(K.bestand, null);
  if (bestaand && bestaand.hash === hash && bestaand.fileId) return { bestand: bestaand, nieuw: false };
  var up = await claude.client().files.upload({
    file: await claude.Anthropic.toFile(buf, 'anagram-handleiding.pdf', { type: 'application/pdf' })
  });
  var bestand = { fileId: up.id, hash: hash, bron: bron && bron.url ? bron.url : (bron && bron.base64 ? 'upload' : HANDLEIDING_URL), grootte: buf.length, aangemaakt: new Date().toISOString() };
  await redis.setJson(K.bestand, bestand);
  return { bestand: bestand, nieuw: true };
}

function documentBlok(fileId) {
  return { type: 'document', source: { type: 'file', file_id: fileId }, title: 'Darkglass Anagram handleiding', cache_control: { type: 'ephemeral' } };
}

async function inventaris(bron) {
  var b = await zorgVoorBestand(bron);
  var huidig = await blokken.laad();
  var sectieNamen = huidig.map(function(s) { return s.sectie; }).join(', ');
  var msg = await claude.voltooi({
    model: claude.MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: claude.jsonFormaat(INVENTARIS_SCHEMA) },
    messages: [{
      role: 'user',
      content: [
        documentBlok(b.bestand.fileId),
        { type: 'text', text: 'Maak een inventaris van ALLE DSP-blokken die deze handleiding van de Darkglass Anagram beschrijft (amps, drives, compressors, EQ, filters, modulatie, pitch, delay, reverb, cab/IR, neural, synth, utility, enzovoort). '
          + 'Geef per sectie de blokken met hun naam exact zoals in de handleiding en het paginanummer van de PDF waar de parameters staan. '
          + 'Gebruik als sectienaam (in hoofdletters) bij voorkeur een van deze bestaande namen als die past: ' + sectieNamen + '. '
          + 'Neem geen menu\'s, globale instellingen of footswitch-functies op; alleen blokken die je in een signaalketen plaatst. '
          + 'Geef ook de KosmOS-versie waar de handleiding over gaat.' }
      ]
    }]
  });
  var inv = claude.jsonUit(msg);
  inv.secties = (inv.secties || []).map(function(s) {
    return { sectie: String(s.sectie).toUpperCase().trim(), blokken: (s.blokken || []).filter(function(x) { return x && x.naam; }) };
  }).filter(function(s) { return s.blokken.length; });
  inv.aangemaakt = new Date().toISOString();
  inv.fileId = b.bestand.fileId;
  await redis.pipeline([['SET', K.inventaris, JSON.stringify(inv)], ['DEL', K.extractie]]);
  await claude.registreerKosten('sync', msg.kosten);
  return { inventaris: inv, batches: batches(inv), kosten: msg.kosten };
}

// Groepen van maximaal 6 blokken, zodat elke aanroep snel klaar is.
function batches(inv) {
  var uit = [];
  (inv.secties || []).forEach(function(s) {
    for (var i = 0; i < s.blokken.length; i += 6) {
      uit.push({ id: s.sectie + '#' + (i / 6), sectie: s.sectie, blokken: s.blokken.slice(i, i + 6).map(function(b) { return b.naam; }) });
    }
  });
  return uit;
}

// ---------- 2. sectie uitlezen ----------
async function leesBatch(batchId) {
  var inv = await lees(K.inventaris, null);
  if (!inv) throw new Error('Maak eerst een inventaris');
  var batch = batches(inv).find(function(b) { return b.id === batchId; });
  if (!batch) throw new Error('Onbekende groep: ' + batchId);
  var msg = await claude.voltooi({
    model: claude.MODEL,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: claude.jsonFormaat(BLOKKEN_SCHEMA) },
    messages: [{
      role: 'user',
      content: [
        documentBlok(inv.fileId),
        { type: 'text', text: 'Lees uit deze handleiding van de Darkglass Anagram de blokken ' + batch.blokken.map(function(n) { return '"' + n + '"'; }).join(', ')
          + ' (sectie ' + batch.sectie + '). Geef per blok de naam exact zoals in de handleiding, waar het op gebaseerd is, het paginanummer en ALLE parameters die je op het apparaat kunt instellen.\n\n'
          + REGELS_PARAMETERS }
      ]
    }]
  });
  var data = claude.jsonUit(msg);
  var lijst = (data.blokken || []).map(function(b) {
    return Catalogus.normaliseerBlok({
      naam: b.naam, basis: b.basis, parameters: b.parameters, status: 'geverifieerd',
      bron: { type: 'handleiding', kosmos: inv.kosmos, pagina: b.pagina }
    });
  }).filter(Boolean);
  await redis.cmd(['HSET', K.extractie, batchId, JSON.stringify({ sectie: batch.sectie, blokken: lijst })]);
  await claude.registreerKosten('sync', msg.kosten);
  return { batch: batch, blokken: lijst, kosten: msg.kosten };
}

// ---------- 3. vergelijken ----------
async function genegeerd() {
  return lees(K.genegeerd, []);
}

async function bewaarVoorstellen(nieuw, bronSoort) {
  var weg = await genegeerd();
  var bestaand = (await lees(K.voorstellen, [])).filter(function(v) { return v.bronSoort !== bronSoort; });
  var keys = {};
  var lijst = bestaand.concat(nieuw.map(function(v) { return Object.assign({ bronSoort: bronSoort }, v); }))
    .filter(function(v) { if (keys[v.key] || weg.indexOf(v.key) !== -1) return false; keys[v.key] = true; return true; });
  await redis.setJson(K.voorstellen, lijst);
  return lijst;
}

async function vergelijkHandleiding() {
  var inv = await lees(K.inventaris, null);
  if (!inv) throw new Error('Maak eerst een inventaris');
  var plat = await redis.cmd(['HGETALL', K.extractie]) || [];
  var perSectie = {};
  for (var i = 0; i < plat.length; i += 2) {
    var d = redis.parseJson(plat[i + 1]);
    if (!d) continue;
    perSectie[d.sectie] = (perSectie[d.sectie] || []).concat(d.blokken);
  }
  var bron = Object.keys(perSectie).map(function(s) { return { sectie: s, blokken: perSectie[s] }; });
  var volledig = batches(inv).every(function(b) {
    for (var j = 0; j < plat.length; j += 2) if (plat[j] === b.id) return true;
    return false;
  });
  var huidig = await blokken.laad();
  var voorstellen = Catalogus.vergelijk(huidig, bron, { volledig: volledig });
  var lijst = await bewaarVoorstellen(voorstellen, 'handleiding');
  await zetStatus({ handleidingGewijzigd: false, handleidingNooitGelezen: false, handleidingKosmos: inv.kosmos, laatsteVergelijking: new Date().toISOString() });
  return { voorstellen: lijst, volledig: volledig, kosmos: inv.kosmos };
}

// ---------- release notes via web search ----------
async function releaseNotes() {
  var huidig = await blokken.laad();
  var meta = await blokken.laadMeta();
  var namen = Catalogus.alleBlokken(huidig).map(function(x) { return x.blok.naam; });
  var msg = await claude.voltooi({
    model: claude.MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 6 },
      { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 4 },
      RELEASE_TOOL
    ],
    messages: [{
      role: 'user',
      content: 'Zoek uit wat de nieuwste firmwareversie (KosmOS) van de Darkglass Anagram is en welke DSP-blokken er in versies na KosmOS ' + meta.kosmos
        + ' zijn bijgekomen. Gebruik bij voorkeur officiële bronnen (darkglass.com, de release notes, de Darkglass Suite) en anders betrouwbare nieuwssites.\n\n'
        + 'Deze blokken staan al in de catalogus en hoef je niet te melden: ' + namen.join(', ') + '.\n\n'
        + 'Geef per nieuw blok de sectie (in hoofdletters, bv. AMP, DRIVE, FILTER, NEURAL, SYNTH), waar het op gebaseerd is en de parameters als je die kunt vinden (anders een lege lijst). '
        + REGELS_PARAMETERS
        + '\nRoep tot slot de tool rapporteer_kosmos aan met je bevindingen.'
    }]
  });
  var data = claude.toolInput(msg, 'rapporteer_kosmos');
  await claude.registreerKosten('sync', msg.kosten);
  if (!data) throw new Error('Claude gaf geen rapport terug; probeer het opnieuw.');

  var bron = [];
  (data.blokken || []).forEach(function(b) {
    var blok = Catalogus.normaliseerBlok({
      naam: b.naam, basis: b.basis, parameters: b.parameters, status: 'onbevestigd',
      bron: { type: 'release-notes', kosmos: b.versie, url: b.bron_url, datum: new Date().toISOString().slice(0, 10) }
    });
    if (!blok) return;
    var s = bron.find(function(x) { return x.sectie === String(b.sectie || 'OVERIG').toUpperCase(); });
    if (!s) { s = { sectie: String(b.sectie || 'OVERIG').toUpperCase(), blokken: [] }; bron.push(s); }
    s.blokken.push(blok);
  });
  // Release notes leveren alleen nieuwe blokken op; parameters komen later uit de handleiding.
  var voorstellen = Catalogus.vergelijk(huidig, bron).filter(function(v) { return v.soort === 'nieuw'; });
  var lijst = await bewaarVoorstellen(voorstellen, 'releasenotes');
  var nieuwer = Catalogus.vergelijkVersie(data.nieuwste_versie, meta.kosmos) > 0;
  var status = await zetStatus({
    releaseNotes: { versie: data.nieuwste_versie, datum: data.releasedatum, bronnen: (data.bronnen || []).slice(0, 8), gecontroleerd: new Date().toISOString() },
    nieuwereKosmos: nieuwer
  });
  return { voorstellen: lijst, rapport: data, status: status, kosten: msg.kosten };
}

// ---------- 4. toepassen ----------
async function toepassen(besluiten) {
  var lijst = await lees(K.voorstellen, []);
  var perKey = {};
  lijst.forEach(function(v) { perKey[v.key] = v; });
  var geldig = (besluiten || []).filter(function(b) { return b && perKey[b.key]; }).map(function(b) {
    return { voorstel: perKey[b.key], besluit: b.besluit, blok: b.blok };
  });
  var huidig = await blokken.laad();
  var cat = Catalogus.pasToe(huidig, geldig);

  var inv = await lees(K.inventaris, null);
  var meta = {};
  var verifieerd = geldig.some(function(b) { return b.besluit === 'overnemen' && b.voorstel.bronSoort === 'handleiding'; });
  if (verifieerd && inv && inv.kosmos) meta.kosmos = inv.kosmos;
  await blokken.bewaar(cat, meta);

  var weg = await genegeerd();
  geldig.forEach(function(b) { if (b.besluit === 'negeren' || b.besluit === 'behouden') weg.push(b.voorstel.key); });
  var verwerkt = geldig.map(function(b) { return b.voorstel.key; });
  await redis.pipeline([
    ['SET', K.genegeerd, JSON.stringify(weg.slice(-500))],
    ['SET', K.voorstellen, JSON.stringify(lijst.filter(function(v) { return verwerkt.indexOf(v.key) === -1; }))]
  ]);
  var nogOpen = lijst.length - verwerkt.length;
  if (!nogOpen) await zetStatus({ nieuwereKosmos: false });
  return { blocks: cat, open: nogOpen };
}

async function wisVoorstellen() {
  await redis.pipeline([['DEL', K.voorstellen], ['DEL', K.genegeerd]]);
}

function updateBeschikbaar(st) {
  var s = st.status || {};
  return !!((st.voorstellen && st.voorstellen.length) || s.handleidingGewijzigd || s.nieuwereKosmos);
}

module.exports = {
  HANDLEIDING_URL: HANDLEIDING_URL, K: K, toestand: toestand, checkHandleiding: checkHandleiding,
  inventaris: inventaris, batches: batches, leesBatch: leesBatch, vergelijkHandleiding: vergelijkHandleiding,
  releaseNotes: releaseNotes, toepassen: toepassen, wisVoorstellen: wisVoorstellen, updateBeschikbaar: updateBeschikbaar,
  SCHEMAS: { INVENTARIS_SCHEMA: INVENTARIS_SCHEMA, BLOKKEN_SCHEMA: BLOKKEN_SCHEMA, RELEASE_TOOL: RELEASE_TOOL }
};
