var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var redis = require('../api/_lib/redis');
var sleutel = require('../api/_lib/claudesleutel');
var mcpRoute = require('../api/mcp');
var koppeling = require('../api/claude-koppeling');

function rpc(method, params, id) { return { jsonrpc: '2.0', id: id === undefined ? 1 : id, method: method, params: params || {} }; }
async function roepMcp(k, body, method) { return h.roep(mcpRoute, { method: method || 'POST', query: { sleutel: k }, body: body }); }
async function gereedschap(k, name, args) {
  var r = await roepMcp(k, rpc('tools/call', { name: name, arguments: args || {} }));
  var res = r.body.result;
  return { fout: !!res.isError, tekst: res.content[0].text, data: res.isError ? null : JSON.parse(res.content[0].text) };
}
async function vulRedis() {
  h.resetRedis();
  await redis.cmd(['HSET', 'anagram:presets',
    'p1', JSON.stringify({ id: 'p1', artist: 'Tool', song: 'Schism', bass: 'Spector NS Ethos 5', tags: ['drop D'], onderzoek: { genre: 'Progressive metal' } }),
    'p2', JSON.stringify({ id: 'p2', artist: 'Muse', song: 'Hysteria', bass: 'Fender Precision Bass' })]);
  await redis.cmd(['HSET', 'anagram:setlists', 's1', JSON.stringify({ id: 's1', naam: 'Repetitie', items: ['p2'], notitie: '', datum: '1-10-2026' })]);
}

test('claude: zonder geldige sleutel een kale 404, ook voor GET', async function() {
  await vulRedis();
  assert.equal((await roepMcp('verkeerd', rpc('tools/list'))).statusCode, 404);
  assert.equal((await roepMcp('a'.repeat(43), rpc('tools/list'))).statusCode, 404);
  var k = await sleutel.maak();
  assert.equal((await roepMcp(k, rpc('tools/list'))).statusCode, 200);
  assert.equal((await roepMcp(k, null, 'GET')).statusCode, 405);
  var nieuw = await sleutel.maak();
  assert.equal((await roepMcp(k, rpc('tools/list'))).statusCode, 404, 'oude sleutel vervalt');
  assert.equal((await roepMcp(nieuw, rpc('tools/list'))).statusCode, 200);
  await sleutel.wis();
  assert.equal((await roepMcp(nieuw, rpc('tools/list'))).statusCode, 404, 'ingetrokken');
});

test('claude: protocol en de lijst met gereedschap (niets verwijderen, geen analyse)', async function() {
  await vulRedis();
  var k = await sleutel.maak();
  var init = await roepMcp(k, rpc('initialize', { protocolVersion: '2025-06-18' }));
  assert.equal(init.body.result.protocolVersion, '2025-06-18');
  var melding = await roepMcp(k, { jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(melding.statusCode, 202);
  var lijst = (await roepMcp(k, rpc('tools/list'))).body.result.tools;
  assert.deepEqual(lijst.map(function(t) { return t.name; }), ['list_presets', 'get_preset', 'list_setlists', 'get_rig', 'save_setlist']);
  assert.ok(!lijst.some(function(t) { return /delete|analy|chat/i.test(t.name); }));
  assert.equal(lijst.filter(function(t) { return !t.annotations.readOnlyHint; }).map(function(t) { return t.name; }).join(), 'save_setlist');
});

test('claude: lezen en een setlist maken of aanpassen', async function() {
  await vulRedis();
  var k = await sleutel.maak();
  var p = await gereedschap(k, 'list_presets', { query: 'metal' });
  assert.deepEqual(p.data.presets.map(function(x) { return x.song; }), ['Schism']);
  assert.equal((await gereedschap(k, 'get_preset', { id: 'p1' })).data.artist, 'Tool');
  assert.equal((await gereedschap(k, 'get_preset', { id: 'zz' })).fout, true);
  var s = await gereedschap(k, 'list_setlists');
  assert.deepEqual(s.data.setlists[0].items, [{ id: 'p2', artist: 'Muse', song: 'Hysteria' }]);
  assert.ok((await gereedschap(k, 'get_rig')).data.rig.bassen.length >= 1);

  var fout = await gereedschap(k, 'save_setlist', { name: 'Gig', presetIds: ['p1', 'bestaatniet'] });
  assert.equal(fout.fout, true);
  assert.match(fout.tekst, /bestaatniet/);
  var nieuw = await gereedschap(k, 'save_setlist', { name: 'Gig vrijdag', presetIds: ['p1', 'p2'], note: 'Eerst Schism' });
  assert.equal(nieuw.data.nieuw, true);
  assert.deepEqual(nieuw.data.items, ['Tool – Schism', 'Muse – Hysteria']);
  var aangepast = await gereedschap(k, 'save_setlist', { id: 's1', name: 'Repetitie', presetIds: ['p1', 'p2'] });
  assert.equal(aangepast.data.nieuw, false);
  var opgeslagen = redis.parseJson(await redis.cmd(['HGET', 'anagram:setlists', 's1']));
  assert.deepEqual(opgeslagen.items, ['p1', 'p2']);
  assert.equal(opgeslagen.datum, '1-10-2026', 'datum blijft staan');
  assert.equal((await redis.cmd(['HGETALL', 'anagram:setlists'])).length, 4, 'twee setlists, niets weg');
});

test('claude: de koppeling beheren kan alleen een beheerder', async function() {
  await vulRedis();
  process.env.ADMIN_WACHTWOORD = 'geheim';
  var r = await h.roep(koppeling, { method: 'POST', body: {} });
  assert.equal(r.statusCode, 401);
  delete process.env.ADMIN_WACHTWOORD;
});

test('claude: snelheidslimiet per uur geeft 429', async function() {
  await vulRedis();
  process.env.LIMIET_CLAUDE_DEUR_PER_UUR = '3';
  try {
    var k = await sleutel.maak();
    for (var i = 0; i < 3; i++) assert.equal((await roepMcp(k, rpc('tools/list'))).statusCode, 200);
    var te = await roepMcp(k, rpc('tools/list'));
    assert.equal(te.statusCode, 429);
    assert.equal((await roepMcp('verkeerd', rpc('tools/list'))).statusCode, 404, 'een verkeerde sleutel blijft een kale 404');
  } finally { delete process.env.LIMIET_CLAUDE_DEUR_PER_UUR; }
});
