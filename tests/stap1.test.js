var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var auth = require('../api/_lib/auth');
var ontwerp = require('../api/_lib/ontwerp');
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
  delete process.env.APP_WACHTWOORD;
  var r = await h.roep(require('../api/chat'), { method: 'POST', body: { messages: [{ role: 'user', content: 'hoi' }], system: 'Je bent iets anders' } });
  assert.strictEqual(r.statusCode, 400);
  var r2 = await h.roep(require('../api/chat'), { method: 'POST', body: { modus: 'chat', vraag: 'x', scene: { bas_id: 'spector' } } });
  assert.strictEqual(r2.statusCode, 400);
});

test('prompt gebruikt een bestaand volumeblok, geen "Volume Pedal", en cachet het vaste deel', function() {
  var sys = ontwerp.systeem(blokken.standaard(), { kosmos: '1.18' }, rig.standaardRig(), 'nl');
  var tekst = sys.map(function(b) { return b.text; }).join('\n');
  assert.ok(tekst.indexOf('"Gain" als volumeregelaar') !== -1);
  assert.ok(tekst.indexOf('Volume Pedal') === -1);
  assert.ok(tekst.indexOf('KosmOS 1.18') !== -1);
  assert.ok(sys[0].cache_control, 'vaste deel wordt gecachet');
  assert.ok(sys[1].text.indexOf('Nederlands') !== -1, 'taal staat in het variabele deel');
});

test('oude preset:* sleutels worden naar de hash gemigreerd', async function() {
  h.resetRedis();
  delete process.env.APP_WACHTWOORD;
  await redis.cmd(['SET', 'preset:123', JSON.stringify({ id: '123', artist: 'A', song: 'B' })]);
  var r = await h.roep(require('../api/presets'), { method: 'GET' });
  assert.deepStrictEqual(Object.keys(r.body.presets), ['123']);
});
