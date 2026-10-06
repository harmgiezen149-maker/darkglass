// Stap B en C van de analyse: preset ontwerpen als JSON (structured outputs)
// en controleren tegen de catalogus, met één reparatieronde en daarna
// automatisch herstel van wat nog niet klopt. Ook fine-tunen en vertalen.

var claude = require('./claude');
var blokken = require('./blokken');
var rigLib = require('./rig');
var onderzoekLib = require('./onderzoek');
var leren = require('./leren');
var Catalogus = require('../../shared/catalogus');
var Validatie = require('../../shared/validatie');

var TAAL = { nl: 'Schrijf alle tekst in het Nederlands.', en: 'Write all text in English.' };

// ---------- schema's ----------
function sceneSchema(bloknamen, basIds) {
  var str = { type: 'string' };
  var lijst = { type: 'array', items: str };
  return {
    type: 'object', additionalProperties: false,
    required: ['bas_id', 'b_snaar_vereist', 'stemming', 'toneanalyse', 'routing', 'chain_a', 'chain_b', 'merge_naar', 'blokken', 'tips', 'songdelen', 'nam_suggestie'],
    properties: {
      bas_id: { type: 'string', enum: basIds },
      b_snaar_vereist: { type: 'boolean' },
      stemming: { type: 'string', description: 'Aanbevolen basstemming, bv. "E standaard" of "Drop D"' },
      toneanalyse: { type: 'string' },
      routing: { type: 'string', enum: ['serieel', 'parallel'] },
      chain_a: lijst,
      chain_b: lijst,
      merge_naar: lijst,
      blokken: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          required: ['label', 'blok', 'origineel', 'instellingen', 'uitleg'],
          properties: {
            label: { type: 'string', description: 'Unieke naam in deze preset; meestal gelijk aan de bloknaam, bij dubbel gebruik "EQ 2" enz.' },
            blok: { type: 'string', enum: bloknamen },
            origineel: { type: 'string', description: 'Het originele apparaat of de rol, bv. "Ampeg SVT" of "parallelle drive"' },
            instellingen: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false, required: ['parameter', 'waarde'],
                properties: { parameter: str, waarde: { type: 'string', description: 'Met eenheid, bv. "45%", "-3 dB", "800 Hz", "Fat", "On"' } }
              }
            },
            uitleg: { type: 'string' }
          }
        }
      },
      tips: lijst,
      songdelen: {
        type: 'array',
        description: 'Alleen als de bassound per songdeel duidelijk verandert; anders leeg',
        items: {
          type: 'object', additionalProperties: false, required: ['deel', 'omschrijving', 'footswitch', 'wijzigingen'],
          properties: {
            deel: { type: 'string', description: 'Bv. "Couplet", "Refrein", "Solo"' },
            omschrijving: str,
            footswitch: { type: 'string', description: 'Welke footswitch dit schakelt, bv. "FS2", of leeg voor de basisstand' },
            wijzigingen: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false, required: ['label', 'actie', 'parameter', 'waarde'],
                properties: {
                  label: { type: 'string', description: 'Label van een blok uit deze preset' },
                  actie: { type: 'string', enum: ['aan', 'uit', 'wijzig'] },
                  parameter: { type: 'string', description: 'Bij "wijzig": de parameter, anders leeg' },
                  waarde: { type: 'string', description: 'Bij "wijzig": de nieuwe waarde, anders leeg' }
                }
              }
            }
          }
        }
      },
      nam_suggestie: {
        anyOf: [{ type: 'null' }, {
          type: 'object', additionalProperties: false, required: ['versterker', 'zoekterm', 'waarom'],
          properties: {
            versterker: { type: 'string', description: 'Het echte apparaat waarvan je een NAM-capture zou laden' },
            zoekterm: { type: 'string', description: 'Zoekterm voor TONE3000, bv. "Ampeg SVT bass"' },
            waarom: str
          }
        }]
      }
    }
  };
}

function analyseSchema(bloknamen, basIds) {
  return {
    type: 'object', additionalProperties: false, required: ['artiest', 'song', 'scenes'],
    properties: {
      artiest: { type: 'string' },
      song: { type: 'string' },
      scenes: { type: 'array', items: sceneSchema(bloknamen, basIds) }
    }
  };
}

function chatSchema(bloknamen, basId) {
  return {
    type: 'object', additionalProperties: false, required: ['antwoord', 'scene'],
    properties: {
      antwoord: { type: 'string', description: 'Eén tot drie zinnen: wat je hebt aangepast en waarom' },
      scene: sceneSchema(bloknamen, [basId])
    }
  };
}

// ---------- prompt ----------
function limietRegels(lim) {
  lim = lim || {};
  var r = '';
  if (lim.maxBlokken) r += '- Gebruik maximaal ' + lim.maxBlokken + ' blokken per preset (alle paden samen).\n';
  if (lim.maxRijen === 1) r += '- Het apparaat heeft één rij: gebruik altijd seriële routing.\n';
  else if (lim.maxRijen) r += '- Het apparaat heeft maximaal ' + lim.maxRijen + ' rijen; parallelle routing gebruikt er twee.\n';
  if (lim.maxScenes) r += '- Maximaal ' + lim.maxScenes + ' songdelen met een footswitch (scènes) per preset.\n';
  return r;
}

function systeem(catalogus, meta, rig, taal, extraVariabel, limieten) {
  var vol = blokken.volumeBlok(catalogus);
  var vast = 'Je bent een expert in basgitaar-sound design voor de Darkglass Anagram (KosmOS ' + (meta.kosmos || '') + '). '
    + 'Je vertaalt een toneprofiel van een opname naar een concrete preset met de blokken hieronder.\n\n'
    + 'Regels:\n'
    + '- Gebruik ALLEEN blokken uit de catalogus en ALLEEN hun parameters, met de exacte parameternamen.\n'
    + '- Waarden binnen het opgegeven bereik en in de opgegeven eenheid ("45%", "-3 dB", "800 Hz", "4:1"). Bij een keuzelijst precies één van de opties; bij aan/uit "On" of "Off".\n'
    + limietRegels(limieten)
    + '- Stel alleen parameters in die ertoe doen; laat de rest weg.\n'
    + '- Geef elk blok een uniek label. chain_a (en bij parallelle routing chain_b en merge_naar) noemen de labels in signaalvolgorde. '
    + 'Bij serieel zijn chain_b en merge_naar leeg. Bij parallel zijn chain_a en chain_b de twee paden die naast elkaar lopen, en is merge_naar wat na het samenvoegen komt.\n'
    + (vol ? '- Sluit de keten ALTIJD af met het blok "' + vol.naam + '" als volumeregelaar (het laatste item van merge_naar bij parallel, anders van chain_a), met een startwaarde voor Level.\n' : '')
    + '- Baseer je op het toneprofiel. Is iets daarin onzeker, kies dan een muzikaal logische instelling en zeg in de toneanalyse wat een inschatting is.\n'
    + '- Houd rekening met de bas: aantal snaren, pickups en actieve elektronica. b_snaar_vereist is true als de baspartij onder de lage E gaat.\n'
    + '- stemming: alleen de basstemming (bv. Drop D), niet die van de gitaar.\n'
    + '- tips: drie concrete tips voor het fine-tunen op de bas en de Anagram.\n'
    + '- songdelen: alleen als de bassound per songdeel duidelijk verandert (bv. clean couplet, vervormd refrein). Geef per deel welke blokken een footswitch aan/uit zet of welke waarde verandert, met niveaucompensatie zodat het volume gelijk blijft. Anders een lege lijst.\n'
    + (heeftNeural(catalogus)
      ? '- nam_suggestie: als een NAM-capture van de echte versterker of het pedaal van de opname de sound dichter benadert, noem dat apparaat en een zoekterm voor TONE3000 (te laden in het Neural-blok). Anders null.\n\n'
      : '- nam_suggestie: altijd null (deze catalogus heeft geen Neural-blok).\n\n')
    + '=== CATALOGUS ===\n' + Catalogus.promptTekst(catalogus);
  var variabel = (TAAL[taal] || TAAL.nl);
  var r = rigLib.beschrijfRig(rig);
  if (r) variabel += '\n\nOver de speler:\n' + r;
  if (extraVariabel) variabel += '\n\n' + extraVariabel;
  return [
    { type: 'text', text: vast, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: variabel }
  ];
}

function heeftNeural(catalogus) {
  return Catalogus.alleBlokken(catalogus).some(function(x) { return /neural/i.test(x.blok.naam); });
}

function bloknamen(catalogus) {
  return Catalogus.alleBlokken(catalogus).map(function(x) { return x.blok.naam; });
}

// ---------- ontwerp + controle ----------
async function vraagJson(params, onEvent) {
  var msg = await claude.voltooi(params, onEvent ? { onEvent: onEvent } : undefined);
  return { data: claude.jsonUit(msg), kosten: msg.kosten };
}

// Volgt de JSON-stream en meldt elk nieuw blok ("blok": "...").
function blokVolger(onStatus) {
  var tekst = '', gemeld = 0;
  return function(ev) {
    if (ev.type === 'content_block_start' && ev.content_block && ev.content_block.type === 'thinking') onStatus && onStatus({ tekst: 'Nadenken over de sound' });
    if (ev.type !== 'content_block_delta' || !ev.delta || ev.delta.type !== 'text_delta') return;
    tekst += ev.delta.text;
    var re = /"blok"\s*:\s*"([^"]+)"/g, m, n = 0;
    while ((m = re.exec(tekst)) !== null) {
      n++;
      if (n > gemeld) { gemeld = n; onStatus && onStatus({ tekst: 'Blok: ' + m[1] }); }
    }
  };
}

// Controleert scenes; repareert eenmaal via Claude als er fouten zijn en de
// tijd het toelaat; herstelt de rest zelf. Geeft { scenes, kosten }.
async function controleerEnRepareer(scenes, ctx) {
  var vol = blokken.volumeBlok(ctx.catalogus);
  var opties = { volumeBlok: vol ? vol.naam : null, limieten: ctx.limieten };
  var kosten = { dollar: 0, tokens: 0 };
  var resultaat = [];
  for (var i = 0; i < scenes.length; i++) {
    var scene = scenes[i];
    var c = Validatie.controleer(scene, ctx.catalogus, opties);
    var gerepareerd = false;
    if (c.fouten.length && Date.now() - ctx.start < (ctx.maxMs || 170000)) {
      ctx.onStatus && ctx.onStatus({ fase: 'controle', tekst: c.fouten.length + ' problemen gevonden in ' + scene.bas_id + ', Claude repareert ze' });
      try {
        var r = await vraagJson({
          model: ctx.model || claude.MODEL,
          max_tokens: 32000,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'medium', format: claude.jsonFormaat(sceneSchema(bloknamen(ctx.catalogus), [scene.bas_id])) },
          system: ctx.system,
          messages: [{ role: 'user', content: 'Deze preset bevat fouten tegen de catalogus. Corrigeer ze en geef de volledige preset opnieuw, verder ongewijzigd.\n\nPreset:\n' + JSON.stringify(scene) + '\n\nFouten:\n' + Validatie.foutTekst(c.fouten) }]
        });
        kosten = claude.telOp(kosten, r.kosten);
        scene = r.data;
        gerepareerd = true;
        c = Validatie.controleer(scene, ctx.catalogus, opties);
      } catch (e) {
        console.error('Reparatie mislukt:', e.message);
      }
    }
    var h = Validatie.herstel(scene, ctx.catalogus, opties);
    var na = Validatie.controleer(h.scene, ctx.catalogus, opties);
    h.scene.controle = {
      gerepareerd: gerepareerd,
      aanpassingen: h.aanpassingen,
      waarschuwingen: na.fouten.concat(na.waarschuwingen).map(function(w) { return w.melding; })
    };
    resultaat.push(h.scene);
  }
  return { scenes: resultaat, kosten: kosten };
}

// Volledige analyse: onderzoek → ontwerp → controle.
// opts: { artist, song, bassen (ids), extra, taal, vers, onStatus, voorbeelden }
async function analyse(opts) {
  var start = Date.now();
  var ai = claude.keuze(opts.model, opts.effort);
  var status = opts.onStatus || function() {};
  var catalogus = await blokken.laad();
  var meta = await blokken.laadMeta();
  var limieten = await blokken.laadLimieten();
  var rig = await rigLib.laad();
  var bassen = (opts.bassen || []).map(function(id) { return rig.bassen.find(function(b) { return b.id === id; }); }).filter(Boolean).slice(0, 3);
  if (!bassen.length) bassen = [rig.bassen[0]];
  var kosten = { dollar: 0, tokens: 0 };

  // A. onderzoek
  status({ fase: 'onderzoek', tekst: 'Onderzoek naar de opname' });
  var profiel = null, onderzoekFout = null;
  try {
    var o = await onderzoekLib.onderzoek(opts.artist, opts.song, {
      taal: opts.taal, extra: opts.extra, vers: opts.vers, model: ai.model, effort: ai.effort,
      onStatus: function(v) {
        if (v.zoekt) status({ fase: 'onderzoek', tekst: 'Zoekt: ' + v.zoekt });
        else if (v.leest) status({ fase: 'onderzoek', tekst: 'Leest: ' + v.leest });
        else if (v.tekst) status({ fase: 'onderzoek', tekst: v.tekst });
      }
    });
    profiel = o.profiel;
    kosten = claude.telOp(kosten, o.kosten);
    status({ fase: 'onderzoek', tekst: profiel.uitCache ? 'Eerder onderzoek gebruikt' : 'Onderzoek klaar (' + (profiel.bronnen || []).length + ' bronnen)', onderzoek: profiel });
  } catch (e) {
    console.error('Onderzoek mislukt:', e);
    onderzoekFout = 'Onderzoek mislukt (' + e.message + '); preset op basis van eigen kennis.';
    status({ fase: 'onderzoek', tekst: onderzoekFout });
  }

  // B. ontwerp
  status({ fase: 'ontwerp', tekst: 'Preset ontwerpen' });
  var voorbeelden = '';
  try { voorbeelden = await leren.voorbeeldenVoorPrompt({ artiest: opts.artist, genre: profiel && profiel.genre, bassen: bassen.map(function(b) { return b.id; }) }); } catch (e) { console.error('Leren mislukt:', e.message); }
  if (voorbeelden) status({ fase: 'ontwerp', tekst: 'Eerdere feedback en goedgekeurde presets meegenomen' });
  var system = systeem(catalogus, meta, rig, opts.taal, voorbeelden, limieten);
  var vraag = 'Toneprofiel van "' + opts.song + '" van ' + opts.artist + ':\n' + onderzoekLib.voorPrompt(profiel) + '\n\n'
    + 'Maak een preset (scene) voor ' + (bassen.length > 1 ? 'elk van deze bassen, met waar het kan dezelfde blokstructuur en per bas aangepaste instellingen' : 'deze bas') + ':\n'
    + bassen.map(function(b) { return '- bas_id "' + b.id + '": ' + rigLib.beschrijf(b); }).join('\n')
    + (opts.extra ? '\n\nExtra wensen van de speler: ' + opts.extra : '');
  var ontwerp = await vraagJson({
    model: ai.model,
    max_tokens: 48000,
    thinking: { type: 'adaptive' },
    output_config: { effort: ai.effort, format: claude.jsonFormaat(analyseSchema(bloknamen(catalogus), bassen.map(function(b) { return b.id; }))) },
    system: system,
    messages: [{ role: 'user', content: vraag }]
  }, blokVolger(function(v) { status({ fase: 'ontwerp', tekst: v.tekst }); }));
  kosten = claude.telOp(kosten, ontwerp.kosten);

  // Elke gevraagde bas precies één scene, in de gevraagde volgorde.
  var scenes = bassen.map(function(b) {
    return (ontwerp.data.scenes || []).find(function(s) { return s.bas_id === b.id; });
  }).filter(Boolean);
  if (!scenes.length) throw new Error('Claude leverde geen bruikbare preset');

  // C. controle
  status({ fase: 'controle', tekst: 'Controleren tegen de catalogus' });
  var gecontroleerd = await controleerEnRepareer(scenes, { catalogus: catalogus, limieten: limieten, system: system, start: start, onStatus: status, model: ai.model });
  kosten = claude.telOp(kosten, gecontroleerd.kosten);

  return {
    artiest: ontwerp.data.artiest || opts.artist,
    song: ontwerp.data.song || opts.song,
    scenes: gecontroleerd.scenes,
    onderzoek: profiel,
    onderzoekFout: onderzoekFout,
    kosmos: meta.kosmos,
    ai: ai,
    kosten: kosten
  };
}

// Fine-tunen van één scene. opts: { scene, vraag, geschiedenis, onderzoek, context, taal, model, effort, onStatus }
async function chat(opts) {
  var start = Date.now();
  var ai = claude.keuze(opts.model, opts.effort);
  var catalogus = await blokken.laad();
  var meta = await blokken.laadMeta();
  var limieten = await blokken.laadLimieten();
  var rig = await rigLib.laad();
  var bas = rig.bassen.find(function(b) { return b.id === opts.scene.bas_id; }) || rig.bassen[0];
  var scene = Object.assign({}, opts.scene, { bas_id: bas.id });
  delete scene.controle;
  var lessen = '';
  try { lessen = await leren.voorbeeldenVoorPrompt({ alleenLessen: true }); } catch (e) {}
  var system = systeem(catalogus, meta, rig, opts.taal, lessen, limieten);
  var eerder = (opts.geschiedenis || []).slice(-6).map(function(v) { return '- ' + String(v).slice(0, 400); });
  var tekst = 'De speler verfijnt een bestaande preset' + (opts.context ? ' voor ' + opts.context : '') + ' op de ' + rigLib.beschrijf(bas) + '.\n\n'
    + (opts.onderzoek ? 'Toneprofiel:\n' + onderzoekLib.voorPrompt(opts.onderzoek) + '\n\n' : '')
    + 'Huidige preset:\n' + JSON.stringify(scene) + '\n\n'
    + (eerder.length ? 'Eerdere verzoeken in dit gesprek:\n' + eerder.join('\n') + '\n\n' : '')
    + 'Nieuw verzoek: ' + opts.vraag + '\n\n'
    + 'Pas de preset aan (alleen wat nodig is) en geef de volledige bijgewerkte preset terug. Is het een vraag zonder aanpassing, geef de preset dan ongewijzigd terug en beantwoord de vraag in "antwoord".';
  var status = opts.onStatus || function() {};
  status({ fase: 'ontwerp', tekst: 'Preset bijwerken' });
  var r = await vraagJson({
    model: ai.model,
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { effort: ai.effort, format: claude.jsonFormaat(chatSchema(bloknamen(catalogus), bas.id)) },
    system: system,
    messages: [{ role: 'user', content: tekst }]
  }, blokVolger(function(v) { status({ fase: 'ontwerp', tekst: v.tekst }); }));
  var g = await controleerEnRepareer([r.data.scene], { catalogus: catalogus, limieten: limieten, system: system, start: start, onStatus: status, maxMs: 150000, model: ai.model });
  return { antwoord: r.data.antwoord, scene: g.scenes[0], ai: ai, kosten: claude.telOp(r.kosten, g.kosten) };
}

// ---------- vertalen: alleen de tekstvelden ----------
function tekstVelden(scene) {
  var velden = [];
  function voeg(pad, waarde) { if (typeof waarde === 'string' && waarde.trim()) velden.push({ pad: pad, tekst: waarde }); }
  voeg(['toneanalyse'], scene.toneanalyse);
  voeg(['stemming'], scene.stemming);
  (scene.blokken || []).forEach(function(b, i) { voeg(['blokken', i, 'uitleg'], b.uitleg); voeg(['blokken', i, 'origineel'], b.origineel); });
  (scene.tips || []).forEach(function(t, i) { voeg(['tips', i], t); });
  (scene.songdelen || []).forEach(function(d, i) { voeg(['songdelen', i, 'deel'], d.deel); voeg(['songdelen', i, 'omschrijving'], d.omschrijving); });
  if (scene.nam_suggestie) { voeg(['nam_suggestie', 'waarom'], scene.nam_suggestie.waarom); }
  return velden;
}

function zetPad(obj, pad, waarde) {
  var o = obj;
  for (var i = 0; i < pad.length - 1; i++) o = o[pad[i]];
  o[pad[pad.length - 1]] = waarde;
}

async function vertaal(scene, taal, model) {
  var ai = claude.keuze(model, 'medium');
  var velden = tekstVelden(scene);
  if (!velden.length) return { scene: scene, ai: ai, kosten: { dollar: 0, tokens: 0 } };
  var doel = taal === 'en' ? 'English' : 'Nederlands';
  var r = await vraagJson({
    model: ai.model,
    max_tokens: 16000,
    output_config: {
      effort: 'low',
      format: claude.jsonFormaat({ type: 'object', additionalProperties: false, required: ['teksten'], properties: { teksten: { type: 'array', items: { type: 'string' } } } })
    },
    system: 'Vertaal elke tekst naar ' + doel + '. Laat bloknamen, parameternamen, merknamen en waarden met eenheden ongewijzigd. Geef exact evenveel teksten terug, in dezelfde volgorde.',
    messages: [{ role: 'user', content: JSON.stringify(velden.map(function(v) { return v.tekst; })) }]
  });
  var uit = JSON.parse(JSON.stringify(scene));
  var teksten = r.data.teksten || [];
  if (teksten.length !== velden.length) throw new Error('Vertaling onvolledig');
  velden.forEach(function(v, i) { zetPad(uit, v.pad, teksten[i]); });
  return { scene: uit, ai: ai, kosten: r.kosten };
}

module.exports = {
  analyse: analyse, chat: chat, vertaal: vertaal, controleerEnRepareer: controleerEnRepareer,
  sceneSchema: sceneSchema, analyseSchema: analyseSchema, chatSchema: chatSchema, systeem: systeem, limietRegels: limietRegels, tekstVelden: tekstVelden
};
