// Blokcatalogus van de Anagram: opslag in Redis + ingebouwde startlijst.
// Parameters zijn gestructureerd (zie shared/catalogus.js); oude opslag met
// parameters als tekst wordt bij het laden automatisch omgezet.
var redis = require('./redis');
var Catalogus = require('../../shared/catalogus');

var KEY = 'anagram:blocks';
var KEY_STANDAARD = 'anagram:blocks:default';
var KEY_META = 'anagram:blocks:meta';

async function laad() {
  if (!redis.isGeconfigureerd()) return standaard();
  try {
    var b = await redis.getJson(KEY);
    var cat = Catalogus.normaliseerCatalogus(b);
    return cat.length ? cat : standaard();
  } catch (e) {
    console.error('Blokken laden mislukt:', e.message);
    return standaard();
  }
}

async function laadMeta() {
  var meta = redis.isGeconfigureerd() ? await redis.getJson(KEY_META).catch(function() { return null; }) : null;
  return Object.assign({ kosmos: '1.13', bijgewerkt: null }, meta || {});
}

async function bewaar(secties, meta) {
  var cat = Catalogus.normaliseerCatalogus(secties);
  var cmds = [['SET', KEY, JSON.stringify(cat)]];
  if (meta) cmds.push(['SET', KEY_META, JSON.stringify(Object.assign(await laadMeta(), meta, { bijgewerkt: new Date().toISOString() }))]);
  await redis.pipeline(cmds);
  return cat;
}

function standaard() {
  return Catalogus.normaliseerCatalogus(getDefaultBlocks());
}

// Leesbare lijst voor in de prompt.
function promptTekst(secties, kosmos) {
  return '=== BESCHIKBARE ANAGRAM BLOKKEN' + (kosmos ? ' (KosmOS ' + kosmos + ')' : '') + ' ===\n' + Catalogus.promptTekst(secties);
}

// Het blok dat als volumeregelaar aan het eind van de keten hoort:
// bij voorkeur een blok met "volume" in de naam, anders "Gain".
function volumeBlok(secties) {
  var alle = Catalogus.alleBlokken(secties).map(function(x) { return x.blok; });
  return alle.find(function(b) { return /volume/i.test(b.naam); })
    || alle.find(function(b) { return /^gain$/i.test(String(b.naam).trim()); })
    || null;
}

function getDefaultBlocks() {
  return [
    {
      sectie: 'DRIVE',
      blokken: [
        { naam: 'Microtubes B3K', basis: 'Darkglass B3K pedaal', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Tone (3kHz-8kHz), Grunt (Off/Fat/Raw), Mid Boost (On/Off)' },
        { naam: 'Vintage Microtubes', basis: 'Darkglass VMT pedaal', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Tone (0-100%), Grunt (On/Off)' },
        { naam: 'Alpha Omicron', basis: 'Darkglass Alpha Omicron pedaal', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Voice (Alpha/Omega)' },
        { naam: 'Duality Fuzz', basis: 'Darkglass Duality Fuzz pedaal', parameters: 'Fuzz (0-100%), Blend (0-100%), Level (0-100%), Voice (Silicon/Germanium)' },
        { naam: 'Chinchilla', basis: 'EHX Big Muff Pi-stijl', parameters: 'Gain (0-100%), Blend (0-100%), Level (0-100%), Tone (0-100%)' },
        { naam: 'Microtubes X', basis: 'Darkglass Microtubes X', parameters: 'Drive (0-100%), Blend (0-100%), Level (0-100%), Bass (0-100%), Treble (0-100%)' },
        { naam: 'Bee Kolme OD', basis: 'Boss ODB-3-stijl', parameters: 'Gain (0-100%), Level (0-100%), Blend (0-100%), EQ Low (0-100%), EQ High (0-100%)' },
        { naam: 'Arc Dreamer', basis: 'Tube Screamer-stijl', parameters: 'Drive (0-100%), Tone (0-100%), Level (0-100%)' }
      ]
    },
    {
      sectie: 'COMPRESSOR',
      blokken: [
        { naam: 'Ignissor', basis: 'Darkglass multiband compressor', parameters: 'Low Threshold (-60 tot 0 dB), Mid Threshold (-60 tot 0 dB), High Threshold (-60 tot 0 dB), Ratio (1:1-20:1), Attack (1-100 ms), Release (10-500 ms), Gain (0-24 dB)' },
        { naam: 'Luminal FET Compressor', basis: 'UA 1176-stijl', parameters: 'Input (0-10), Output (0-10), Attack (0-10), Release (0-10), Ratio (4:1/8:1/12:1/20:1/All), Blend (0-100%)' },
        { naam: 'BUS Compressor', basis: 'SSL G-Bus-stijl', parameters: 'Threshold (-30 tot 0 dB), Ratio (2:1/4:1/10:1), Attack (1/3/10/30/100 ms), Release (100/200/400 ms of Auto), Makeup Gain (0-24 dB)' },
        { naam: 'Compressor/Limiter', basis: 'Algemeen', parameters: 'Threshold (-60 tot 0 dB), Ratio (1:1-20:1 of Limiter), Attack (0.1-100 ms), Release (10-2000 ms), Makeup Gain (0-24 dB)' }
      ]
    },
    {
      sectie: 'PREAMP / AMP',
      blokken: [
        { naam: 'Harmonic Booster', basis: 'Darkglass Harmonic Booster', parameters: 'Gain (0-100%), Level (0-100%), Bass (-15 tot +15 dB), Treble (-15 tot +15 dB)' },
        { naam: 'Leo Bass', basis: 'Fender Bassman-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Presence (0-100%), Master (0-100%)' },
        { naam: 'Jim Bass', basis: 'Ampeg SVT-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Master (0-100%), Bright (On/Off)' },
        { naam: 'Gentle', basis: 'Aguilar Tone Hammer-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Mid Freq (40Hz-1kHz), Treble (0-100%), Master (0-100%)' },
        { naam: 'Peggy Bass', basis: 'Ampeg SVT-VR-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Master (0-100%)' },
        { naam: 'SWIRL-900', basis: 'SWR SM-900-stijl', parameters: 'Gain (0-100%), Bass (0-100%), Lo-Mid (0-100%), Hi-Mid (0-100%), Treble (0-100%), Master (0-100%)' }
      ]
    },
    {
      sectie: 'CABINET / IR',
      blokken: [
        { naam: 'IR Loader', basis: 'Darkglass IR Loader', parameters: 'IR File (Darkglass Neo 4x10 / Modern Bass 4x10 / Peggy 8x10 / Jim Bass 8x10 / Vintage 4x10 / Vintage 2x15), Level (0-100%), Low Cut (20-500 Hz), High Cut (2kHz-20kHz)' }
      ]
    },
    {
      sectie: 'EQ / FILTER',
      blokken: [
        { naam: 'Parametric EQ', basis: 'Parametrische equalizer', parameters: 'Low Freq (20-500 Hz), Low Gain (-15/+15 dB), Low-Mid Freq (100Hz-2kHz), Low-Mid Gain (-15/+15 dB), Low-Mid Q (0.5-10), Mid Freq (200Hz-5kHz), Mid Gain (-15/+15 dB), Mid Q (0.5-10), High-Mid Freq (500Hz-10kHz), High-Mid Gain (-15/+15 dB), High-Mid Q (0.5-10), High Freq (1kHz-20kHz), High Gain (-15/+15 dB)' },
        { naam: 'Darkglass 6-Band EQ', basis: 'Grafische equalizer', parameters: '40Hz (+/-15 dB), 150Hz (+/-15 dB), 500Hz (+/-15 dB), 2kHz (+/-15 dB), 5kHz (+/-15 dB), 12kHz (+/-15 dB)' },
        { naam: 'Hi-Pass Filter', basis: 'Hoogdoorlaatfilter', parameters: 'Frequency (20-500 Hz), Slope (6/12/18/24 dB/oct)' },
        { naam: 'Lo-Pass Filter', basis: 'Laagdoorlaatfilter', parameters: 'Frequency (1kHz-20kHz), Slope (6/12/18/24 dB/oct)' },
        { naam: 'Noise Suppressor', basis: 'Boss NS-2-stijl', parameters: 'Threshold (0-100%), Decay (0-100%)' }
      ]
    },
    {
      sectie: 'MODULATIE',
      blokken: [
        { naam: 'Mint Chocolate Chorus', basis: 'Boss CE-2-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Blend (0-100%)' },
        { naam: 'Flamingo Flanger', basis: 'Boss BF-2-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Resonance (0-100%), Manual (0-100%)' },
        { naam: 'Pharos Phaser', basis: 'MXR Phase 90-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Blend (0-100%)' },
        { naam: 'Tremora Tremolo', basis: 'Boss TR-2-stijl', parameters: 'Rate (0-100%), Depth (0-100%), Wave (Sine/Square)' }
      ]
    },
    {
      sectie: 'PITCH / OCTAVE',
      blokken: [
        { naam: 'Sublime Octaver mono', basis: 'Boss OC-2-stijl', parameters: 'Oct 1 Level (0-100%), Oct 2 Level (0-100%), Direct Level (0-100%)' },
        { naam: 'Subcitri Octaver poly', basis: 'EHX POG-stijl', parameters: 'Sub Oct Level (0-100%), Oct Up Level (0-100%), Dry Level (0-100%), Detune (cents)' }
      ]
    },
    {
      sectie: 'DELAY',
      blokken: [
        { naam: 'Digital Delay', basis: 'Boss DD-3-stijl', parameters: 'Time (1-2000 ms of BPM-sync), Feedback (0-100%), Blend (0-100%), Mode (Normal/Hold)' },
        { naam: 'Analog Delay', basis: 'Boss DM-2-stijl', parameters: 'Time (20-600 ms), Feedback (0-100%), Blend (0-100%)' }
      ]
    },
    {
      sectie: 'REVERB',
      blokken: [
        { naam: 'Room Reverb', basis: 'Kameralmslag', parameters: 'Decay (0.1-10 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)' },
        { naam: 'Plate Reverb', basis: 'Plaatalmslag', parameters: 'Decay (0.1-10 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)' },
        { naam: 'Hall Reverb', basis: 'Zaalalmslag', parameters: 'Decay (0.5-20 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)' }
      ]
    },
    {
      sectie: 'UTILITY',
      blokken: [
        { naam: 'Gain', basis: 'Signaalniveau', parameters: 'Level (0-200%), Pad (-20 tot 0 dB)' },
        { naam: 'Split', basis: 'Signaalverdeler', parameters: 'Balance (0-100%)' },
        { naam: 'Merge', basis: 'Signaalsamenvoeger', parameters: 'Blend (0-100%), Pan A (L-R), Pan B (L-R)' }
      ]
    }
  ];
}

module.exports = { KEY: KEY, KEY_STANDAARD: KEY_STANDAARD, KEY_META: KEY_META, laad: laad, laadMeta: laadMeta, bewaar: bewaar, standaard: standaard, promptTekst: promptTekst, volumeBlok: volumeBlok, getDefaultBlocks: getDefaultBlocks };
