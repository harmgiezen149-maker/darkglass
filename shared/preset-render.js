// Weergave van een preset (scene) en het onderzoek als HTML.
// Alle tekst wordt ge-escaped. Werkt in de browser (window.PresetRender) en in Node.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalogus'), require('./validatie'));
  else root.PresetRender = factory(root.Catalogus, root.Validatie);
})(typeof self !== 'undefined' ? self : this, function(Catalogus, Validatie) {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function vet(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function veiligeUrl(u) { return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null; }

  // ---------- knoppen ----------
  function pt(cx, cy, r, deg) {
    var rad = (deg - 90) * Math.PI / 180;
    return { x: +(cx + r * Math.cos(rad)).toFixed(2), y: +(cy + r * Math.sin(rad)).toFixed(2) };
  }

  // Waarde in het midden van de knop: zo groot als past binnen de ring
  // (ca. 34 eenheden breed), met een maximum voor korte waarden.
  function waardeTekst(display) {
    var tekst = String(display);
    var grootte = Math.max(8, Math.min(15, Math.floor(34 / (Math.max(tekst.length, 1) * 0.62) * 10) / 10));
    return '<text class="knob-center-val" x="30" y="31" style="font-size:' + grootte + 'px">' + esc(tekst) + '</text>';
  }

  function knop(label, display, pct) {
    pct = Math.max(0, Math.min(1, pct));
    var s = pt(30, 30, 22, 180), eind = pt(30, 30, 22, 510), e = pt(30, 30, 22, 180 + pct * 330);
    var bg = 'M ' + s.x + ' ' + s.y + ' A 22 22 0 1 1 ' + eind.x + ' ' + eind.y;
    var fill = pct > 0.001 ? 'M ' + s.x + ' ' + s.y + ' A 22 22 0 ' + (pct * 330 > 180 ? 1 : 0) + ' 1 ' + e.x + ' ' + e.y : '';
    return '<div class="knob-wrap"><svg class="knob-svg" width="68" height="68" viewBox="0 0 60 60">'
      + '<path class="knob-track" d="' + bg + '"/>' + (fill ? '<path class="knob-fill" d="' + fill + '"/>' : '')
      + waardeTekst(display) + '</svg><div class="knob-label">' + esc(label) + '</div></div>';
  }

  function knopBipolair(label, display, pct) {
    pct = Math.max(-1, Math.min(1, pct));
    var ts = pt(30, 30, 22, 210), te = pt(30, 30, 22, 150), c = pt(30, 30, 22, 0);
    var bg = 'M ' + ts.x + ' ' + ts.y + ' A 22 22 0 1 1 ' + te.x + ' ' + te.y;
    var fill = '';
    if (Math.abs(pct) > 0.01) {
      var boog = Math.abs(pct) * 150;
      var e = pt(30, 30, 22, pct > 0 ? boog : 360 - boog);
      fill = 'M ' + c.x + ' ' + c.y + ' A 22 22 0 ' + (boog > 180 ? 1 : 0) + ' ' + (pct > 0 ? 1 : 0) + ' ' + e.x + ' ' + e.y;
    }
    return '<div class="knob-wrap"><svg class="knob-svg" width="68" height="68" viewBox="0 0 60 60">'
      + '<path class="knob-track" d="' + bg + '"/><circle cx="' + c.x + '" cy="' + c.y + '" r="2.5" fill="#3d3d4d"/>'
      + (fill ? '<path class="knob-fill" d="' + fill + '"/>' : '')
      + waardeTekst(display) + '</svg><div class="knob-label">' + esc(label) + '</div></div>';
  }

  function schakelaar(label, aan) {
    return '<div class="toggle-wrap"><div class="toggle-track ' + (aan ? 'on' : 'off') + '"><div class="toggle-thumb"></div></div>'
      + '<div class="toggle-val">' + (aan ? 'ON' : 'OFF') + '</div><div class="toggle-label">' + esc(label) + '</div></div>';
  }

  function keuze(label, opties, actief) {
    var a = Catalogus.slug(actief);
    return '<div class="selector-wrap"><div class="selector-label">' + esc(label) + '</div><div class="selector-opts">'
      + opties.map(function(o) { return '<span class="selector-opt' + (Catalogus.slug(o) === a ? ' active' : '') + '">' + esc(o) + '</span>'; }).join('')
      + '</div></div>';
  }

  function badge(label, waarde, fout) {
    return '<div class="textbadge-wrap' + (fout ? ' textbadge-fout' : '') + '"' + (fout ? ' title="' + esc(fout) + '"' : '') + '><div class="textbadge-label">' + esc(label) + '</div><div class="textbadge-val">' + esc(waarde) + '</div></div>';
  }

  // Zonder catalogusdefinitie: schatten op basis van de tekst (oude presets).
  function heuristisch(p, v) {
    var l = v.toLowerCase();
    if (l === 'on') return schakelaar(p, true);
    if (l === 'off') return schakelaar(p, false);
    var m = v.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (m) return knop(p, Math.round(+m[1]) + '%', +m[1] / 100);
    m = v.match(/^([+-]?\d+(?:\.\d+)?)\s*dB$/i);
    if (m && +m[1] >= -20) return knopBipolair(p, v, +m[1] / 15);
    return badge(p, v);
  }

  function getalDeel(tekst) { return String(tekst).replace(/\s+(?=[a-z%])/i, ' '); }

  // Eén instelling als knop/schakelaar/keuze volgens de catalogus.
  function instelling(def, ins) {
    var naam = ins.parameter, waarde = String(ins.waarde == null ? '' : ins.waarde).trim();
    var p = def ? Catalogus.vindParameter(def, naam) : null;
    if (!p) return heuristisch(naam, waarde);
    var r = Catalogus.controleerWaarde(p, waarde);
    if (p.type === 'schakelaar') return r.ok ? schakelaar(p.naam, r.waarde) : badge(p.naam, waarde, r.fout);
    if (p.type === 'keuze') return keuze(p.naam, p.opties || [], r.ok ? r.waarde : waarde);
    if (p.type === 'knop') {
      if (!r.ok) return badge(p.naam, waarde, r.fout);
      if (typeof r.waarde !== 'number' || r.pct == null) return badge(p.naam, r.tekst);
      var display = p.eenheid === '%' ? Math.round(r.waarde) + '%' : getalDeel(r.tekst);
      if (p.min < 0 && p.max > 0) return knopBipolair(p.naam, display, r.waarde / Math.max(Math.abs(p.min), p.max));
      return knop(p.naam, display, r.pct);
    }
    return badge(p.naam, waarde);
  }

  // ---------- secties ----------
  function ketenRegel(scene, items) {
    return (items || []).map(function(item, i) {
      var b = Validatie ? Validatie.blokBijKetenItem(scene, item) : null;
      var titel = b && b.blok !== item ? ' title="' + esc(b.blok) + '"' : '';
      return (i ? '<span class="chain-arrow">→</span>' : '') + '<span class="chain-block"' + titel + '>' + esc(item) + '</span>';
    }).join('');
  }

  function ketenHtml(scene, ctx) {
    var t = ctx.t;
    var h = '<div class="chain-container">';
    if (scene.routing === 'parallel') {
      h += '<div class="chain-row"><span class="parallel-badge">⇄ PARALLEL ROUTING</span></div>';
      h += '<div class="chain-row"><span class="chain-label">A</span>' + ketenRegel(scene, scene.chain_a) + '</div>';
      h += '<div class="chain-row"><span class="chain-label">B</span>' + ketenRegel(scene, scene.chain_b) + '</div>';
      if ((scene.merge_naar || []).length) h += '<div class="chain-row"><span class="chain-merge">⇣ MERGE</span>' + ketenRegel(scene, scene.merge_naar) + '</div>';
    } else {
      h += '<div class="chain-row"><span class="parallel-badge" style="border-color:var(--accent);color:var(--accent)">→ ' + esc(t('serieel')) + '</span></div>';
      h += '<div class="chain-row">' + ketenRegel(scene, scene.chain_a) + '</div>';
    }
    return h + '</div>';
  }

  function controleHtml(scene, ctx) {
    var c = scene.controle;
    if (!c) return '';
    var regels = (c.aanpassingen || []).concat(c.waarschuwingen || []);
    if (!regels.length && !c.gerepareerd) return '';
    return '<details class="controle-box"><summary>' + esc(ctx.t('controleTitel')) + (c.gerepareerd ? ' · ' + esc(ctx.t('controleGerepareerd')) : '') + (regels.length ? ' · ' + regels.length : '') + '</summary>'
      + (regels.length ? '<ul>' + regels.map(function(r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' : '<p>' + esc(ctx.t('controleOk')) + '</p>')
      + '</details>';
  }

  // ctx: { catalogus, bas, t(key), extra(scene) → html }
  function renderScene(scene, ctx) {
    var t = ctx.t;
    var html = '';
    if (ctx.bas && ctx.bas.snaren < 5 && scene.b_snaar_vereist) {
      html += '<div class="bsnaar-warning"><span class="bsnaar-icon">⚠</span><div><strong>' + esc(t('bsnaarTitel')) + '</strong><br>' + esc(t('bsnaarTekst')) + '</div></div>';
    }
    html += '<div class="sectie-titel">' + esc(t('toneAnalyse')) + '</div>';
    if (scene.stemming) html += '<div class="stemming-badge">' + esc(t('stemming')) + ': <strong>' + esc(scene.stemming) + '</strong></div>';
    String(scene.toneanalyse || '').split(/\n+/).filter(Boolean).forEach(function(p) { html += '<p>' + vet(p) + '</p>'; });

    html += '<div class="sectie-titel">' + esc(t('signaalchain')) + '</div>' + ketenHtml(scene, ctx);

    html += '<div class="sectie-titel">' + esc(t('blokkenTitel')) + '</div>';
    (scene.blokken || []).forEach(function(b, i) {
      var def = Catalogus.vindBlok(ctx.catalogus || [], b.blok);
      var naam = b.label && b.label !== b.blok ? b.label + ' · ' + b.blok : (b.blok || b.label);
      html += '<div class="blok-kaart"><div class="blok-titel"><span class="blok-nummer">' + (i + 1) + '</span><span class="blok-naam">' + esc(naam)
        + (b.origineel ? ' <span class="blok-origineel">(' + esc(b.origineel) + ')</span>' : '') + '</span></div>'
        + '<div class="blok-body">'
        + ((b.instellingen || []).length ? '<div class="visual-controls">' + b.instellingen.map(function(ins) { return instelling(def, ins); }).join('') + '</div>' : '')
        + (b.uitleg ? '<div class="blok-uitleg">' + vet(b.uitleg) + '</div>' : '')
        + '</div></div>';
    });

    if ((scene.tips || []).length) {
      html += '<div class="sectie-titel">FINE-TUNE TIPS</div><div class="tip-box">'
        + scene.tips.map(function(tip) { return '<p style="margin-bottom:0.5rem">' + vet(tip) + '</p>'; }).join('') + '</div>';
    }
    if (ctx.extra) html += ctx.extra(scene);
    html += controleHtml(scene, ctx);
    return html;
  }

  function zekerheidPill(z, t) {
    var k = z === 'hoog' ? 'hoog' : z === 'middel' ? 'middel' : 'laag';
    return '<span class="zeker zeker-' + k + '">' + esc(t('zeker_' + k)) + '</span>';
  }

  function renderOnderzoek(p, ctx) {
    var t = ctx.t;
    if (!p) return '';
    var kop = [p.opname, p.bassist ? t('bas') + ': ' + p.bassist : '', p.genre].filter(Boolean).map(esc).join(' · ');
    var h = '<details class="onderzoek-box"' + (ctx.open ? ' open' : '') + '><summary><span class="onderzoek-titel">' + esc(t('onderzoekTitel')) + '</span>'
      + (p.zekerheid ? zekerheidPill(p.zekerheid.algemeen, t) : '')
      + (p.uitCache ? '<span class="onderzoek-cache">' + esc(t('uitCache')) + '</span>' : '') + '</summary>';
    if (kop) h += '<div class="onderzoek-kop">' + kop + '</div>';
    if (p.samenvatting) h += '<p>' + vet(p.samenvatting) + '</p>';
    if (p.zekerheid && p.zekerheid.toelichting) h += '<p class="onderzoek-toelichting">' + vet(p.zekerheid.toelichting) + '</p>';
    if ((p.bevindingen || []).length) {
      h += '<table class="bevindingen">' + p.bevindingen.map(function(b) {
        var links = (b.bron_urls || []).map(veiligeUrl).filter(Boolean).map(function(u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">[' + (i + 1) + ']</a>'; }).join(' ');
        return '<tr><th>' + esc(b.onderwerp) + '</th><td>' + vet(b.waarde) + ' ' + links + '</td><td>' + zekerheidPill(b.zekerheid, t) + '</td></tr>';
      }).join('') + '</table>';
    }
    if ((p.bronnen || []).length) {
      h += '<div class="onderzoek-bronnen"><strong>' + esc(t('bronnen')) + ':</strong> ' + p.bronnen.filter(function(b) { return veiligeUrl(b.url); }).map(function(b) {
        return '<a href="' + esc(b.url) + '" target="_blank" rel="noopener noreferrer">' + esc(b.titel || b.url) + '</a>';
      }).join(' · ') + '</div>';
    }
    return h + '</details>';
  }

  return { esc: esc, renderScene: renderScene, renderOnderzoek: renderOnderzoek, instelling: instelling, knop: knop, knopBipolair: knopBipolair };
});
