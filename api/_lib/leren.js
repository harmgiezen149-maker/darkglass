// Leren van eerdere presets: goed beoordeelde presets in hetzelfde genre (of
// van dezelfde artiest) gaan als voorbeeld mee, en terugkerende feedback
// ("te schel", "te veel gain") als algemene les.
var redis = require('./redis');
var Catalogus = require('../../shared/catalogus');

var HASH = 'anagram:presets';

async function allePresets() {
  if (!redis.isGeconfigureerd()) return [];
  var plat = await redis.cmd(['HGETALL', HASH]) || [];
  var uit = [];
  for (var i = 0; i < plat.length; i += 2) {
    var p = redis.parseJson(plat[i + 1]);
    if (p && typeof p === 'object') uit.push(p);
  }
  return uit;
}

function heeftFeedback(p) { return p.feedback && typeof p.feedback.score === 'number'; }

// Compacte samenvatting van een preset: keten + belangrijkste instellingen.
function samenvatting(p) {
  var scene = (p.scenes || []).find(function(s) { return s && Array.isArray(s.blokken); });
  if (!scene) return null;
  var blokken = scene.blokken.map(function(b) {
    var ins = (b.instellingen || []).slice(0, 5).map(function(i) { return i.parameter + ' ' + i.waarde; }).join(', ');
    return b.blok + (ins ? ' (' + ins + ')' : '');
  });
  var f = p.feedback || {};
  return '- ' + p.artist + ' – ' + p.song + ' [' + scene.bas_id + ']: ' + blokken.join(' > ')
    + (f.tags && f.tags.length ? '. Feedback: ' + f.tags.join(', ') : '')
    + (f.notitie ? '. Notitie: "' + String(f.notitie).slice(0, 200) + '"' : '');
}

function lessen(presets) {
  var tellers = {};
  presets.filter(heeftFeedback).forEach(function(p) {
    (p.feedback.tags || []).forEach(function(tag) { tellers[tag] = (tellers[tag] || 0) + 1; });
  });
  var vaak = Object.keys(tellers).filter(function(k) { return tellers[k] >= 2; }).sort(function(a, b) { return tellers[b] - tellers[a]; });
  if (!vaak.length) return '';
  return 'Terugkerende feedback van de speler op eerdere presets: ' + vaak.map(function(k) { return '"' + k + '" (' + tellers[k] + 'x)'; }).join(', ')
    + '. Houd daar rekening mee.';
}

// opts: { artiest, genre, alleenLessen }
async function voorbeeldenVoorPrompt(opts) {
  opts = opts || {};
  var presets = await allePresets();
  if (!presets.length) return '';
  var delen = [];
  var l = lessen(presets);
  if (l) delen.push(l);
  if (!opts.alleenLessen) {
    var art = Catalogus.slug(opts.artiest), gen = Catalogus.slug(opts.genre);
    var goed = presets.filter(function(p) { return heeftFeedback(p) && p.feedback.score > 0; })
      .map(function(p) {
        var score = 0;
        if (art && Catalogus.slug(p.artist) === art) score += 3;
        var pg = Catalogus.slug(p.onderzoek && p.onderzoek.genre);
        if (gen && pg && (pg === gen || pg.indexOf(gen) !== -1 || gen.indexOf(pg) !== -1)) score += 2;
        return { p: p, score: score };
      })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a, b) { return b.score - a.score || String(b.p.id).localeCompare(String(a.p.id)); })
      .slice(0, 2)
      .map(function(x) { return samenvatting(x.p); })
      .filter(Boolean);
    if (goed.length) {
      delen.push('Presets die de speler eerder goed vond in een vergelijkbare stijl (ter inspiratie, niet kopiëren):\n' + goed.join('\n'));
    }
  }
  return delen.join('\n\n');
}

module.exports = { voorbeeldenVoorPrompt: voorbeeldenVoorPrompt, lessen: lessen, samenvatting: samenvatting };
