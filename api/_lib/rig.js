// De gear van de speler: één bron voor alle prompts en de UI.
var redis = require('./redis');

var KEY = 'anagram:rig';

function standaardRig() {
  return {
    bassen: [
      {
        id: 'spector',
        naam: 'Spector NS Ethos 5',
        snaren: 5,
        stemming: 'BEADG',
        pickups: 'EMG 40P5 (neck, P-stijl) + EMG 40J (bridge, J-stijl)',
        elektronica: 'Actief: Aguilar OBP-2 preamp, EMG BQC mid-control (100 Hz–1 kHz), EMG 25K tone pot, 18V',
        kort: 'Actief · 5-snarig · EMG 40P5/40J'
      },
      {
        id: 'pbass',
        naam: 'Fender Precision Bass',
        snaren: 4,
        stemming: 'EADG',
        pickups: 'EMG-HZ split-P',
        elektronica: 'Actief',
        kort: 'Actief · 4-snarig · Split-P EMG-HZ'
      }
    ],
    uitgang: '',
    speelstijl: '',
    wensen: ''
  };
}

function normaliseer(rig) {
  var basis = standaardRig();
  if (!rig || typeof rig !== 'object') return basis;
  var bassen = Array.isArray(rig.bassen) ? rig.bassen.filter(function(b) { return b && b.id && b.naam; }) : [];
  return {
    bassen: bassen.length ? bassen.map(function(b) {
      return {
        id: String(b.id).replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'bas',
        naam: String(b.naam).slice(0, 80),
        snaren: parseInt(b.snaren, 10) || 4,
        stemming: String(b.stemming || '').slice(0, 40),
        pickups: String(b.pickups || '').slice(0, 200),
        elektronica: String(b.elektronica || '').slice(0, 300),
        kort: String(b.kort || '').slice(0, 80),
        notities: String(b.notities || '').slice(0, 500)
      };
    }) : basis.bassen,
    uitgang: String(rig.uitgang || '').slice(0, 200),
    speelstijl: String(rig.speelstijl || '').slice(0, 200),
    wensen: String(rig.wensen || '').slice(0, 1000)
  };
}

async function laad() {
  if (!redis.isGeconfigureerd()) return standaardRig();
  try {
    var r = await redis.getJson(KEY);
    return normaliseer(r);
  } catch (e) {
    console.error('Rig laden mislukt:', e.message);
    return standaardRig();
  }
}

async function bewaar(rig) {
  var n = normaliseer(rig);
  await redis.setJson(KEY, n);
  return n;
}

// Volledige beschrijving van een bas voor in de prompt.
function beschrijf(bas) {
  var d = [bas.snaren + '-snarig', 'standaardstemming ' + bas.stemming];
  if (bas.pickups) d.push('pickups: ' + bas.pickups);
  if (bas.elektronica) d.push(bas.elektronica);
  if (bas.notities) d.push(bas.notities);
  return bas.naam + ' (' + d.join('; ') + ')';
}

function beschrijfRig(rig) {
  var r = [];
  if (rig.uitgang) r.push('Uitgang/versterking: ' + rig.uitgang);
  if (rig.speelstijl) r.push('Speelstijl: ' + rig.speelstijl);
  if (rig.wensen) r.push('Algemene wensen: ' + rig.wensen);
  return r.join('\n');
}

module.exports = { KEY: KEY, standaardRig: standaardRig, normaliseer: normaliseer, laad: laad, bewaar: bewaar, beschrijf: beschrijf, beschrijfRig: beschrijfRig };
