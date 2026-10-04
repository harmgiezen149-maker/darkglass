var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var Modellen = require('../shared/modellen');
var claude = require('../api/_lib/claude');
var fake = require('../scripts/fake-claude');

test('Sonnet 5.5 · High is de standaard en staat bovenaan', function() {
  assert.deepStrictEqual(Modellen.STANDAARD, { model: 'claude-sonnet-5-5', effort: 'high' });
  assert.strictEqual(Modellen.opties()[0].waarde, 'claude-sonnet-5-5|high');
  assert.deepStrictEqual(claude.keuze(), { model: 'claude-sonnet-5-5', effort: 'high' });
});

test('alleen toegestane modellen en efforts; anders de standaard', function() {
  assert.deepStrictEqual(Modellen.kies('claude-sonnet-5-5', 'medium'), { model: 'claude-sonnet-5-5', effort: 'medium' });
  assert.deepStrictEqual(Modellen.kies('gpt-9', 'max'), Modellen.STANDAARD);
  assert.deepStrictEqual(claude.keuze('claude-opus-5-5', 'xhigh'), { model: 'claude-opus-5-5', effort: 'high' });
  assert.strictEqual(Modellen.opties().length, 4);
  assert.strictEqual(Modellen.label({ model: 'claude-sonnet-5-5', effort: 'high' }), 'Sonnet 5.5 · High');
});

test('kosten per model: Sonnet is half zo duur als Opus', function() {
  var usage = { input_tokens: 1e6, output_tokens: 1e6, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  assert.strictEqual(claude.kostenVan(usage, 'claude-opus-5-5').dollar, 24);
  assert.strictEqual(claude.kostenVan(usage, 'claude-sonnet-5-5').dollar, 12);
});

test('analyse met Sonnet 5.5 medium gebruikt dat model in elke stap', async function() {
  h.resetRedis();
  delete process.env.APP_WACHTWOORD;
  claude._zetClient(fake);
  fake.gezien.length = 0;
  var echteFetch = global.fetch;
  global.fetch = async function() { return { ok: false, json: async function() { return null; } }; };
  try {
    var r = await h.roep(require('../api/analyse'), { method: 'POST', body: { artist: 'Muse', song: 'Hysteria', bassen: ['spector'], model: 'claude-sonnet-5-5', effort: 'medium' } });
    var res = r.geschreven.split('\n\n').map(function(x) { return x.slice(6); }).filter(function(x) { return x && x !== '[DONE]'; }).map(JSON.parse).find(function(e) { return e.resultaat; }).resultaat;
    assert.deepStrictEqual(res.ai, { model: 'claude-sonnet-5-5', effort: 'medium' });
    assert.ok(fake.gezien.length >= 2);
    assert.ok(fake.gezien.every(function(g) { return g.model === 'claude-sonnet-5-5'; }), JSON.stringify(fake.gezien));
    assert.strictEqual(fake.gezien[0].effort, 'medium', 'onderzoek');
    assert.strictEqual(fake.gezien[1].effort, 'medium', 'ontwerp');
    fake.gezien.length = 0;
    await h.roep(require('../api/analyse'), { method: 'POST', body: { artist: 'Muse', song: 'Hysteria', bassen: ['spector'], model: 'onbekend', effort: 'max' } });
    assert.ok(fake.gezien.every(function(g) { return g.model === 'claude-sonnet-5-5'; }), 'onbekend model valt terug op de standaard (Sonnet 5.5)');
  } finally {
    global.fetch = echteFetch;
  }
});
