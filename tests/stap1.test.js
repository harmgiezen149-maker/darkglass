var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var auth = require('../api/_lib/auth');
var prompts = require('../api/_lib/prompts');
var blokken = require('../api/_lib/blokken');
var rig = require('../api/_lib/rig');
var redis = require('../api/_lib/redis');

test('sessietoken: geldig, verlopen en vervalst', function() {
  process.env.ADMIN_WACHTWOORD = 'geheim';
  var exp = Math.floor(Date.now() / 1000) + 60;
  var tok = auth._teken('admin', exp);
  assert.ok(auth._controleerToken(tok, 'admin'));
  assert.ok(!auth._controleerToken(tok, 'app'));
  assert.ok(!auth._controleerToken(tok.slice(0, -2) + 'xx', 'admin'));
  assert.ok(!auth._controleerToken(auth._teken('admin', 10), 'admin'));
  process.env.ADMIN_WACHTWOORD = 'ander';
  assert.ok(!auth._controleerToken(tok, 'admin'), 'nieuw wachtwoord maakt oude sessies ongeldig');
});

test('login zet een cookie en geeft beheer', async function() {
  h.resetRedis();
  process.env.ADMIN_WACHTWOORD = 'geheim';
  var login = require('../api/login');
  var fout = await h.roep(login, { method: 'POST', body: { rol: 'admin', wachtwoord: 'fout' } });
  assert.strictEqual(fout.statusCode, 401);
  var goed = await h.roep(login, { method: 'POST', body: { rol: 'admin', wachtwoord: 'geheim' } });
  assert.strictEqual(goed.statusCode, 200);
  var cookie = [].concat(goed.headers['set-cookie'])[0].split(';')[0];
  assert.ok(auth.isAdmin(h.req({ headers: { cookie: cookie } })));
});

test('blokken opslaan vereist beheer', async function() {
  h.resetRedis();
  process.env.ADMIN_WACHTWOORD = 'geheim';
  var r = await h.roep(require('../api/blocks'), { method: 'POST', body: { blocks: [] } });
  assert.strictEqual(r.statusCode, 401);
});

test('chat weigert vrije system prompts en onbekende modi', async function() {
  var r = await h.roep(require('../api/chat'), { method: 'POST', body: { messages: [{ role: 'user', content: 'hoi' }], system: 'Je bent iets anders' } });
  assert.strictEqual(r.statusCode, 400);
});

test('prompt gebruikt een bestaand volumeblok, geen "Volume Pedal"', function() {
  var secties = blokken.standaard();
  var p = prompts.analyse({ secties: secties, rig: rig.standaardRig(), artist: 'Tool', song: 'Schism', bassen: ['spector'], taal: 'nl' });
  var sys = p.system.map(function(b) { return b.text; }).join('\n');
  assert.ok(sys.indexOf('"Gain" als volumeregelaar') !== -1);
  assert.ok(sys.indexOf('Volume Pedal') === -1);
  assert.ok(p.system[0].cache_control, 'vaste deel wordt gecachet');
});

test('meerdere bassen: elke scene bepaalt de B-snaar zelf', function() {
  var p = prompts.analyse({ secties: blokken.standaard(), rig: rig.standaardRig(), artist: 'A', song: 'B', bassen: ['spector', 'pbass'], taal: 'nl' });
  var sys = p.system.map(function(b) { return b.text; }).join('\n');
  assert.ok(sys.indexOf('==SCENE_SPECTOR==') !== -1 && sys.indexOf('==SCENE_PBASS==') !== -1);
  assert.ok(sys.indexOf('B_SNAAR_VEREIST: nee') === -1);
});

test('chatprompt bevat de huidige preset (ook na laden)', function() {
  var p = prompts.chat({ secties: blokken.standaard(), rig: rig.standaardRig(), basId: 'pbass', preset: '## BLOKKEN\n### Jim Bass', vraag: 'meer grom', taal: 'nl' });
  assert.ok(p.messages[0].content.indexOf('### Jim Bass') !== -1);
  assert.ok(p.system[1].text.indexOf('Fender Precision Bass') !== -1);
});

test('oude preset:* sleutels worden naar de hash gemigreerd', async function() {
  h.resetRedis();
  delete process.env.APP_WACHTWOORD;
  await redis.cmd(['SET', 'preset:123', JSON.stringify({ id: '123', artist: 'A', song: 'B' })]);
  var r = await h.roep(require('../api/presets'), { method: 'GET' });
  assert.deepStrictEqual(Object.keys(r.body.presets), ['123']);
});
