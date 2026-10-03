// Eenvoudige sessies met een ondertekende cookie.
//
// - APP_WACHTWOORD (optioneel): als gezet, is inloggen nodig om de app te
//   gebruiken (analyseren, chatten, presets opslaan).
// - ADMIN_WACHTWOORD (valt terug op STATS_WACHTWOORD): nodig voor beheer —
//   blokken wijzigen, sync, rig, presets verwijderen en statistieken.
//   Zonder een van beide is beheer uitgeschakeld.

var crypto = require('crypto');
var http = require('./http');

var COOKIE = { app: 'dg_app', admin: 'dg_admin' };
var DUUR_SEC = 30 * 24 * 3600;

function wachtwoordVoor(rol) {
  if (rol === 'admin') return process.env.ADMIN_WACHTWOORD || process.env.STATS_WACHTWOORD || '';
  if (rol === 'app') return process.env.APP_WACHTWOORD || '';
  return '';
}

function sleutel(rol) {
  return crypto.createHash('sha256').update('dg-sessie:' + rol + ':' + wachtwoordVoor(rol) + ':' + (process.env.SESSION_SECRET || '')).digest();
}

function teken(rol, exp) {
  var payload = rol + '.' + exp;
  var mac = crypto.createHmac('sha256', sleutel(rol)).update(payload).digest('base64url');
  return payload + '.' + mac;
}

function controleerToken(token, rol) {
  if (!token || !wachtwoordVoor(rol)) return false;
  var delen = String(token).split('.');
  if (delen.length !== 3 || delen[0] !== rol) return false;
  var exp = parseInt(delen[1], 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  var verwacht = Buffer.from(teken(rol, exp));
  var gekregen = Buffer.from(String(token));
  return verwacht.length === gekregen.length && crypto.timingSafeEqual(verwacht, gekregen);
}

function cookies(req) {
  var out = {};
  String((req.headers && req.headers.cookie) || '').split(';').forEach(function(c) {
    var i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

function wachtwoordKlopt(rol, poging) {
  var echt = wachtwoordVoor(rol);
  if (!echt || typeof poging !== 'string') return false;
  var a = crypto.createHash('sha256').update(echt).digest();
  var b = crypto.createHash('sha256').update(poging).digest();
  return crypto.timingSafeEqual(a, b);
}

function isAdmin(req) {
  return controleerToken(cookies(req)[COOKIE.admin], 'admin');
}

function heeftAppToegang(req) {
  if (!process.env.APP_WACHTWOORD) return true;
  return isAdmin(req) || controleerToken(cookies(req)[COOKIE.app], 'app');
}

function cookieHeader(rol, waarde, maxAge, req) {
  var secure = ((req.headers && req.headers['x-forwarded-proto']) || '').indexOf('https') !== -1 ? '; Secure' : '';
  return COOKIE[rol] + '=' + encodeURIComponent(waarde) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + secure;
}

function zetSessie(res, req, rol) {
  var exp = Math.floor(Date.now() / 1000) + DUUR_SEC;
  var bestaand = res.getHeader && res.getHeader('Set-Cookie');
  var lijst = bestaand ? [].concat(bestaand) : [];
  lijst.push(cookieHeader(rol, teken(rol, exp), DUUR_SEC, req));
  res.setHeader('Set-Cookie', lijst);
}

function wisSessies(res, req) {
  res.setHeader('Set-Cookie', [cookieHeader('app', '', 0, req), cookieHeader('admin', '', 0, req)]);
}

// Guards: sturen zelf een 401/403 en geven false terug.
function vereisApp(req, res) {
  if (heeftAppToegang(req)) return true;
  http.stuur(res, 401, { error: 'Inloggen vereist', rol: 'app' });
  return false;
}

function vereisAdmin(req, res) {
  if (!wachtwoordVoor('admin')) {
    http.stuur(res, 403, { error: 'Beheer is uitgeschakeld: stel ADMIN_WACHTWOORD in op Vercel.', rol: 'admin' });
    return false;
  }
  if (isAdmin(req)) return true;
  http.stuur(res, 401, { error: 'Beheerder-login vereist', rol: 'admin' });
  return false;
}

function status(req) {
  return {
    appWachtwoordActief: !!process.env.APP_WACHTWOORD,
    beheerActief: !!wachtwoordVoor('admin'),
    app: heeftAppToegang(req),
    admin: isAdmin(req)
  };
}

module.exports = {
  vereisApp: vereisApp, vereisAdmin: vereisAdmin, isAdmin: isAdmin, heeftAppToegang: heeftAppToegang,
  wachtwoordKlopt: wachtwoordKlopt, zetSessie: zetSessie, wisSessies: wisSessies, status: status,
  _teken: teken, _controleerToken: controleerToken
};
