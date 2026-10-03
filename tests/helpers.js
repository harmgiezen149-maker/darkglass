// Gedeelde test-helpers: geheugen-Redis en nep-req/res in Vercel-stijl.
process.env.DG_DEV = '1';
delete process.env.UPSTASH_REDIS_REST_URL;
var redis = require('../api/_lib/redis');

function req(opts) {
  opts = opts || {};
  return {
    method: opts.method || 'GET',
    url: opts.url || '/',
    query: opts.query || {},
    body: opts.body || {},
    headers: Object.assign({ 'content-type': 'application/json' }, opts.headers || {}),
    socket: { remoteAddress: '127.0.0.1' }
  };
}

function res() {
  var r = { statusCode: 200, headers: {}, body: null, geschreven: '' };
  r.status = function(c) { r.statusCode = c; return r; };
  r.json = function(d) { r.body = d; return r; };
  r.setHeader = function(k, v) { r.headers[k.toLowerCase()] = v; };
  r.getHeader = function(k) { return r.headers[k.toLowerCase()]; };
  r.write = function(s) { r.geschreven += s; };
  r.end = function() { r.klaar = true; };
  return r;
}

async function roep(handler, opts) {
  var r = res();
  await handler(req(opts), r);
  return r;
}

module.exports = { req: req, res: res, roep: roep, resetRedis: redis._resetMem };
