var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var C = require('../shared/catalogus');
var V = require('../shared/validatie');
var R = require('../shared/preset-render');
var Legacy = require('../shared/legacy');
var blokken = require('../api/_lib/blokken');
var claude = require('../api/_lib/claude');
var fake = require('../scripts/fake-claude');

var CAT = blokken.standaard();

function scene(over) {
  return Object.assign({
    bas_id: 'spector', b_snaar_vereist: false, stemming: 'E', toneanalyse: 'x', routing: 'serieel',
    chain_a: ['Microtubes B3K', 'Gain'], chain_b: [], merge_naar: [],
    blokken: [
      { label: 'Microtubes B3K', blok: 'Microtubes B3K', origineel: '', instellingen: [{ parameter: 'Drive', waarde: '40%' }, { parameter: 'Grunt', waarde: 'Fat' }], uitleg: '' },
      { label: 'Gain', blok: 'Gain', origineel: '', instellingen: [{ parameter: 'Level', waarde: '100%' }], uitleg: '' }
    ],
    tips: []
  }, over || {});
}

test('validatie: correcte scene heeft geen fouten', function() {
  var c = V.controleer(scene(), CAT, { volumeBlok: 'Gain' });
  assert.deepStrictEqual(c.fouten, []);
});

test('validatie: onbekende parameter, waarde buiten bereik, foute keten, verkeerd einde', function() {
  var s = scene({ chain_a: ['Gain', 'Microtubes B3K', 'Bestaat Niet'] });
  s.blokken[0].instellingen.push({ parameter: 'Fuzz', waarde: '10%' }, { parameter: 'Tone', waarde: '12 kHz' });
  var c = V.controleer(s, CAT, { volumeBlok: 'Gain' });
  var soorten = c.fouten.map(function(f) { return f.soort; }).sort();
  assert.deepStrictEqual(soorten, ['keten', 'keten', 'parameter', 'waarde']);
});

test('herstel: begrenst waarden en verwijdert wat niet bestaat', function() {
  var s = scene();
  s.blokken[0].instellingen.push({ parameter: 'Fuzz', waarde: '10%' }, { parameter: 'Tone', waarde: '12 kHz' });
  s.chain_a.push('Spook');
  var r = V.herstel(s, CAT);
  var tone = r.scene.blokken[0].instellingen.find(function(i) { return i.parameter === 'Tone'; });
  assert.strictEqual(tone.waarde, '8 kHz');
  assert.ok(!r.scene.blokken[0].instellingen.some(function(i) { return i.parameter === 'Fuzz'; }));
  assert.deepStrictEqual(r.scene.chain_a, ['Microtubes B3K', 'Gain']);
  assert.strictEqual(r.aanpassingen.length, 3);
});

test('renderer: knoppen volgens catalogusbereik en alles ge-escaped', function() {
  var s = scene();
  s.blokken[0].instellingen.push({ parameter: 'Tone', waarde: '5 kHz' });
  s.toneanalyse = '<img src=x onerror=alert(1)>';
  var html = R.renderScene(s, { catalogus: CAT, bas: { snaren: 5 }, t: function(k) { return k; } });
  assert.ok(html.indexOf('<img') === -1 && html.indexOf('&lt;img') !== -1);
  assert.ok(html.indexOf('selector-opt active">Fat') !== -1, 'Grunt als keuzelijst met Fat actief');
  assert.ok(/knob-center-val[^>]*>5 kHz</.test(html), 'Tone als knop met eenheid');
  var o = R.renderOnderzoek({ bronnen: [{ titel: 'x', url: 'javascript:alert(1)' }, { titel: 'ok', url: 'https://a.nl' }], bevindingen: [] }, { t: function(k) { return k; } });
  assert.ok(o.indexOf('javascript:') === -1 && o.indexOf('https://a.nl') !== -1);
});

test('legacy: oude tekstpreset wordt een scene', function() {
  var tekst = 'B_SNAAR_VEREIST: ja\nARTIEST: Tool\nSONG: Schism\n## TONE ANALYSE\nGrommend.\n## SIGNAALCHAIN\nPARALLEL\nCHAIN_A: Split > Microtubes B3K\nCHAIN_B: Jim Bass\nMERGE_NAAR: Merge > Gain\n## BLOKKEN\n### Microtubes B3K (Darkglass B3K)\nINSTELLINGEN:\n- Drive: 40%\nUITLEG: Drive.\n## FINE-TUNE TIPS\n1. Drop D.\n2. Plectrum.';
  var s = Legacy.naarScene(tekst, 'pbass');
  assert.strictEqual(s.b_snaar_vereist, true);
  assert.strictEqual(s.routing, 'parallel');
  assert.deepStrictEqual(s.chain_b, ['Jim Bass']);
  assert.deepStrictEqual(s.blokken[0].instellingen, [{ parameter: 'Drive', waarde: '40%' }]);
  assert.strictEqual(s.blokken[0].origineel, 'Darkglass B3K');
  assert.deepStrictEqual(s.tips, ['Drop D.', 'Plectrum.']);
  var oud = Legacy.scenesUitPreset({ isDual: true, sceneSpector: tekst, scenePbass: tekst });
  assert.deepStrictEqual(oud.map(function(x) { return x.bas_id; }), ['spector', 'pbass']);
});

test('analyse-endpoint: onderzoek, ontwerp, reparatie en kosten (nep-Claude)', async function() {
  h.resetRedis();
  delete process.env.APP_WACHTWOORD;
  claude._zetClient(fake);
  var echteFetch = global.fetch;
  global.fetch = async function() { return { ok: false, json: async function() { return null; } }; };
  try {
    var r = await h.roep(require('../api/analyse'), { method: 'POST', body: { artist: 'Tool', song: 'Schism', bassen: ['spector', 'pbass'], taal: 'nl' } });
    var events = r.geschreven.split('\n\n').filter(Boolean).map(function(x) { return x.slice(6); }).filter(function(x) { return x !== '[DONE]'; }).map(JSON.parse);
    var res = events.find(function(e) { return e.resultaat; }).resultaat;
    assert.ok(events.some(function(e) { return /Zoekt:/.test(e.tekst || ''); }), 'zoekopdrachten worden gemeld');
    assert.ok(events.some(function(e) { return e.onderzoek; }), 'onderzoek komt los binnen');
    assert.strictEqual(res.scenes.length, 2);
    assert.ok(res.scenes[0].controle.gerepareerd, 'Drive 140% wordt door Claude gerepareerd');
    assert.deepStrictEqual(V.controleer(res.scenes[0], CAT, { volumeBlok: 'Gain' }).fouten, []);
    assert.ok(res.onderzoek.bronnen.every(function(b) { return /^https?:/.test(b.url); }), 'javascript:-bronnen gefilterd');
    assert.ok(res.kosten.dollar > 0);
    // tweede keer komt het onderzoek uit de cache
    var r2 = await h.roep(require('../api/analyse'), { method: 'POST', body: { artist: 'Tool', song: 'Schism', bassen: ['spector'] } });
    assert.ok(/Eerder onderzoek gebruikt/.test(r2.geschreven));
  } finally {
    global.fetch = echteFetch;
  }
});
