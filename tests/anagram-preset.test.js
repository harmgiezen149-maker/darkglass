var test = require('node:test');
var assert = require('node:assert');
var A = require('../shared/anagram-preset');
var C = require('../shared/catalogus');
var blokken = require('../api/_lib/blokken');

var CAT = blokken.standaard();

function scene(over) {
  return Object.assign({
    bas_id: 'spector', routing: 'serieel', chain_a: ['Compressor/Limiter', 'Microtubes B3K', 'Gain'], chain_b: [], merge_naar: [],
    blokken: [
      { label: 'Compressor/Limiter', blok: 'Compressor/Limiter', instellingen: [{ parameter: 'Threshold', waarde: '-20 dB' }, { parameter: 'Ratio', waarde: '4:1' }] },
      { label: 'Microtubes B3K', blok: 'Microtubes B3K', instellingen: [{ parameter: 'Drive', waarde: '40%' }, { parameter: 'Grunt', waarde: 'Fat' }, { parameter: 'Mid Boost', waarde: 'On' }, { parameter: 'Tone', waarde: '5 kHz' }] },
      { label: 'Gain', blok: 'Gain', instellingen: [{ parameter: 'Level', waarde: '100%' }] }
    ],
    songdelen: []
  }, over || {});
}

test('officieel formaat: het kleinste geldige voorbeeld uit PRESET-FORMAT.md', function() {
  assert.deepStrictEqual(A.controleer({ preset: {}, type: 'preset', version: 1 }), []);
  assert.ok(A.controleer({ preset: {}, type: 'bank', version: 1 }).length);
  assert.ok(A.controleer({ preset: {}, type: 'preset', version: 0 }).length);
  assert.ok(A.controleer({ preset: {}, type: 'preset', version: 2 }).some(function(f) { return /nieuwer/.test(f); }));
});

test('officieel formaat: de controle vangt fouten in blokken, parameters en scènes', function() {
  var p = { type: 'preset', version: 1, preset: { uuid: 'ABC', chains: { '1': { blocks: { '1': {
    enabled: 'ja', parameters: { '1': { symbol: 'gain', value: 1 }, '3': { symbol: 'x', value: 'hoog' } },
    scenes: { '2': { parameters: [{ symbol: 'depth' }], properties: [] } }
  } } } } } };
  var f = A.controleer(p).join('\n');
  assert.ok(/uuid/.test(f) && /"uri" ontbreekt/.test(f) && /enabled/.test(f) && /zonder gaten/.test(f) && /scenes\.2\.parameters\[0\]/.test(f), f);
});

test('export: serieel, met waarden als getal en een geldig bestand', function() {
  var r = A.maak(scene(), CAT, { naam: 'Tool - Schism', uuid: '3f2b7c1e-8a4d-4f6b-9c2e-1d5a7b9e0c3f' });
  assert.deepStrictEqual(A.controleer(r.preset), []);
  assert.strictEqual(r.preset.preset.name, 'Tool - Schism');
  var rij = r.preset.preset.chains['1'].blocks;
  assert.deepStrictEqual(Object.keys(rij), ['1', '2', '3']);
  var b3k = rij['2'];
  var waarden = {};
  Object.keys(b3k.parameters).forEach(function(k) { waarden[b3k.parameters[k].name] = b3k.parameters[k].value; });
  assert.deepStrictEqual(waarden, { Drive: 40, Grunt: 1, 'Mid Boost': 1, Tone: 5 }, 'percentage als getal, keuze als volgnummer, aan als 1, kHz in de eenheid van de catalogus');
  assert.strictEqual(b3k.parameters['1'].symbol, 'drive', 'symbool afgeleid van de naam');
  assert.strictEqual(rij['1'].parameters['2'].value, 4, 'ratio 4:1 → 4');
  assert.ok(!r.volledig, 'zonder officiële id\'s is de export niet volledig');
  assert.strictEqual(r.telling.metUri, 0);
});

test('export: met officiële id\'s uit de catalogus is hij volledig', function() {
  var cat = C.normaliseerCatalogus([
    { sectie: 'DRIVE', blokken: [{ naam: 'Microtubes B3K', uri: 'urn:darkglass:b3k', parameters: 'Drive [drive] (0-100%), Grunt [grunt] (Off/Fat/Raw)' }] },
    { sectie: 'UTILITY', blokken: [{ naam: 'Gain', uri: 'urn:darkglass:gain', parameters: 'Level [level] (0-200%)' }] }
  ]);
  var s = scene({ chain_a: ['Microtubes B3K', 'Gain'], blokken: scene().blokken.slice(1).map(function(b, i) {
    return i === 0 ? Object.assign({}, b, { instellingen: b.instellingen.slice(0, 2) }) : b;
  }) });
  var r = A.maak(s, cat, { naam: 'x' });
  assert.ok(r.volledig, JSON.stringify(r.waarschuwingen));
  assert.strictEqual(r.preset.preset.chains['1'].blocks['1'].uri, 'urn:darkglass:b3k');
  assert.strictEqual(r.preset.preset.chains['1'].blocks['1'].parameters['2'].symbol, 'grunt');
});

test('export: parallelle routing op twee rijen, merge na beide paden', function() {
  var s = scene({
    routing: 'parallel', chain_a: ['Split', 'Microtubes B3K'], chain_b: ['Compressor/Limiter'], merge_naar: ['Merge', 'Gain'],
    blokken: scene().blokken.concat([{ label: 'Split', blok: 'Split', instellingen: [] }, { label: 'Merge', blok: 'Merge', instellingen: [{ parameter: 'Blend', waarde: '60%' }] }])
  });
  var r = A.maak(s, CAT, { naam: 'p' });
  assert.deepStrictEqual(A.controleer(r.preset), []);
  var ch = r.preset.preset.chains;
  assert.deepStrictEqual(Object.keys(ch['1'].blocks), ['1', '2', '3', '4']);
  assert.deepStrictEqual(Object.keys(ch['2'].blocks), ['1']);
  assert.ok(/compressor/.test(ch['2'].blocks['1'].uri));
  assert.ok(/gain/.test(ch['1'].blocks['4'].uri));
});

test('export: songdelen worden scènes; de basisstand bepaalt aan/uit', function() {
  var s = scene({ songdelen: [
    { deel: 'Intro', footswitch: '', wijzigingen: [{ label: 'Microtubes B3K', actie: 'uit', parameter: '', waarde: '' }] },
    { deel: 'Refrein', footswitch: 'FS2', wijzigingen: [{ label: 'Microtubes B3K', actie: 'aan', parameter: '', waarde: '' }, { label: 'Gain', actie: 'wijzig', parameter: 'Level', waarde: '90%' }] },
    { deel: 'Solo', footswitch: 'FS3', wijzigingen: [{ label: 'Gain', actie: 'wijzig', parameter: 'Level', waarde: '120%' }] }
  ] });
  var r = A.maak(s, CAT, { naam: 's' });
  assert.deepStrictEqual(A.controleer(r.preset), []);
  var p = r.preset.preset;
  assert.deepStrictEqual(p.sceneNames, { '1': 'Refrein', '2': 'Solo' });
  var b3k = p.chains['1'].blocks['2'], gain = p.chains['1'].blocks['3'];
  assert.strictEqual(b3k.enabled, false, 'intro zonder drive');
  assert.deepStrictEqual(b3k.scenes['1'].parameters, [{ symbol: ':bypass', value: 0 }]);
  assert.deepStrictEqual(gain.scenes['1'].parameters, [{ symbol: 'level', value: 90 }]);
  assert.deepStrictEqual(gain.scenes['2'].parameters, [{ symbol: 'level', value: 120 }]);
});

test('export: IR-keuze wordt een property met waarschuwing', function() {
  var s = scene({ chain_a: ['IR Loader'], blokken: [{ label: 'IR Loader', blok: 'IR Loader', instellingen: [{ parameter: 'IR File', waarde: 'Peggy 8x10' }, { parameter: 'Low Cut', waarde: '40 Hz' }] }] });
  var r = A.maak(s, CAT, { naam: 'ir' });
  assert.deepStrictEqual(A.controleer(r.preset), []);
  var blok = r.preset.preset.chains['1'].blocks['1'];
  assert.strictEqual(blok.properties['1'].value, 'Peggy 8x10');
  assert.strictEqual(blok.parameters['1'].symbol, 'low_cut');
  assert.ok(r.waarschuwingen.some(function(w) { return /bestandskeuze/.test(w); }));
});

test('catalogus: symbolen en officiële id blijven bewaard, ook na een handleiding-update', function() {
  var p = C.parseParameterTekst('Drive [drive] (0-100%), Mode [:bypass] (On/Off), Raar [1x] (0-1)');
  assert.deepStrictEqual(p.map(function(x) { return x.symbol || ''; }), ['drive', ':bypass', '']);
  assert.strictEqual(p[2].naam, 'Raar [1x]', 'ongeldig symbool blijft deel van de naam');
  assert.strictEqual(C.formatParameters(p.slice(0, 1)), 'Drive [drive] (0-100%)');
  assert.ok(!C.normaliseerBlok({ naam: 'X', uri: 'javascript:alert(1)' }).uri);
  var huidig = C.normaliseerCatalogus([{ sectie: 'DRIVE', blokken: [{ naam: 'Microtubes B3K', uri: 'urn:darkglass:b3k', parameters: 'Drive [drive] (0-100%)' }] }]);
  var bron = C.normaliseerCatalogus([{ sectie: 'DRIVE', blokken: [{ naam: 'Microtubes B3K', parameters: 'Drive (0-100%), Blend (0-100%)', status: 'geverifieerd' }] }]);
  var v = C.vergelijk(huidig, bron);
  var na = C.pasToe(huidig, v.map(function(x) { return { voorstel: x, besluit: 'overnemen' }; }));
  var b = C.vindBlok(na, 'Microtubes B3K');
  assert.strictEqual(b.uri, 'urn:darkglass:b3k');
  assert.strictEqual(b.parameters[0].symbol, 'drive');
  assert.strictEqual(b.parameters.length, 2);
});

// ---------- apparaatgrenzen ----------
var V = require('../shared/validatie');
var ontwerp = require('../api/_lib/ontwerp');
var h = require('./helpers');

test('grenzen: normaliseren accepteert alleen positieve getallen en een absoluut pad', function() {
  assert.deepStrictEqual(C.normaliseerLimieten({ maxBlokken: '5', maxRijen: 0, maxScenes: 'x', irMap: '/data/ir/' }), { maxBlokken: 5, maxRijen: null, maxScenes: null, irMap: '/data/ir' });
  assert.strictEqual(C.normaliseerLimieten({ irMap: '../../etc' }).irMap, '');
  assert.strictEqual(C.normaliseerLimieten({ irMap: '/a;rm -rf' }).irMap, '');
});

test('grenzen: de controle meldt te veel blokken, rijen en scènes', function() {
  var s = scene({ routing: 'parallel', chain_a: ['Microtubes B3K', 'Gain'], chain_b: ['Compressor/Limiter'], merge_naar: [],
    songdelen: [{ deel: 'A', footswitch: 'FS1', wijzigingen: [] }, { deel: 'B', footswitch: 'FS2', wijzigingen: [] }] });
  var soorten = V.controleer(s, CAT, { limieten: { maxBlokken: 2, maxRijen: 1, maxScenes: 1 } }).fouten.filter(function(f) { return f.soort === 'limiet'; });
  assert.strictEqual(soorten.length, 3, JSON.stringify(soorten));
  assert.deepStrictEqual(V.controleer(scene(), CAT, { limieten: { maxBlokken: 3 } }).fouten, []);
  var hersteld = V.herstel(scene(), CAT, { limieten: { maxBlokken: 2 } });
  assert.ok(hersteld.aanpassingen.some(function(a) { return /maximaal 2/.test(a); }));
});

test('grenzen: de AI krijgt ze als regel mee', function() {
  var t = ontwerp.systeem(CAT, { kosmos: '1.18' }, require('../api/_lib/rig').standaardRig(), 'nl', '', { maxBlokken: 7, maxRijen: 1, maxScenes: 4 })[0].text;
  assert.ok(/maximaal 7 blokken/.test(t) && /één rij/.test(t) && /Maximaal 4 songdelen/.test(t), t.slice(0, 600));
  var zonder = ontwerp.systeem(CAT, { kosmos: '1.18' }, require('../api/_lib/rig').standaardRig(), 'nl')[0].text;
  assert.ok(!/blokken per preset/.test(zonder));
});

test('grenzen: export gebruikt de IR-map en waarschuwt bij overschrijding', function() {
  var cat = C.normaliseerCatalogus([{ sectie: 'CAB', blokken: [{ naam: 'IR Loader', uri: 'urn:x:ir', parameters: 'IR File [ir] (Mijn kast.wav/Fabriek)' }] }]);
  var s = scene({ chain_a: ['IR Loader'], blokken: [{ label: 'IR Loader', blok: 'IR Loader', instellingen: [{ parameter: 'IR File', waarde: 'Mijn kast.wav' }] }] });
  var r = A.maak(s, cat, { naam: 'ir', limieten: { irMap: '/mijn/irs' } });
  assert.strictEqual(r.preset.preset.chains['1'].blocks['1'].properties['1'].value, '/mijn/irs/Mijn kast.wav');
  assert.ok(!r.waarschuwingen.some(function(w) { return /bestandskeuze/.test(w); }));
  var teVeel = A.maak(scene(), CAT, { naam: 'x', limieten: { maxBlokken: 2 } });
  assert.ok(teVeel.waarschuwingen.some(function(w) { return /maximaal 2/.test(w); }) && !teVeel.volledig);
});

test('grenzen: opslaan via de API vereist beheer en komt terug bij het laden', async function() {
  h.resetRedis();
  process.env.ADMIN_WACHTWOORD = 'geheim';
  var auth = require('../api/_lib/auth');
  var cookie = 'dg_admin=' + encodeURIComponent(auth._teken('admin', Math.floor(Date.now() / 1000) + 600));
  var api = require('../api/blocks');
  var zonder = await h.roep(api, { method: 'POST', body: { limieten: { maxBlokken: 5 } } });
  assert.strictEqual(zonder.statusCode, 401);
  var met = await h.roep(api, { method: 'POST', body: { limieten: { maxBlokken: 5, irMap: '/x/y' } }, headers: { cookie: cookie } });
  assert.strictEqual(met.statusCode, 200, JSON.stringify(met.body));
  var g = await h.roep(api, { method: 'GET' });
  assert.deepStrictEqual(g.body.limieten, { maxBlokken: 5, maxRijen: null, maxScenes: null, irMap: '/x/y' });
});
