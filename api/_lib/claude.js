// Gedeelde Claude-client, modelkeuze en kostenregistratie.
var Anthropic = require('@anthropic-ai/sdk');
var redis = require('./redis');

var MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';

// Prijzen in dollars per miljoen tokens (Claude Opus 5.5). Cache-schrijven is
// 1,25x de inputprijs. Web search wordt per zoekopdracht afgerekend.
var PRIJS = {
  input: 4.00,
  output: 20.00,
  cacheSchrijven: 5.00,
  cacheLezen: 0.20,
  webSearchPer1000: 10.00
};

var _client = null;
function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY ontbreekt');
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  }
  return _client;
}

// Voor tests: vervang de client door een nep-implementatie.
function _zetClient(c) { _client = c; }

// Bij een weigering door de veiligheidsfilters rolt de API het verzoek zelf
// door naar een passend model (server-side fallback).
var FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

function metFallback(params) {
  if (process.env.CLAUDE_GEEN_FALLBACK === '1') return params;
  return Object.assign({}, params, FALLBACK);
}

function kostenVan(usage) {
  if (!usage) return { dollar: 0, tokens: 0 };
  var inp = usage.input_tokens || 0;
  var out = usage.output_tokens || 0;
  var cw = usage.cache_creation_input_tokens || 0;
  var cr = usage.cache_read_input_tokens || 0;
  var zoek = (usage.server_tool_use && usage.server_tool_use.web_search_requests) || 0;
  var dollar = (inp * PRIJS.input + out * PRIJS.output + cw * PRIJS.cacheSchrijven + cr * PRIJS.cacheLezen) / 1e6
    + zoek * PRIJS.webSearchPer1000 / 1000;
  return { dollar: dollar, tokens: inp + out + cw + cr, input: inp, output: out, cacheSchrijven: cw, cacheLezen: cr, zoekopdrachten: zoek };
}

function telOp(a, b) {
  return {
    dollar: (a.dollar || 0) + (b.dollar || 0),
    tokens: (a.tokens || 0) + (b.tokens || 0),
    input: (a.input || 0) + (b.input || 0),
    output: (a.output || 0) + (b.output || 0),
    cacheSchrijven: (a.cacheSchrijven || 0) + (b.cacheSchrijven || 0),
    cacheLezen: (a.cacheLezen || 0) + (b.cacheLezen || 0),
    zoekopdrachten: (a.zoekopdrachten || 0) + (b.zoekopdrachten || 0)
  };
}

// Slaat verbruik op voor het stats-dashboard (in micro-dollars, als integer).
async function registreerKosten(soort, kosten) {
  if (!redis.isGeconfigureerd() || !kosten) return;
  var dag = new Date().toISOString().slice(0, 10);
  var micro = String(Math.round((kosten.dollar || 0) * 1e6));
  try {
    await redis.pipeline([
      ['INCRBY', 'stats:kosten:micro:total', micro],
      ['INCRBY', 'stats:kosten:micro:day:' + dag, micro],
      ['INCRBY', 'stats:kosten:micro:' + soort, micro],
      ['INCRBY', 'stats:tokens:total', String(kosten.tokens || 0)],
      ['INCRBY', 'stats:zoekopdrachten:total', String(kosten.zoekopdrachten || 0)],
      ['INCR', 'stats:claude:' + soort]
    ]);
  } catch (e) {
    console.error('Kosten registreren mislukt:', e.message);
  }
}

module.exports = {
  MODEL: MODEL, PRIJS: PRIJS, client: client, _zetClient: _zetClient, metFallback: metFallback,
  kostenVan: kostenVan, telOp: telOp, registreerKosten: registreerKosten, Anthropic: Anthropic
};
