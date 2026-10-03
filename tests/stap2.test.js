var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var C = require('../shared/catalogus');
var claude = require('../api/_lib/claude');
var fake = require('../scripts/fake-claude');
var blokken = require('../api/_lib/blokken');

test('parser: bereiken, eenheden, keuzes en schakelaars', function() {
  var p = C.parseParameterTekst('Drive (0-100%), Tone (3kHz-8kHz), Grunt (Off/Fat/Raw), Mid Boost (On/Off), Bass (-15 tot +15 dB), Ratio (1:1-20:1 of Limiter), Slope (6/12/18/24 dB/oct), Mid Freq (40Hz-1kHz), Pan (L-R)');
  var per = {}; p.forEach(function(x) { per[x.naam] = x; });
  assert.deepStrictEqual([per.Drive.type, per.Drive.min, per.Drive.max, per.Drive.eenheid], ['knop', 0, 100, '%']);
  assert.deepStrictEqual([per.Tone.min, per.Tone.max, per.Tone.eenheid], [3, 8, 'kHz']);
  assert.deepStrictEqual(per.Grunt.opties, ['Off', 'Fat', 'Raw']);
  assert.strictEqual(per['Mid Boost'].type, 'schakelaar');
  assert.deepStrictEqual([per.Bass.min, per.Bass.max], [-15, 15]);
  assert.deepStrictEqual([per.Ratio.eenheid, per.Ratio.opties], [':1', ['Limiter']]);
  assert.deepStrictEqual(per.Slope.opties, ['6 dB/oct', '12 dB/oct', '18 dB/oct', '24 dB/oct']);
  assert.deepStrictEqual([per['Mid Freq'].min, per['Mid Freq'].max, per['Mid Freq'].eenheid], [40, 1000, 'Hz']);
  assert.strictEqual(per.Pan.type, 'tekst');
});

test('parser: alle standaardblokken overleven heen-en-terug', function() {
  blokken.standaard().forEach(function(s) {
    s.blokken.forEach(function(b) {
      var terug = C.parseParameterTekst(C.formatParameters(b.parameters));
      assert.deepStrictEqual(terug, b.parameters, b.naam);
    });
  });
});

test('waarde-controle: eenheden omrekenen en bereik bewaken', function() {
  var tone = C.parseParameterTekst('Tone (3kHz-8kHz)')[0];
  assert.ok(C.controleerWaarde(tone, '5000 Hz').ok);
  assert.strictEqual(C.controleerWaarde(tone, '5 kHz').pct, 0.4);
  var buiten = C.controleerWaarde(tone, '12 kHz');
  assert.ok(!buiten.ok); assert.strictEqual(buiten.begrensd, 8);
  var grunt = C.parseParameterTekst('Grunt (Off/Fat/Raw)')[0];
  assert.ok(C.controleerWaarde(grunt, 'fat').ok);
  assert.ok(!C.controleerWaarde(grunt, 'Medium').ok);
  var ratio = C.parseParameterTekst('Ratio (1:1-20:1 of Limiter)')[0];
  assert.ok(C.controleerWaarde(ratio, '4:1').ok);
  assert.ok(C.controleerWaarde(ratio, 'Limiter').ok);
  assert.ok(C.controleerWaarde(C.parseParameterTekst('Bright (On/Off)')[0], 'aan').ok);
});

test('vergelijk en toepassen', function() {
  var huidig = C.normaliseerCatalogus([{ sectie: 'DRIVE', blokken: [{ naam: 'Microtubes B3K', parameters: 'Drive (0-100%), Level (0-100%)' }, { naam: 'Oud blok', parameters: 'X (0-1)' }] }]);
  var bron = C.normaliseerCatalogus([
    { sectie: 'DRIVE', blokken: [{ naam: 'Microtubes B3K', parameters: 'Drive (0-100%), Level (+/-12 dB), Grunt (Off/Fat/Raw)', status: 'geverifieerd' }] },
    { sectie: 'AMP', blokken: [{ naam: 'Peggy Fliptop', parameters: 'Volume (0-10)', status: 'geverifieerd' }] }]);
  var v = C.vergelijk(huidig, bron, { volledig: true });
  var soorten = v.map(function(x) { return x.soort; }).sort();
  assert.deepStrictEqual(soorten, ['gewijzigd', 'nieuw', 'ontbreekt']);
  var gew = v.find(function(x) { return x.soort === 'gewijzigd'; });
  assert.deepStrictEqual(gew.verschillen.map(function(x) { return x.soort + ':' + x.parameter; }).sort(), ['gewijzigd:Level', 'nieuw:Grunt']);
  var na = C.pasToe(huidig, v.map(function(x) { return { voorstel: x, besluit: x.soort === 'ontbreekt' ? 'verwijderen' : 'overnemen' }; }));
  assert.deepStrictEqual(na.map(function(s) { return s.sectie; }), ['DRIVE', 'AMP']);
  assert.strictEqual(C.vindBlok(na, 'microtubes b3k').status, 'geverifieerd');
  assert.ok(!C.vindBlok(na, 'Oud blok'));
});

test('sync: inventaris → secties → vergelijk → toepassen (nep-Claude)', async function() {
  h.resetRedis();
  process.env.ADMIN_WACHTWOORD = 'geheim';
  claude._zetClient(fake);
  var auth = require('../api/_lib/auth');
  var cookie = 'dg_admin=' + encodeURIComponent(auth._teken('admin', Math.floor(Date.now() / 1000) + 600));
  var handler = require('../api/blocks-sync');
  var echteFetch = global.fetch;
  global.fetch = async function() { return { ok: true, status: 200, arrayBuffer: async function() { return Buffer.from('%PDF-1.7 test'); }, headers: { get: function() { return 'x'; } } }; };
  try {
    var post = function(body) { return h.roep(handler, { method: 'POST', body: body, headers: { cookie: cookie } }); };
    var inv = await post({ actie: 'inventaris', url: 'https://example.com/m.pdf' });
    assert.strictEqual(inv.statusCode, 200, JSON.stringify(inv.body));
    assert.strictEqual(inv.body.batches.length, 2);
    for (var b of inv.body.batches) {
      var r = await post({ actie: 'sectie', batch: b.id });
      assert.strictEqual(r.statusCode, 200, JSON.stringify(r.body));
    }
    var verg = await post({ actie: 'vergelijk' });
    assert.ok(verg.body.volledig);
    var keys = verg.body.voorstellen.map(function(v) { return v.soort + ':' + v.blok.naam; });
    assert.ok(keys.indexOf('nieuw:Peggy Fliptop') !== -1, keys.join());
    assert.ok(keys.indexOf('gewijzigd:Microtubes B3K') !== -1, keys.join());
    var rn = await post({ actie: 'releasenotes' });
    assert.strictEqual(rn.statusCode, 200, JSON.stringify(rn.body));
    assert.ok(rn.body.status.nieuwereKosmos);
    var nieuw = rn.body.voorstellen.filter(function(v) { return v.soort === 'nieuw'; }).map(function(v) { return { key: v.key, besluit: 'overnemen' }; });
    var toe = await post({ actie: 'toepassen', besluiten: nieuw });
    assert.ok(C.vindBlok(toe.body.blocks, 'Neural Amp'));
    assert.strictEqual(C.vindBlok(toe.body.blocks, 'Peggy Fliptop').status, 'geverifieerd');
    var meta = await blokken.laadMeta();
    assert.strictEqual(meta.kosmos, '1.18');
  } finally {
    global.fetch = echteFetch;
  }
});

test('cron zonder geheim wordt geweigerd', async function() {
  delete process.env.CRON_SECRET;
  var r = await h.roep(require('../api/blocks-sync'), { method: 'GET', query: { cron: '1' } });
  assert.strictEqual(r.statusCode, 401);
});
