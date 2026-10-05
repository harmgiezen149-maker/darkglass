// Blokcatalogus: gestructureerde parameters, parser voor de leesbare notatie,
// waarde-controle en vergelijken van catalogi. Werkt in de browser
// (window.Catalogus) en in Node (require).
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Catalogus = factory();
})(typeof self !== 'undefined' ? self : this, function() {

  var EENHEDEN = ['dB/oct', 'cents', 'kHz', 'Hz', 'ms', 'dB', 's', '%'];
  var TYPES = ['knop', 'schakelaar', 'keuze', 'tekst'];

  function slug(naam) {
    return String(naam || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  }

  function getal(s) {
    var n = parseFloat(String(s).replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  // ---------- eenheden ----------
  function familie(eenheid) {
    if (eenheid === 'Hz' || eenheid === 'kHz') return 'freq';
    if (eenheid === 'ms' || eenheid === 's') return 'tijd';
    return eenheid || '';
  }

  // Zet een waarde om naar de eenheid van de parameter (kHz↔Hz, s↔ms).
  function converteer(waarde, van, naar) {
    if (van === naar || !van || !naar) return waarde;
    if (van === 'kHz' && naar === 'Hz') return waarde * 1000;
    if (van === 'Hz' && naar === 'kHz') return waarde / 1000;
    if (van === 's' && naar === 'ms') return waarde * 1000;
    if (van === 'ms' && naar === 's') return waarde / 1000;
    return waarde;
  }

  function splitsEenheid(tekst) {
    var t = String(tekst).trim();
    for (var i = 0; i < EENHEDEN.length; i++) {
      var e = EENHEDEN[i];
      // Alleen een eenheid direct na een getal telt ("400 ms", niet "Rooms").
      var re = new RegExp('^(.*\\d)\\s*' + e.replace('/', '\\/') + '$', 'i');
      var m = t.match(re);
      if (m) return { rest: m[1].trim(), eenheid: normaliseerEenheid(e) };
    }
    return { rest: t, eenheid: '' };
  }

  function normaliseerEenheid(e) {
    var map = { hz: 'Hz', khz: 'kHz', db: 'dB', 'db/oct': 'dB/oct', ms: 'ms', s: 's', '%': '%', cents: 'cents' };
    return map[String(e).toLowerCase()] || e;
  }

  // "3kHz" → { waarde: 3, eenheid: 'kHz' }
  function getalMetEenheid(s) {
    var m = String(s).trim().match(/^([+-]?\d+(?:[.,]\d+)?)\s*(dB\/oct|cents|kHz|Hz|ms|dB|s|%)?$/i);
    if (!m) return null;
    return { waarde: getal(m[1]), eenheid: m[2] ? normaliseerEenheid(m[2]) : '' };
  }

  // ---------- parser: "Drive (0-100%)" ----------
  function splitsParameters(tekst) {
    var delen = [], diepte = 0, huidig = '';
    String(tekst || '').split('').forEach(function(c) {
      if (c === '(') diepte++;
      if (c === ')') diepte = Math.max(0, diepte - 1);
      if ((c === ',' || c === ';' || c === '\n') && diepte === 0) { if (huidig.trim()) delen.push(huidig.trim()); huidig = ''; }
      else huidig += c;
    });
    if (huidig.trim()) delen.push(huidig.trim());
    return delen;
  }

  function parseBereik(spec) {
    // "-15/+15 dB", "+/-15 dB"
    var pm = spec.match(/^\+\/-\s*(\d+(?:[.,]\d+)?)\s*(dB|%|cents|Hz)?$/i);
    if (pm) return { min: -getal(pm[1]), max: getal(pm[1]), eenheid: pm[2] ? normaliseerEenheid(pm[2]) : '' };
    var sym = spec.match(/^-\s*(\d+(?:[.,]\d+)?)\s*\/\s*\+\s*(\d+(?:[.,]\d+)?)\s*(dB|%|cents)?$/i);
    if (sym) return { min: -getal(sym[1]), max: getal(sym[2]), eenheid: sym[3] ? normaliseerEenheid(sym[3]) : '' };

    // "1:1-20:1" (ratio)
    var ratio = spec.match(/^(\d+(?:\.\d+)?):1\s*(?:-|–|tot|to)\s*(\d+(?:\.\d+)?):1$/i);
    if (ratio) return { min: getal(ratio[1]), max: getal(ratio[2]), eenheid: ':1' };

    // "a - b" met optionele eenheden aan beide kanten
    var m = spec.match(/^([+-]?\d+(?:[.,]\d+)?)\s*([a-z%/]*)\s*(?:-|–|tot|to)\s*([+-]?\d+(?:[.,]\d+)?)\s*([a-z%/]*)$/i);
    if (!m) return null;
    var e1 = m[2] ? normaliseerEenheid(m[2]) : '', e2 = m[4] ? normaliseerEenheid(m[4]) : '';
    if ((e1 && EENHEDEN.indexOf(e1) === -1) || (e2 && EENHEDEN.indexOf(e2) === -1)) return null;
    var lo = getal(m[1]), hi = getal(m[3]);
    var eenheid = e2 || e1;
    if (e1 && e2 && e1 !== e2 && familie(e1) === familie(e2)) {
      // "40Hz-1kHz" → alles in de kleinste eenheid
      var basis = familie(e1) === 'freq' ? 'Hz' : 'ms';
      lo = converteer(lo, e1, basis); hi = converteer(hi, e2, basis); eenheid = basis;
    }
    return { min: lo, max: hi, eenheid: eenheid };
  }

  // Officiële id's in het Anagram-presetformaat: een LV2-URI per blok en een
  // symbool per parameter (bv. "drive", of ":bypass" voor speciale symbolen).
  var SYMBOOL = /^:?[A-Za-z_][A-Za-z0-9_]*$/;
  var URI = /^(urn:|https?:\/\/)\S{1,200}$/;

  function parseParameter(naam, spec) {
    naam = String(naam || '').trim();
    spec = String(spec || '').trim();
    // "Drive [drive]": het symbool tussen blokhaken
    var symbool = '';
    var ms = naam.match(/^(.*?)\s*\[([^\]]*)\]\s*$/);
    if (ms && SYMBOOL.test(ms[2].trim())) { naam = ms[1].trim(); symbool = ms[2].trim(); }
    var p = parseSpec(naam, spec);
    if (symbool) p.symbol = symbool;
    return p;
  }

  function parseSpec(naam, spec) {
    if (!spec) return { naam: naam, type: 'tekst' };

    var p = { naam: naam };
    if (/^(on\s*\/\s*off|off\s*\/\s*on|aan\s*\/\s*uit)$/i.test(spec)) { p.type = 'schakelaar'; return p; }

    // extra keuzes na "of"/"or": "1-2000 ms of BPM-sync", "100/200/400 ms of Auto"
    var extra = [];
    var ofDelen = spec.split(/\s+(?:of|or)\s+/i);
    if (ofDelen.length > 1) { spec = ofDelen[0].trim(); extra = ofDelen.slice(1).map(function(x) { return x.trim(); }); }

    var bereik = parseBereik(spec);
    if (bereik) {
      p.type = 'knop'; p.min = bereik.min; p.max = bereik.max;
      if (bereik.eenheid) p.eenheid = bereik.eenheid;
      if (extra.length) p.opties = extra;
      return p;
    }

    // keuzelijst met optionele gedeelde eenheid: "1/3/10/30/100 ms", "6/12/18/24 dB/oct"
    var se = splitsEenheid(spec);
    var lijst = se.rest.split('/').map(function(x) { return x.trim(); }).filter(Boolean);
    if (lijst.length > 1) {
      p.type = 'keuze';
      p.opties = lijst.map(function(o) { return se.eenheid && /^[\d.,:]+$/.test(o) ? o + ' ' + se.eenheid : o; }).concat(extra);
      return p;
    }

    // alleen een eenheid ("cents") of een enkel getal
    if (/^(dB\/oct|cents|kHz|Hz|ms|dB|s|%)$/i.test(spec)) { p.type = 'knop'; p.eenheid = normaliseerEenheid(spec); return p; }

    p.type = 'tekst';
    p.omschrijving = spec + (extra.length ? ' of ' + extra.join(' of ') : '');
    return p;
  }

  function parseParameterTekst(tekst) {
    return splitsParameters(tekst).map(function(deel) {
      var m = deel.match(/^(.*?)\s*\((.*)\)\s*$/);
      return m ? parseParameter(m[1], m[2]) : parseParameter(deel, '');
    }).filter(function(p) { return p.naam; });
  }

  // ---------- formatteren ----------
  function getalTekst(n) {
    return String(Math.round(n * 1000) / 1000);
  }

  function formatSpec(p) {
    var extra = p.opties && p.opties.length ? p.opties : [];
    switch (p.type) {
      case 'schakelaar': return 'On/Off';
      case 'keuze':
        // "6 dB/oct, 12 dB/oct" → "6/12 dB/oct" (anders is de "/" dubbelzinnig)
        var ops = p.opties || [];
        var getallen = [], overig = [], eenheid = null, gedeeld = true;
        ops.forEach(function(o) {
          var m = String(o).match(/^([\d.,:]+)\s*(dB\/oct|cents|kHz|Hz|ms|dB|s|%)$/i);
          if (m && (eenheid === null || eenheid === m[2])) { eenheid = m[2]; getallen.push(m[1]); }
          else if (m) gedeeld = false;
          else overig.push(o);
        });
        if (gedeeld && eenheid && getallen.length > 1) {
          return getallen.join('/') + ' ' + eenheid + (overig.length ? ' of ' + overig.join(' of ') : '');
        }
        return ops.join('/');
      case 'knop':
        var e = p.eenheid || '';
        var b;
        if (p.min == null || p.max == null) b = e;
        else if (e === ':1') b = getalTekst(p.min) + ':1-' + getalTekst(p.max) + ':1';
        else if (p.min < 0 && p.max === -p.min) b = '+/-' + getalTekst(p.max) + (e ? ' ' + e : '');
        else if (p.min < 0) b = getalTekst(p.min) + ' tot ' + getalTekst(p.max) + (e ? ' ' + e : '');
        else b = getalTekst(p.min) + '-' + getalTekst(p.max) + (e === '%' ? '%' : (e ? ' ' + e : ''));
        return b + (extra.length ? ' of ' + extra.join(' of ') : '');
      default: return p.omschrijving || '';
    }
  }

  function formatParameter(p) {
    var s = formatSpec(p);
    var naam = p.naam + (p.symbol ? ' [' + p.symbol + ']' : '');
    return s ? naam + ' (' + s + ')' : naam;
  }

  function formatParameters(lijst) {
    if (typeof lijst === 'string') return lijst;
    return (lijst || []).map(formatParameter).join(', ');
  }

  // ---------- normaliseren ----------
  function normaliseerParameter(p) {
    if (!p || !p.naam) return null;
    var uit = { naam: String(p.naam).trim().slice(0, 60), type: TYPES.indexOf(p.type) !== -1 ? p.type : 'tekst' };
    if (uit.type === 'knop') {
      if (getal(p.min) != null) uit.min = getal(p.min);
      if (getal(p.max) != null) uit.max = getal(p.max);
      if (p.eenheid) uit.eenheid = normaliseerEenheid(String(p.eenheid).trim());
      if (uit.min != null && uit.max != null && uit.min > uit.max) { var t = uit.min; uit.min = uit.max; uit.max = t; }
    }
    var opties = Array.isArray(p.opties) ? p.opties.map(function(o) { return String(o).trim(); }).filter(Boolean).slice(0, 40) : [];
    if (opties.length) uit.opties = opties;
    if (uit.type === 'keuze' && !opties.length) uit.type = 'tekst';
    if (p.standaard != null && p.standaard !== '') uit.standaard = String(p.standaard).slice(0, 40);
    if (p.omschrijving) uit.omschrijving = String(p.omschrijving).slice(0, 200);
    if (p.symbol && SYMBOOL.test(String(p.symbol))) uit.symbol = String(p.symbol);
    return uit;
  }

  function normaliseerBlok(b) {
    if (!b || !b.naam) return null;
    var params = Array.isArray(b.parameters) ? b.parameters.map(normaliseerParameter).filter(Boolean)
      : parseParameterTekst(b.parameters || '');
    var uit = {
      id: slug(b.naam),
      naam: String(b.naam).trim().slice(0, 80),
      basis: String(b.basis || '').trim().slice(0, 120),
      parameters: params,
      status: ['geverifieerd', 'onbevestigd', 'handmatig'].indexOf(b.status) !== -1 ? b.status : 'handmatig'
    };
    if (b.bron && typeof b.bron === 'object') {
      uit.bron = {};
      ['type', 'kosmos', 'pagina', 'url', 'datum'].forEach(function(k) { if (b.bron[k] != null && b.bron[k] !== '') uit.bron[k] = b.bron[k]; });
    }
    if (b.notitie) uit.notitie = String(b.notitie).slice(0, 500);
    if (b.uri && URI.test(String(b.uri).trim())) uit.uri = String(b.uri).trim();
    return uit;
  }

  function normaliseerCatalogus(secties) {
    if (!Array.isArray(secties)) return [];
    return secties.filter(function(s) { return s && s.sectie; }).map(function(s) {
      return {
        sectie: String(s.sectie).trim().toUpperCase().slice(0, 40),
        blokken: (s.blokken || []).map(normaliseerBlok).filter(Boolean)
      };
    });
  }

  // ---------- opzoeken ----------
  function alleBlokken(secties) {
    var uit = [];
    (secties || []).forEach(function(s) { (s.blokken || []).forEach(function(b) { uit.push({ sectie: s.sectie, blok: b }); }); });
    return uit;
  }

  function vindBlok(secties, naam) {
    var s = slug(naam);
    if (!s) return null;
    var lijst = alleBlokken(secties);
    var exact = lijst.find(function(x) { return slug(x.blok.naam) === s; });
    if (exact) return exact.blok;
    // "Microtubes B3K (Darkglass B3K)" → zonder toevoeging tussen haakjes
    var kaal = slug(String(naam).replace(/\(.*\)/, ''));
    var r = lijst.find(function(x) { return slug(x.blok.naam) === kaal; });
    return r ? r.blok : null;
  }

  function vindParameter(blok, naam) {
    var s = slug(naam);
    var params = (blok && blok.parameters) || [];
    return params.find(function(p) { return slug(p.naam) === s; })
      || params.find(function(p) { var ps = slug(p.naam); return ps && s && (ps.indexOf(s) === 0 || s.indexOf(ps) === 0); })
      || null;
  }

  // ---------- waarde controleren ----------
  // Geeft { ok, waarde, tekst, fout, pct } terug. pct (0..1) is de stand op de knop.
  function controleerWaarde(p, ruw) {
    var tekst = String(ruw == null ? '' : ruw).trim();
    if (!tekst) return { ok: false, fout: 'lege waarde' };
    var laag = tekst.toLowerCase();

    if (p.type === 'schakelaar') {
      if (/^(on|aan|ja|yes|true|1)$/.test(laag)) return { ok: true, waarde: true, tekst: 'On' };
      if (/^(off|uit|nee|no|false|0)$/.test(laag)) return { ok: true, waarde: false, tekst: 'Off' };
      return { ok: false, fout: 'verwacht On of Off' };
    }

    var opties = p.opties || [];
    var optie = opties.find(function(o) { return slug(o) === slug(tekst); });
    if (p.type === 'keuze') {
      if (optie) return { ok: true, waarde: optie, tekst: optie };
      // "3 ms" tegen opties "3 ms" met andere spatiëring
      return { ok: false, fout: 'kies uit: ' + opties.join(', ') };
    }

    if (p.type === 'knop') {
      if (optie) return { ok: true, waarde: optie, tekst: optie };
      var ge;
      if (p.eenheid === ':1') {
        var rm = tekst.match(/^(\d+(?:[.,]\d+)?)\s*:\s*1$/);
        ge = rm ? { waarde: getal(rm[1]), eenheid: ':1' } : getalMetEenheid(tekst);
        if (ge) ge.eenheid = ':1';
      } else {
        ge = getalMetEenheid(tekst.replace(/\s*(procent|percent)$/i, '%'));
      }
      if (!ge) return { ok: false, fout: 'geen getal' + (p.eenheid ? ' in ' + p.eenheid : '') };
      var w = ge.waarde;
      if (ge.eenheid && p.eenheid && ge.eenheid !== p.eenheid) {
        if (familie(ge.eenheid) !== familie(p.eenheid)) return { ok: false, fout: 'verkeerde eenheid ' + ge.eenheid + ', verwacht ' + p.eenheid };
        w = converteer(w, ge.eenheid, p.eenheid);
      }
      var res = { ok: true, waarde: w, tekst: getalTekst(w) + (p.eenheid ? (p.eenheid === '%' ? '%' : (p.eenheid === ':1' ? ':1' : ' ' + p.eenheid)) : '') };
      if (p.min != null && p.max != null) {
        if (w < p.min - 1e-9 || w > p.max + 1e-9) {
          return { ok: false, fout: 'buiten bereik ' + formatSpec({ type: 'knop', min: p.min, max: p.max, eenheid: p.eenheid }), waarde: w, begrensd: Math.min(p.max, Math.max(p.min, w)) };
        }
        res.pct = p.max === p.min ? 0 : (w - p.min) / (p.max - p.min);
      }
      return res;
    }
    return { ok: true, waarde: tekst, tekst: tekst };
  }

  // ---------- vergelijken ----------
  function paramVerschillen(oud, nieuw) {
    var uit = [];
    var oudMap = {}, nieuwMap = {};
    (oud || []).forEach(function(p) { oudMap[slug(p.naam)] = p; });
    (nieuw || []).forEach(function(p) { nieuwMap[slug(p.naam)] = p; });
    Object.keys(nieuwMap).forEach(function(k) {
      if (!oudMap[k]) uit.push({ soort: 'nieuw', parameter: nieuwMap[k].naam, nieuw: formatSpec(nieuwMap[k]) });
      else if (formatSpec(oudMap[k]) !== formatSpec(nieuwMap[k])) uit.push({ soort: 'gewijzigd', parameter: nieuwMap[k].naam, oud: formatSpec(oudMap[k]), nieuw: formatSpec(nieuwMap[k]) });
    });
    Object.keys(oudMap).forEach(function(k) {
      if (!nieuwMap[k]) uit.push({ soort: 'vervalt', parameter: oudMap[k].naam, oud: formatSpec(oudMap[k]) });
    });
    return uit;
  }

  // huidig: catalogus; bron: catalogus uit handleiding of release notes.
  // opties.volledig: bron dekt de hele handleiding (dan zijn ontbrekende blokken zinvol).
  function vergelijk(huidig, bron, opties) {
    opties = opties || {};
    var uit = [];
    var huidigLijst = alleBlokken(huidig);
    var gezien = {};
    alleBlokken(bron).forEach(function(x) {
      var b = x.blok;
      var bestaand = vindBlok(huidig, b.naam);
      if (!bestaand) {
        uit.push({ key: 'nieuw:' + b.id, soort: 'nieuw', sectie: x.sectie, blok: b });
        return;
      }
      gezien[bestaand.id] = true;
      var verschillen = paramVerschillen(bestaand.parameters, b.parameters);
      var statusOmhoog = b.status === 'geverifieerd' && bestaand.status !== 'geverifieerd';
      if (verschillen.length || statusOmhoog) {
        uit.push({ key: 'gewijzigd:' + bestaand.id + ':' + slug(formatParameters(b.parameters)), soort: 'gewijzigd', sectie: x.sectie, blok: b, huidig: bestaand, verschillen: verschillen });
      }
    });
    if (opties.volledig) {
      huidigLijst.forEach(function(x) {
        if (!gezien[x.blok.id]) uit.push({ key: 'ontbreekt:' + x.blok.id, soort: 'ontbreekt', sectie: x.sectie, blok: x.blok });
      });
    }
    return uit;
  }

  // Past goedgekeurde voorstellen toe op de catalogus (nieuwe kopie).
  function pasToe(huidig, besluiten) {
    var cat = JSON.parse(JSON.stringify(normaliseerCatalogus(huidig)));
    function sectieVan(naam) {
      var s = cat.find(function(x) { return x.sectie === String(naam).toUpperCase(); });
      if (!s) { s = { sectie: String(naam).toUpperCase(), blokken: [] }; cat.push(s); }
      return s;
    }
    (besluiten || []).forEach(function(b) {
      var v = b.voorstel;
      if (!v || b.besluit === 'negeren') return;
      var blok = normaliseerBlok(b.blok || v.blok);
      if (v.soort === 'nieuw' && b.besluit === 'overnemen' && blok) {
        if (!vindBlok(cat, blok.naam)) sectieVan(v.sectie || 'OVERIG').blokken.push(blok);
      } else if (v.soort === 'gewijzigd' && b.besluit === 'overnemen' && blok) {
        cat.forEach(function(s) {
          s.blokken = s.blokken.map(function(x) {
            if (x.id !== v.huidig.id) return x;
            var nieuw = Object.assign({}, blok);
            if (x.notitie) nieuw.notitie = x.notitie;
            // officiële id's die de handleiding niet kent, blijven behouden
            if (x.uri && !nieuw.uri) nieuw.uri = x.uri;
            nieuw.parameters = (nieuw.parameters || []).map(function(p) {
              var oud = vindParameter(x, p.naam);
              return oud && oud.symbol && !p.symbol ? Object.assign({}, p, { symbol: oud.symbol }) : p;
            });
            return nieuw;
          });
        });
      } else if (v.soort === 'ontbreekt' && b.besluit === 'verwijderen') {
        cat.forEach(function(s) { s.blokken = s.blokken.filter(function(x) { return x.id !== v.blok.id; }); });
      }
    });
    return cat.filter(function(s) { return s.blokken.length; });
  }

  // Leesbare lijst voor in een prompt.
  function promptTekst(secties) {
    var t = '';
    (secties || []).forEach(function(s) {
      t += '\n--- ' + s.sectie + ' ---\n';
      (s.blokken || []).forEach(function(b) {
        t += b.naam + (b.basis ? ' (' + b.basis + ')' : '') + '\n';
        t += '  Parameters: ' + formatParameters(b.parameters) + '\n';
      });
    });
    return t;
  }

  function vergelijkVersie(a, b) {
    var pa = String(a || '0').match(/\d+/g) || [0], pb = String(b || '0').match(/\d+/g) || [0];
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = parseInt(pa[i] || '0', 10), y = parseInt(pb[i] || '0', 10);
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }

  return {
    slug: slug, parseParameter: parseParameter, parseParameterTekst: parseParameterTekst,
    formatSpec: formatSpec, formatParameter: formatParameter, formatParameters: formatParameters,
    normaliseerParameter: normaliseerParameter, normaliseerBlok: normaliseerBlok, normaliseerCatalogus: normaliseerCatalogus,
    alleBlokken: alleBlokken, vindBlok: vindBlok, vindParameter: vindParameter, controleerWaarde: controleerWaarde,
    paramVerschillen: paramVerschillen, vergelijk: vergelijk, pasToe: pasToe, promptTekst: promptTekst,
    vergelijkVersie: vergelijkVersie, converteer: converteer
  };
});
