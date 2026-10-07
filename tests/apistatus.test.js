var test = require('node:test');
var assert = require('node:assert');
var h = require('./helpers');
var claude = require('../api/_lib/claude');
var fouten = require('../api/_lib/fouten');
var status = require('../api/status');

// Opbouw zoals de statuspagina van Anthropic (summary.json) die levert.
function summary(over) {
  return Object.assign({
    components: [
      { name: 'claude.ai', status: 'operational' },
      { name: 'Claude Console (platform.claude.com)', status: 'operational' },
      { name: 'Claude API (api.anthropic.com)', status: 'operational' },
      { name: 'Claude Code', status: 'operational' }
    ],
    incidents: []
  }, over || {});
}

function apiFout(statusCode, type, bericht) {
  return claude.Anthropic.APIError.generate(statusCode, { type: 'error', error: { type: type, message: bericht }, request_id: 'req_test123' }, undefined, new Headers({ 'request-id': 'req_test123' }));
}

test('status: storing bij de Console is geen API-storing ("elders")', function() {
  var s = summary({ incidents: [{ name: 'Elevated errors on platform.claude.com', status: 'investigating', impact: 'minor',
    components: [{ name: 'Claude Console (platform.claude.com)' }], incident_updates: [{ body: 'We are investigating.', updated_at: '2026-10-07T17:00:00Z' }] }] });
  s.components[1].status = 'partial_outage';
  var r = status.beoordeel(s);
  assert.strictEqual(r.niveau, 'elders');
  assert.strictEqual(r.api.status, 'operational');
  assert.strictEqual(r.incidenten[0].raaktApi, false);
  assert.strictEqual(r.incidenten[0].update, 'We are investigating.');
});

test('status: storing of melding bij de API zelf', function() {
  var s = summary();
  s.components[2].status = 'partial_outage';
  assert.strictEqual(status.beoordeel(s).niveau, 'storing');
  s.components[2].status = 'degraded_performance';
  assert.strictEqual(status.beoordeel(s).niveau, 'melding');
  var inc = summary({ incidents: [{ name: 'Elevated errors on Claude API', status: 'identified', impact: 'minor', incident_updates: [] }] });
  assert.strictEqual(status.beoordeel(inc).niveau, 'melding', 'incident zonder onderdelen, maar met API in de naam');
  inc.incidents[0].impact = 'major';
  assert.strictEqual(status.beoordeel(inc).niveau, 'storing');
  assert.strictEqual(status.beoordeel(summary()).niveau, 'ok');
});

test('fouten: API-fouten krijgen status, type, request-id en uitleg', function() {
  var d = fouten.beschrijf(apiFout(529, 'overloaded_error', 'Overloaded'));
  assert.deepStrictEqual([d.status, d.type, d.bericht, d.requestId], [529, 'overloaded_error', 'Overloaded', 'req_test123']);
  assert.ok(/overbelast/.test(d.uitleg));
  assert.ok(/tegoed/.test(fouten.beschrijf(apiFout(400, 'invalid_request_error', 'Your credit balance is too low to access the Anthropic API.')).uitleg));
  assert.ok(/limiet/.test(fouten.beschrijf(apiFout(429, 'rate_limit_error', 'You have reached your API usage limits')).uitleg));
  assert.ok(/sleutel/.test(fouten.beschrijf(apiFout(401, 'authentication_error', 'invalid x-api-key')).uitleg));
  var kort = fouten.korteMelding(apiFout(500, 'api_error', 'Internal server error'));
  assert.ok(/^Claude API-fout 500 \(api_error\): Internal server error — Interne fout bij Anthropic/.test(kort), kort);
  var app = fouten.beschrijf(new Error('Ongeldige JSON van Claude'));
  assert.deepStrictEqual([app.status, app.type, app.uitleg], [null, 'app', '']);
  assert.strictEqual(fouten.korteMelding(new Error('Ongeldige JSON van Claude')), 'Ongeldige JSON van Claude');
});

test('analyse: een API-fout komt met details bij de app en in het statusvenster', async function() {
  h.resetRedis();
  delete process.env.APP_WACHTWOORD;
  var echtFetch = global.fetch;
  var fout = apiFout(529, 'overloaded_error', 'Overloaded');
  var kapot = { beta: { messages: { stream: function() { throw fout; } } }, messages: { create: function() { throw fout; } } };
  claude._zetClient(kapot);
  global.fetch = async function(url) {
    if (/status\.anthropic\.com/.test(String(url))) return { ok: true, json: async function() { return summary(); } };
    return { ok: false, json: async function() { return null; } };
  };
  try {
    var r = await h.roep(require('../api/analyse'), { method: 'POST', body: { artist: 'Muse', song: 'Hysteria', bassen: ['spector'] } });
    var events = r.geschreven.split('\n\n').map(function(x) { return x.slice(6); }).filter(function(x) { return x && x !== '[DONE]'; }).map(JSON.parse);
    var ev = events.find(function(e) { return e.fout; });
    assert.ok(/^Claude API-fout 529 \(overloaded_error\)/.test(ev.fout), ev.fout);
    assert.deepStrictEqual([ev.foutDetail.status, ev.foutDetail.requestId, ev.foutDetail.waar], [529, 'req_test123', 'analyse']);

    var st = await h.roep(status, { method: 'GET' });
    assert.strictEqual(st.body.niveau, 'ok');
    assert.strictEqual(st.body.fouten.length, 1, 'eigen fout zichtbaar in het statusvenster');
    assert.strictEqual(st.body.fouten[0].type, 'overloaded_error');
    assert.strictEqual(st.headers['cache-control'], 'no-store', 'foutmeldingen worden niet gecachet');

    process.env.APP_WACHTWOORD = 'geheim';
    var zonder = await h.roep(status, { method: 'GET' });
    assert.deepStrictEqual(zonder.body.fouten, [], 'zonder toegang tot de app geen foutmeldingen');
  } finally {
    delete process.env.APP_WACHTWOORD;
    global.fetch = echtFetch;
    claude._zetClient(require('../scripts/fake-claude'));
  }
});

test('status: statuspagina onbereikbaar geeft "onbekend" met reden', async function() {
  var echtFetch = global.fetch;
  global.fetch = async function() { throw new Error('netwerk weg'); };
  try {
    var st = await h.roep(status, { method: 'GET' });
    assert.strictEqual(st.body.niveau, 'onbekend');
    assert.ok(/netwerk weg/.test(st.body.statusFout));
  } finally {
    global.fetch = echtFetch;
  }
});
