var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var redis = require('../api/_lib/redis');
var leren = require('../api/_lib/leren');
var rig = require('../api/_lib/rig');
var V = require('../shared/validatie');
var blokken = require('../api/_lib/blokken');

function preset(id, extra) {
  return Object.assign({
    id: id, artist: 'Tool', song: 'Schism', onderzoek: { genre: 'Progressive metal' },
    scenes: [{ bas_id: 'spector', blokken: [{ blok: 'Microtubes B3K', instellingen: [{ parameter: 'Drive', waarde: '40%' }] }] }]
  }, extra || {});
}

test('leren: lessen uit terugkerende feedback en voorbeelden uit hetzelfde genre', async function() {
  h.resetRedis();
  await redis.cmd(['HSET', 'anagram:presets',
    '1', JSON.stringify(preset('1', { feedback: { score: 1, tags: ['te schel'] } })),
    '2', JSON.stringify(preset('2', { artist: 'Karnivool', song: 'Themata', feedback: { score: -1, tags: ['te schel', 'te veel gain'] } })),
    '3', JSON.stringify(preset('3', { artist: 'Dua Lipa', song: 'Levitating', onderzoek: { genre: 'Pop' }, feedback: { score: 1, tags: [] } }))]);
  var t = await leren.voorbeeldenVoorPrompt({ artiest: 'Opeth', genre: 'progressive metal' });
  assert.ok(/"te schel" \(2x\)/.test(t), t);
  assert.ok(t.indexOf('Tool – Schism') !== -1, 'zelfde genre als voorbeeld');
  assert.ok(t.indexOf('Levitating') === -1, 'ander genre niet');
  assert.ok(t.indexOf('Themata') === -1, 'slecht beoordeelde preset niet als voorbeeld');
  var alleen = await leren.voorbeeldenVoorPrompt({ alleenLessen: true });
  assert.ok(alleen.indexOf('Schism') === -1 && /te schel/.test(alleen));
});

test('validatie: songdelen moeten naar bestaande blokken en geldige waarden verwijzen', function() {
  var cat = blokken.standaard();
  var s = {
    bas_id: 'spector', routing: 'serieel', chain_a: ['Gain'], chain_b: [], merge_naar: [],
    blokken: [{ label: 'Gain', blok: 'Gain', instellingen: [{ parameter: 'Level', waarde: '100%' }] }],
    songdelen: [{ deel: 'Refrein', wijzigingen: [{ label: 'Gain', actie: 'wijzig', parameter: 'Level', waarde: '300%' }, { label: 'Spook', actie: 'aan', parameter: '', waarde: '' }] }]
  };
  assert.strictEqual(V.controleer(s, cat).fouten.filter(function(f) { return f.soort === 'songdeel'; }).length, 2);
  var hersteld = V.herstel(s, cat).scene;
  assert.strictEqual(hersteld.songdelen[0].wijzigingen.length, 0);
});

test('rig: normaliseren beperkt velden en id\'s', function() {
  var r = rig.normaliseer({ bassen: [{ id: 'Mijn Bas!<script>', naam: 'X', snaren: '6' }], uitgang: 'FRFR' });
  assert.strictEqual(r.bassen[0].id, 'MijnBasscript');
  assert.strictEqual(r.bassen[0].snaren, 6);
  assert.strictEqual(rig.normaliseer(null).bassen.length, 2);
});

test('setlists: opslaan en ophalen, verwijderen vereist beheer', async function() {
  h.resetRedis();
  delete process.env.APP_WACHTWOORD;
  process.env.ADMIN_WACHTWOORD = 'geheim';
  var api = require('../api/setlists');
  var r = await h.roep(api, { method: 'POST', body: { setlist: { id: 's1', naam: 'Repetitie', items: ['1', '2', '../x'] } } });
  assert.deepStrictEqual(r.body.setlist.items, ['1', '2']);
  var g = await h.roep(api, { method: 'GET' });
  assert.strictEqual(g.body.setlists.s1.naam, 'Repetitie');
  var d = await h.roep(api, { method: 'DELETE', body: { id: 's1' } });
  assert.strictEqual(d.statusCode, 401);
});
