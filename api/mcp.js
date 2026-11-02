var http = require('./_lib/http');
var redis = require('./_lib/redis');
var sleutel = require('./_lib/claudesleutel');
var mcp = require('./_lib/mcp');
var gereedschap = require('./_lib/claude-gereedschap');
var limiet = require('./_lib/ratelimit');

// De deur voor Claude: een MCP-server op /api/mcp/<sleutel> (vercel.json zet
// dat om naar /api/mcp?sleutel=…). De sleutel in het adres is het slot; klopt
// hij niet, dan volgt een kale 404. Deze route roept nooit Claude aan: alleen
// lezen uit Redis en, na Harms goedkeuring in het dorp, een setlist opslaan.

var INFO = {
  name: 'darkglass', version: '1.0.0',
  instructions: "Harm's Darkglass Anagram presets, setlists and rig (bass gear). Texts are partly Dutch. Read freely; save_setlist changes things, so only use it when Harm has approved the change. This server never runs the paid analysis."
};

module.exports = async function handler(req, res) {
  if (!redis.isGeconfigureerd()) return http.stuur(res, 500, { error: 'Redis niet geconfigureerd' });
  var q = http.query(req);
  if (!(await sleutel.geldig(q.sleutel))) { res.setHeader('Cache-Control', 'no-store'); return res.status(404).json({}); }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return http.stuur(res, 405, { error: 'Alleen POST' }); }
  // Snelheidslimiet (verbeterplan A6): lekt het adres uit, dan hooguit zoveel verzoeken per uur.
  var perUur = parseInt(process.env.LIMIET_CLAUDE_DEUR_PER_UUR || '', 10) > 0 ? parseInt(process.env.LIMIET_CLAUDE_DEUR_PER_UUR, 10) : 300;
  var uur = Math.floor(Date.now() / 3600000);
  if (!(await limiet.tel('claude-deur:' + uur, perUur, 3700)).ok) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(((uur + 1) * 3600000 - Date.now()) / 1000))));
    return http.stuur(res, 429, { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Te veel verzoeken dit uur. Probeer het straks opnieuw.' } });
  }
  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { return http.stuur(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Geen geldige JSON' } }); } }
  var uit = await mcp.verwerk(body, gereedschap.maak(), INFO);
  if (uit === null) { res.statusCode = 202; return res.end(); }
  return http.stuur(res, 200, uit);
};
