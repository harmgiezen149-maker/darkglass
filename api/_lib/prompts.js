// Prompts worden op de server opgebouwd: de browser stuurt alleen artiest,
// song, bas en wensen. Zo kan niemand de API-sleutel voor iets anders gebruiken.
var blokken = require('./blokken');
var rigLib = require('./rig');

var TAAL = {
  nl: 'Antwoord in het Nederlands.',
  en: 'Answer in English.'
};

function basisInstructies(secties) {
  var vol = blokken.volumeBlok(secties);
  var volumeRegel = vol
    ? 'Sluit de signaalchain ALTIJD af met het blok "' + vol.naam + '" als volumeregelaar, zodat de speler volumecontrole heeft. Geef een aanbevolen startwaarde voor Level.\n\n'
    : '';

  return 'Je bent een expert in basgitaar-sound design voor de Darkglass Anagram (KosmOS). '
    + 'Gebruik ALLEEN de bloknamen en parameters uit de lijst BESCHIKBARE ANAGRAM BLOKKEN hieronder. '
    + 'Geef GEEN parameters op die niet in die lijst staan, en blijf binnen de opgegeven bereiken.\n\n'
    + 'Zet ALTIJD de eerste drie regels zo:\n'
    + 'B_SNAAR_VEREIST: ja of nee (ja als de baspartij noten onder de lage E gebruikt)\n'
    + 'ARTIEST: [correcte officiele artiestnaam]\n'
    + 'SONG: [correcte officiele songtitel]\n\n'
    + 'Structureer je antwoord daarna ALTIJD exact zo:\n\n'
    + '## TONE ANALYSE\n[analyse van de bastone]\n\n'
    + '## SIGNAALCHAIN\n'
    + 'SERIEEL of PARALLEL\n'
    + 'CHAIN_A: Blok1 > Blok2 > Blok3\n'
    + 'CHAIN_B: Blok4 > Blok5 (alleen bij parallel)\n'
    + 'MERGE_NAAR: Blok6 (alleen bij parallel)\n\n'
    + '## BLOKKEN\n\n'
    + '### BLOKNAAM (origineel model)\n'
    + 'INSTELLINGEN:\n'
    + '- Parameternaam: waarde\n'
    + 'UITLEG: een zin waarom\n\n'
    + '## FINE-TUNE TIPS\n[3 concrete tips. Noem bij stemming ALLEEN de basstemming (bijv. Drop D, Eb standaard), niet de gitaarstemming, '
    + 'en houd rekening met de standaardstemming van de gekozen bas. Houd ook rekening met de pickups en elektronica van die bas.]\n\n'
    + volumeRegel
    + 'BELANGRIJK: De sectienamen (TONE ANALYSE, SIGNAALCHAIN, BLOKKEN, FINE-TUNE TIPS) moeten EXACT zo blijven staan, ook als je een andere taal gebruikt voor de inhoud. '
    + 'De labels INSTELLINGEN, UITLEG, ARTIEST, SONG, CHAIN_A, CHAIN_B, MERGE_NAAR, SERIEEL en PARALLEL ook letterlijk zo houden.\n\n'
    + blokken.promptTekst(secties);
}

// System prompt als blokken: het vaste deel (instructies + bloklijst) wordt
// gecachet, het variabele deel staat erachter.
function systeem(secties, variabel) {
  return [
    { type: 'text', text: basisInstructies(secties), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: variabel }
  ];
}

function kiesBassen(rig, ids) {
  var lijst = (Array.isArray(ids) ? ids : [ids]).map(function(id) {
    return rig.bassen.find(function(b) { return b.id === id; });
  }).filter(Boolean);
  return lijst.length ? lijst.slice(0, 3) : [rig.bassen[0]];
}

function analyse(opts) {
  var rig = opts.rig, bassen = kiesBassen(rig, opts.bassen);
  var rigTekst = rigLib.beschrijfRig(rig);
  var variabel = TAAL[opts.taal] || TAAL.nl;
  if (rigTekst) variabel += '\n\nOver de speler:\n' + rigTekst;

  var vraag;
  if (bassen.length > 1) {
    variabel += '\n\nDe gebruiker wil presets voor ' + bassen.length + ' bassen tegelijk. Genereer voor elke bas een volledige, aparte preset. '
      + 'Begin elke preset met een eigen regel ==SCENE_<ID>== (in hoofdletters), in deze volgorde: '
      + bassen.map(function(b) { return '==SCENE_' + b.id.toUpperCase() + '=='; }).join(', ') + '. '
      + 'Elke scene bevat het volledige formaat, inclusief een eigen regel B_SNAAR_VEREIST die per bas apart bepaald wordt. '
      + 'Gebruik waar het kan dezelfde blokstructuur, met instellingen aangepast per bas. '
      + 'Vermeld bij bassen met minder snaren of blokken aan of uit moeten om de sound werkbaar te maken.';
    vraag = 'Ik wil de bastone van "' + opts.song + '" van ' + opts.artist + ' namaken met de Darkglass Anagram, voor deze bassen:\n'
      + bassen.map(function(b) { return '- ' + rigLib.beschrijf(b); }).join('\n');
  } else {
    vraag = 'Ik wil de bastone van "' + opts.song + '" van ' + opts.artist + ' namaken met mijn ' + rigLib.beschrijf(bassen[0])
      + ' en de Darkglass Anagram. Geef me een volledig preset-plan.';
  }
  if (opts.extra) vraag += '\n\nExtra wensen: ' + opts.extra;

  return { system: systeem(opts.secties, variabel), messages: [{ role: 'user', content: vraag }], bassen: bassen };
}

function chat(opts) {
  var rig = opts.rig, bas = kiesBassen(rig, opts.basId)[0];
  var variabel = (TAAL[opts.taal] || TAAL.nl)
    + '\n\nDe gebruiker verfijnt een bestaande preset voor: ' + rigLib.beschrijf(bas) + '. '
    + 'Genereer een VOLLEDIG bijgewerkt preset-plan in exact hetzelfde formaat. Geen extra uitleg buiten het preset-plan.';
  var eerder = (opts.geschiedenis || []).slice(-6).map(function(v) { return '- ' + String(v).slice(0, 500); });
  var tekst = 'Dit is de huidige preset' + (opts.context ? ' (' + opts.context + ')' : '') + ':\n\n' + opts.preset + '\n\n'
    + (eerder.length ? 'Eerdere aanpassingsverzoeken in dit gesprek:\n' + eerder.join('\n') + '\n\n' : '')
    + 'Nieuw verzoek: ' + opts.vraag;
  return { system: systeem(opts.secties, variabel), messages: [{ role: 'user', content: tekst }] };
}

function vertaal(opts) {
  var doel = opts.taal === 'en' ? 'English' : 'Nederlands';
  var system = 'Je krijgt een Anagram preset-document. Vertaal ALLE tekst naar ' + doel + ', '
    + 'maar BEHOUD de exacte structuur en deze markers letterlijk: '
    + 'B_SNAAR_VEREIST, ARTIEST, SONG, ## TONE ANALYSE, ## SIGNAALCHAIN, ## BLOKKEN, ## FINE-TUNE TIPS, '
    + 'SERIEEL, PARALLEL, CHAIN_A, CHAIN_B, MERGE_NAAR, INSTELLINGEN, UITLEG en regels als ==SCENE_...==. '
    + 'Bloknamen en parameternamen blijven ook letterlijk. Vertaal alleen de uitleg, tone analyse en fine-tune tips. '
    + 'Geef ALLEEN het vertaalde document terug.';
  return { system: system, messages: [{ role: 'user', content: opts.tekst }] };
}

module.exports = { basisInstructies: basisInstructies, analyse: analyse, chat: chat, vertaal: vertaal, kiesBassen: kiesBassen, TAAL: TAAL };
