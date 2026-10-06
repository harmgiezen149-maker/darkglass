var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var claude = require('../api/_lib/claude');
var fake = require('../scripts/fake-claude');
var onderzoek = require('../api/_lib/onderzoek');
var tijden = require('../api/_lib/tijden');

function zonderMusicbrainz(fn) {
  var echt = global.fetch;
  global.fetch = async function() { return { ok: false, json: async function() { return null; } }; };
  return Promise.resolve().then(fn).finally(function() { global.fetch = echt; });
}

test('onderzoek laag: effort medium, minder zoekopdrachten en ingekorte pagina\'s', function() {
  return zonderMusicbrainz(async function() {
    h.resetRedis();
    claude._zetClient(fake);
    fake.gezien.length = 0;
    var r = await onderzoek.onderzoek('Tool', 'Schism', { diepte: 'laag', model: 'claude-sonnet-5-5', effort: 'high' });
    assert.strictEqual(r.profiel.diepte, 'laag');
    var g = fake.gezien[0];
    assert.strictEqual(g.effort, 'medium', 'laag gebruikt altijd medium');
    assert.deepStrictEqual(g.tools.slice(0, 2), ['web_search:4', 'web_fetch:2:8000']);
    assert.strictEqual(g.display, 'summarized', 'samengevatte gedachten voor de voortgang');
  });
});

test('onderzoek hoog: effort van de modelkeuze en het volledige onderzoek', function() {
  return zonderMusicbrainz(async function() {
    h.resetRedis();
    claude._zetClient(fake);
    fake.gezien.length = 0;
    var r = await onderzoek.onderzoek('Tool', 'Schism', { diepte: 'hoog', model: 'claude-sonnet-5-5', effort: 'high' });
    assert.strictEqual(r.profiel.diepte, 'hoog');
    assert.strictEqual(fake.gezien[0].effort, 'high');
    assert.deepStrictEqual(fake.gezien[0].tools.slice(0, 2), ['web_search:6', 'web_fetch:4']);
  });
});

test('onderzoek-cache: een snel onderzoek telt niet als je om een grondig vraagt', function() {
  return zonderMusicbrainz(async function() {
    h.resetRedis();
    claude._zetClient(fake);
    await onderzoek.onderzoek('Tool', 'Schism', { diepte: 'laag' });
    fake.gezien.length = 0;
    var weer = await onderzoek.onderzoek('Tool', 'Schism', { diepte: 'laag' });
    assert.ok(weer.profiel.uitCache && fake.gezien.length === 0, 'laag na laag uit de cache');
    var grondig = await onderzoek.onderzoek('Tool', 'Schism', { diepte: 'hoog' });
    assert.ok(!grondig.profiel.uitCache && fake.gezien.length === 1, 'hoog na laag onderzoekt opnieuw');
    fake.gezien.length = 0;
    var daarna = await onderzoek.onderzoek('Tool', 'Schism', { diepte: 'laag' });
    assert.ok(daarna.profiel.uitCache && daarna.profiel.diepte === 'hoog', 'laag mag een grondig resultaat hergebruiken');
  });
});

test('voortgang: samengevatte gedachten worden als hele zinnen gemeld, niet te vaak', function() {
  var meldingen = [];
  var volg = claude.gedachtenVolger(function(z) { meldingen.push(z); }, { interval: 0 });
  volg({ type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Ik zoek eerst de versterker op. Daar' } });
  volg({ type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'na kies ik de drive. Kort.' } });
  volg({ type: 'content_block_stop' });
  assert.deepStrictEqual(meldingen, ['Ik zoek eerst de versterker op.', 'Daarna kies ik de drive.'], 'te korte zinnen worden overgeslagen');
  var traag = [];
  var volg2 = claude.gedachtenVolger(function(z) { traag.push(z); }, { interval: 60000 });
  volg2({ type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Eerste lange zin over de sound. Tweede lange zin over de sound. ' } });
  assert.strictEqual(traag.length, 1, 'hooguit één melding per interval');
});

test('analyse: diepte en tijden komen terug en worden bewaard voor de stats', function() {
  return zonderMusicbrainz(async function() {
    h.resetRedis();
    delete process.env.APP_WACHTWOORD;
    process.env.ADMIN_WACHTWOORD = 'geheim';
    claude._zetClient(fake);
    var r = await h.roep(require('../api/analyse'), { method: 'POST', body: { artist: 'Muse', song: 'Hysteria', bassen: ['spector'], diepte: 'hoog' } });
    var events = r.geschreven.split('\n\n').map(function(x) { return x.slice(6); }).filter(function(x) { return x && x !== '[DONE]'; }).map(JSON.parse);
    var res = events.find(function(e) { return e.resultaat; }).resultaat;
    assert.strictEqual(res.diepte, 'hoog');
    assert.ok(res.tijden.totaal >= 0 && 'onderzoek' in res.tijden);
    assert.ok(events.some(function(e) { return /^💭 /.test(e.tekst || ''); }), 'gedachten verschijnen in de voortgang');
    var lijst = await tijden.laad();
    assert.strictEqual(lijst.length, 1);
    assert.strictEqual(lijst[0].diepte, 'hoog');
    var auth = require('../api/_lib/auth');
    var cookie = 'dg_admin=' + encodeURIComponent(auth._teken('admin', Math.floor(Date.now() / 1000) + 600));
    var s = await h.roep(require('../api/stats'), { method: 'GET', headers: { cookie: cookie } });
    assert.strictEqual(s.body.tijden.length, 1);
  });
});
