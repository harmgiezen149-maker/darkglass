// Gedeelde helpers voor alle pagina's: HTML-escaping en fetch met login.
// Bij een 401 verschijnt een wachtwoordvenster; na inloggen wordt het verzoek
// automatisch opnieuw gedaan.
(function(root) {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var CSS = '.login-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; } .login-modal { background: var(--bg2); border: 1px solid var(--border-bright); border-radius: 6px; padding: 1.5rem; width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 0.75rem; } .login-titel { font-family: var(--font-a); font-weight: 700; letter-spacing: 0.2em; color: var(--accent); font-size: 0.85rem; } .login-tekst { font-size: 0.75rem; color: var(--text-dim); } .login-input { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 0.7rem; border-radius: 3px; font-family: var(--font-b); outline: none; } .login-input:focus { border-color: var(--accent); } .login-fout { color: var(--accent2); font-size: 0.7rem; min-height: 1em; } .login-knoppen { display: flex; gap: 0.5rem; justify-content: flex-end; } .login-knoppen button { font-family: var(--font-a); font-size: 0.65rem; letter-spacing: 0.15em; padding: 0.55rem 0.9rem; border-radius: 3px; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-dim); } .login-knoppen .login-ok { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 700; }';

  function zetStijl() {
    if (document.getElementById('auth-ui-css')) return;
    var st = document.createElement('style');
    st.id = 'auth-ui-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var wachtend = null;

  function loginVenster(rol, melding) {
    if (wachtend) return wachtend;
    zetStijl();
    wachtend = new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'login-overlay';
      overlay.innerHTML = '<form class="login-modal">'
        + '<div class="login-titel">' + (rol === 'admin' ? 'BEHEERDER LOGIN' : 'INLOGGEN') + '</div>'
        + '<p class="login-tekst">' + esc(melding || (rol === 'admin' ? 'Voer het beheerderswachtwoord in.' : 'Voer het wachtwoord van de app in.')) + '</p>'
        + '<input type="password" class="login-input" autocomplete="current-password" required />'
        + '<div class="login-fout"></div>'
        + '<div class="login-knoppen"><button type="button" class="login-annuleer">ANNULEER</button><button type="submit" class="login-ok">INLOGGEN</button></div>'
        + '</form>';
      document.body.appendChild(overlay);
      var form = overlay.querySelector('form');
      var input = overlay.querySelector('input');
      var fout = overlay.querySelector('.login-fout');
      input.focus();
      function sluit(ok) { overlay.remove(); wachtend = null; resolve(ok); }
      overlay.querySelector('.login-annuleer').onclick = function() { sluit(false); };
      form.onsubmit = function(e) {
        e.preventDefault();
        fetch('/api/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rol: rol, wachtwoord: input.value })
        }).then(function(r) { return r.json().then(function(d) { return { ok: r.ok, d: d }; }); })
          .then(function(x) {
            if (x.ok) sluit(true);
            else { fout.textContent = x.d.error || 'Inloggen mislukt'; input.select(); }
          })
          .catch(function() { fout.textContent = 'Netwerkfout'; });
      };
    });
    return wachtend;
  }

  // fetch() met JSON en automatische login bij 401.
  function apiFetch(url, opts) {
    opts = Object.assign({}, opts || {});
    if (opts.json !== undefined) {
      opts.method = opts.method || 'POST';
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      opts.body = JSON.stringify(opts.json);
      delete opts.json;
    }
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function(r) {
      if (r.status !== 401) return r;
      return r.clone().json().catch(function() { return {}; }).then(function(d) {
        return loginVenster(d.rol || 'app', d.error).then(function(ok) {
          if (!ok) return r;
          return fetch(url, opts);
        });
      });
    });
  }

  // Zelfde als apiFetch, maar geeft de JSON terug en gooit bij fouten.
  function apiJson(url, opts) {
    return apiFetch(url, opts).then(function(r) {
      return r.json().catch(function() { return {}; }).then(function(d) {
        if (!r.ok || d.error) throw new Error(d.error || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  root.esc = esc;
  root.apiFetch = apiFetch;
  root.apiJson = apiJson;
  root.loginVenster = loginVenster;
})(window);
