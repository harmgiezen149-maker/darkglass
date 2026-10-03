#!/usr/bin/env node
// Lokale ontwikkelserver zonder Vercel: statische bestanden + /api/*-handlers.
// Zonder Upstash-config gebruikt hij een geheugen-store (DG_DEV=1).
// Met DG_FAKE_CLAUDE=1 (of zonder ANTHROPIC_API_KEY) antwoordt een nep-Claude.
//
//   node scripts/dev-server.js [poort]

var httpMod = require('http');
var fs = require('fs');
var path = require('path');

process.env.DG_DEV = '1';
var ROOT = path.resolve(__dirname, '..');
var POORT = parseInt(process.argv[2] || process.env.PORT || '3000', 10);

if (process.env.DG_FAKE_CLAUDE === '1' || !process.env.ANTHROPIC_API_KEY) {
  require(path.join(ROOT, 'api/_lib/claude'))._zetClient(require('./fake-claude'));
  console.log('Nep-Claude actief (geen echte API-aanroepen).');
}

var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function vercelRes(res) {
  res.status = function(c) { res.statusCode = c; return res; };
  res.json = function(d) { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); return res; };
  res.send = function(d) { res.end(typeof d === 'string' ? d : JSON.stringify(d)); return res; };
  return res;
}

var server = httpMod.createServer(function(req, res) {
  var url = new URL(req.url, 'http://localhost');
  if (url.pathname.indexOf('/api/') === 0) {
    var naam = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, '');
    var bestand = path.join(ROOT, 'api', naam + '.js');
    if (!naam || !fs.existsSync(bestand)) { res.statusCode = 404; return res.end('{"error":"niet gevonden"}'); }
    var delen = [];
    req.on('data', function(c) { delen.push(c); });
    req.on('end', function() {
      var raw = Buffer.concat(delen).toString('utf8');
      req.body = raw;
      if ((req.headers['content-type'] || '').indexOf('application/json') !== -1) { try { req.body = JSON.parse(raw || '{}'); } catch (e) { req.body = {}; } }
      req.query = Object.fromEntries(url.searchParams);
      Promise.resolve(require(bestand)(req, vercelRes(res))).catch(function(e) {
        console.error(e);
        if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
        else res.end();
      });
    });
    return;
  }
  var p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  if (!p) p = 'index.html';
  var f = path.join(ROOT, p);
  if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('Niet gevonden'); }
  res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});

server.listen(POORT, function() { console.log('Dev-server op http://localhost:' + POORT); });
module.exports = server;
