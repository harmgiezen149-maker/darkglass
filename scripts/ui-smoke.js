#!/usr/bin/env node
// UI-rooktest met Playwright tegen de lokale dev-server (nep-Claude, geheugen-Redis).
//   NODE_PATH=$(npm root -g) node scripts/ui-smoke.js
// Faalt met exit code 1 bij een JS-fout in de pagina of een mislukte stap.

process.env.ADMIN_WACHTWOORD = process.env.ADMIN_WACHTWOORD || 'beheer-test';
process.env.DG_FAKE_CLAUDE = '1';
// De statuspagina van Anthropic wordt nagebootst: storing bij de Console, API in orde.
var echteFetch = global.fetch;
global.fetch = function(url) {
  if (/status\.anthropic\.com/.test(String((url && url.url) || url))) {
    return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve({
      components: [
        { name: 'claude.ai', status: 'operational' },
        { name: 'Claude Console (platform.claude.com)', status: 'partial_outage' },
        { name: 'Claude API (api.anthropic.com)', status: 'operational' }
      ],
      incidents: [{ name: 'Elevated errors on platform.claude.com', status: 'investigating', impact: 'minor',
        components: [{ name: 'Claude Console (platform.claude.com)' }],
        incident_updates: [{ body: 'We are currently investigating this issue.', updated_at: new Date().toISOString() }] }]
    }); } });
  }
  return echteFetch.apply(this, arguments);
};

var server = require('./dev-server');
var { chromium } = require('playwright');

var POORT = server.address() ? server.address().port : 3000;
var BASIS = 'http://localhost:' + POORT;
var stappen = [];

function stap(naam, ok, detail) {
  stappen.push({ naam: naam, ok: !!ok, detail: detail });
  console.log((ok ? '✓ ' : '✗ ') + naam + (detail && !ok ? ' — ' + detail : ''));
}

async function main() {
  await new Promise(function(r) { if (server.listening) r(); else server.on('listening', r); });
  BASIS = 'http://localhost:' + server.address().port;
  var browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  var page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  var fouten = [];
  page.on('pageerror', function(e) { fouten.push(e.message); });
  page.on('dialog', function(d) { d.accept(d.type() === 'prompt' ? 'test' : undefined); });

  var scenarios = require('./ui-scenarios');
  for (var s of scenarios) {
    try { await s(page, BASIS, stap); }
    catch (e) { stap('scenario ' + (s.name || '?'), false, e.message); }
  }

  stap('geen JS-fouten in de pagina', fouten.length === 0, fouten.join(' | '));
  await browser.close();
  server.close();
  var mislukt = stappen.filter(function(x) { return !x.ok; });
  console.log('\n' + (stappen.length - mislukt.length) + '/' + stappen.length + ' stappen geslaagd');
  process.exit(mislukt.length ? 1 : 0);
}

main().catch(function(e) { console.error(e); process.exit(1); });
