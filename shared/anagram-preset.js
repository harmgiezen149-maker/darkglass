// Export naar het officiële presetformaat van de Anagram (mod-connector,
// PRESET-FORMAT.md, versie 1): een JSON-bestand met signaalketen, blokken,
// parameters en scènes.
//
// Darkglass heeft het formaat gedocumenteerd, maar .angr-bestanden uit de Suite
// zijn versleuteld; die versleuteling is niet openbaar en wordt hier niet
// nagebootst. Deze export is bedoeld voor de aangekondigde Anagram Editor en
// voor eigen archief. Hoe volledig hij is, hangt af van de officiële id's
// (LV2-URI per blok, symbool per parameter) in de catalogus.
//
// Werkt in de browser (window.AnagramPreset) en in Node.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalogus'), require('./validatie'));
  else root.AnagramPreset = factory(root.Catalogus, root.Validatie);
})(typeof self !== 'undefined' ? self : this, function(Catalogus, Validatie) {

  var VERSIE = 1;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  var SYMBOOL = /^:?[A-Za-z_][A-Za-z0-9_]*$/;

  function nieuweUuid() {
    var c = typeof crypto !== 'undefined' ? crypto : null;
    if (c && c.randomUUID) return c.randomUUID().toLowerCase();
    var h = [];
    for (var i = 0; i < 16; i++) h.push(Math.floor(Math.random() * 256));
    h[6] = (h[6] & 0x0f) | 0x40;
    h[8] = (h[8] & 0x3f) | 0x80;
    var s = h.map(function(x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    return s.slice(0, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16) + '-' + s.slice(16, 20) + '-' + s.slice(20);
  }

  // Een LV2-symbool raden uit de parameternaam: "Mid Boost" → "mid_boost".
  function geradenSymbool(naam) {
    var s = String(naam || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!s) s = 'param';
    return /^[0-9]/.test(s) ? 'p_' + s : s;
  }

  // Zet een waarde uit de app om naar een getal zoals het presetformaat dat
  // opslaat. Aanname tot de Editor er is: knoppen in de eenheid van de
  // catalogus (45% → 45), aan/uit als 1/0, keuzes als volgnummer (0, 1, 2…).
  function waardeAlsGetal(def, waarde) {
    var r = Catalogus.controleerWaarde(def, waarde);
    if (!r.ok) return { fout: r.fout };
    if (def.type === 'schakelaar') return { waarde: r.waarde ? 1 : 0 };
    if (def.type === 'keuze' || (def.type === 'knop' && typeof r.waarde === 'string')) {
      var i = (def.opties || []).indexOf(r.waarde);
      if (i === -1) return { fout: 'onbekende keuze' };
      return { waarde: i };
    }
    if (def.type === 'knop' && typeof r.waarde === 'number') return { waarde: r.waarde };
    return { fout: 'tekstwaarde kan niet als getal worden opgeslagen' };
  }

  // Plaatsen in het raster: rij "1" is het hoofdpad; bij parallelle routing
  // komt chain_b op rij "2" en volgt merge_naar op rij "1" na beide paden.
  function posities(scene) {
    var uit = [];
    if (scene.routing === 'parallel' && (scene.chain_b || []).length) {
      var a = scene.chain_a || [], b = scene.chain_b || [];
      a.forEach(function(item, i) { uit.push({ item: item, rij: 1, plek: i + 1 }); });
      b.forEach(function(item, i) { uit.push({ item: item, rij: 2, plek: i + 1 }); });
      var start = Math.max(a.length, b.length);
      (scene.merge_naar || []).forEach(function(item, i) { uit.push({ item: item, rij: 1, plek: start + i + 1 }); });
    } else {
      (scene.chain_a || []).forEach(function(item, i) { uit.push({ item: item, rij: 1, plek: i + 1 }); });
    }
    return uit;
  }

  // scene: een preset (scene) uit de app; catalogus: de bloklijst.
  // opties: { naam, uuid }
  // Geeft { preset, waarschuwingen, volledig, telling } terug.
  function maak(scene, catalogus, opties) {
    opties = opties || {};
    var waarschuwingen = [];
    var telling = { blokken: 0, metUri: 0, parameters: 0, metSymbool: 0 };
    var chains = {};
    var plekPerLabel = {};

    var plekken = posities(scene);
    // Blokken die niet in de keten staan, komen achteraan op rij 1.
    var laatste = plekken.filter(function(p) { return p.rij === 1; }).reduce(function(m, p) { return Math.max(m, p.plek); }, 0);
    (scene.blokken || []).forEach(function(b) {
      var inKeten = plekken.some(function(p) { return Validatie.blokBijKetenItem(scene, p.item) === b; });
      if (!inKeten) plekken.push({ item: b.label || b.blok, rij: 1, plek: ++laatste, losStaand: true });
    });

    plekken.forEach(function(p) {
      var b = Validatie.blokBijKetenItem(scene, p.item);
      if (!b) { waarschuwingen.push('"' + p.item + '" staat in de keten maar is geen blok; overgeslagen'); return; }
      if (plekPerLabel[b.label || b.blok]) return;
      var def = Catalogus.vindBlok(catalogus || [], b.blok);
      telling.blokken++;
      var blok = { enabled: true, parameters: {}, uri: '' };
      if (def && def.uri) { blok.uri = def.uri; telling.metUri++; }
      else {
        blok.uri = 'urn:tone-architect:onbekend:' + Catalogus.slug(b.blok || b.label);
        waarschuwingen.push((b.label || b.blok) + ': officiële id (LV2-URI) onbekend; tijdelijke id gebruikt');
      }
      var nr = 0;
      var props = {};
      var propNr = 0;
      (b.instellingen || []).forEach(function(ins) {
        var pdef = def ? Catalogus.vindParameter(def, ins.parameter) : null;
        if (!pdef) { waarschuwingen.push((b.label || b.blok) + ': parameter "' + ins.parameter + '" staat niet in de catalogus; overgeslagen'); return; }
        // Bestandskeuzes (IR's) zijn in het formaat een "property" met bestandsnaam.
        if (/\b(ir|file|bestand)\b/i.test(pdef.naam) && pdef.type === 'keuze') {
          var keuze = Catalogus.controleerWaarde(pdef, ins.waarde);
          props[String(++propNr)] = { name: pdef.naam, uri: 'urn:tone-architect:bestand', value: keuze.ok ? keuze.waarde : String(ins.waarde) };
          waarschuwingen.push((b.label || b.blok) + ': ' + pdef.naam + ' is een bestandskeuze; het juiste pad op de Anagram is nog onbekend');
          return;
        }
        var w = waardeAlsGetal(pdef, ins.waarde);
        if (w.fout) { waarschuwingen.push((b.label || b.blok) + ' → ' + pdef.naam + ': ' + w.fout + '; overgeslagen'); return; }
        telling.parameters++;
        var symbool = pdef.symbol;
        if (symbool) telling.metSymbool++;
        else symbool = geradenSymbool(pdef.naam);
        blok.parameters[String(++nr)] = { name: pdef.naam, symbol: symbool, value: w.waarde };
      });
      if (propNr) blok.properties = props;
      var rij = String(p.rij);
      chains[rij] = chains[rij] || { blocks: {} };
      chains[rij].blocks[String(p.plek)] = blok;
      plekPerLabel[b.label || b.blok] = { rij: rij, plek: String(p.plek), def: def, blok: blok };
    });

    // Songdelen → scènes. Het deel zonder footswitch is de basisstand van de
    // preset; de andere delen worden scène 1, 2, 3… met alleen de wijzigingen.
    var sceneNames = {};
    var sceneNr = 0;
    (scene.songdelen || []).forEach(function(d) {
      var basis = !String(d.footswitch || '').trim();
      var nummer = basis ? null : String(++sceneNr);
      if (nummer) sceneNames[nummer] = String(d.deel || 'Scène ' + nummer).slice(0, 40);
      (d.wijzigingen || []).forEach(function(w) {
        var b = Validatie.blokBijKetenItem(scene, w.label);
        var plek = b && plekPerLabel[b.label || b.blok];
        if (!plek) return;
        var item;
        if (w.actie === 'aan' || w.actie === 'uit') {
          if (basis) { plek.blok.enabled = w.actie === 'aan'; return; }
          item = { symbol: ':bypass', value: w.actie === 'uit' ? 1 : 0 };
        } else {
          var pdef = plek.def && Catalogus.vindParameter(plek.def, w.parameter);
          var g = pdef && waardeAlsGetal(pdef, w.waarde);
          if (!g || g.fout) { waarschuwingen.push('Songdeel "' + d.deel + '": ' + w.parameter + ' overgeslagen'); return; }
          item = { symbol: pdef.symbol || geradenSymbool(pdef.naam), value: g.waarde };
          if (basis) {
            Object.keys(plek.blok.parameters).forEach(function(k) { if (plek.blok.parameters[k].symbol === item.symbol) plek.blok.parameters[k].value = item.value; });
            return;
          }
        }
        var scenes = plek.blok.scenes = plek.blok.scenes || {};
        scenes[nummer] = scenes[nummer] || { parameters: [], properties: [] };
        scenes[nummer].parameters.push(item);
      });
    });

    if (telling.parameters > telling.metSymbool) {
      waarschuwingen.push((telling.parameters - telling.metSymbool) + ' van de ' + telling.parameters + ' parameters hebben nog geen officieel symbool; het symbool is afgeleid van de naam');
    }

    var preset = {
      preset: {
        bindings: {},
        chains: chains,
        name: String(opties.naam || 'Tone Architect').slice(0, 64),
        scene: 0,
        sceneNames: sceneNames,
        uuid: opties.uuid || nieuweUuid()
      },
      type: 'preset',
      version: VERSIE
    };
    var volledig = telling.blokken > 0 && telling.metUri === telling.blokken && telling.metSymbool === telling.parameters
      && !waarschuwingen.some(function(w) { return /overgeslagen|bestandskeuze/.test(w); });
    return { preset: preset, waarschuwingen: waarschuwingen, volledig: volledig, telling: telling };
  }

  // ---------- controle volgens PRESET-FORMAT.md (versie 1) ----------
  function isObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function isGetal(x) { return typeof x === 'number' && isFinite(x); }
  function nummerSleutels(obj) { return Object.keys(obj).every(function(k) { return /^[1-9][0-9]*$/.test(k); }); }
  function zonderGaten(obj) {
    var ks = Object.keys(obj).map(Number).sort(function(a, b) { return a - b; });
    return ks.every(function(k, i) { return k === i + 1; });
  }

  // Geeft een lijst met fouten terug (leeg = geldig).
  function controleer(json) {
    var f = [];
    if (!isObject(json)) return ['het bestand is geen JSON-object'];
    if (!isObject(json.preset)) f.push('"preset" (object) ontbreekt');
    if (json.type !== 'preset') f.push('"type" moet "preset" zijn');
    if (!Number.isInteger(json.version) || json.version < 1) f.push('"version" moet een geheel getal >= 1 zijn');
    else if (json.version > VERSIE) f.push('"version" ' + json.version + ' is nieuwer dan ondersteund (' + VERSIE + ')');
    var p = json.preset;
    if (!isObject(p)) return f;

    if (p.name !== undefined && typeof p.name !== 'string') f.push('"name" moet tekst zijn');
    if (p.scene !== undefined && (!Number.isInteger(p.scene) || p.scene < 0)) f.push('"scene" moet een geheel getal >= 0 zijn');
    if (p.uuid !== undefined && (typeof p.uuid !== 'string' || !UUID.test(p.uuid))) f.push('"uuid" moet een UUIDv4 in kleine letters zijn');
    if (p.sceneNames !== undefined) {
      if (!isObject(p.sceneNames) || !nummerSleutels(p.sceneNames)) f.push('"sceneNames" moet een object met nummers als sleutel zijn');
      else Object.keys(p.sceneNames).forEach(function(k) { if (typeof p.sceneNames[k] !== 'string') f.push('sceneNames.' + k + ' moet tekst zijn'); });
    }
    if (p.background !== undefined && (!isObject(p.background) || !Number.isInteger(p.background.color) || typeof p.background.style !== 'string')) {
      f.push('"background" moet color (geheel getal) en style (tekst) hebben');
    }
    if (p.bindings !== undefined) {
      if (!isObject(p.bindings)) f.push('"bindings" moet een object zijn');
      else Object.keys(p.bindings).forEach(function(act) {
        var b = p.bindings[act];
        if (!isObject(b)) { f.push('bindings.' + act + ' moet een object zijn'); return; }
        (b.parameters || []).forEach(function(x, i) {
          if (!Number.isInteger(x.block) || x.block < 1 || !Number.isInteger(x.row) || x.row < 1 || typeof x.symbol !== 'string') {
            f.push('bindings.' + act + '.parameters[' + i + '] mist block, row of symbol');
          }
          if ((x.min === undefined) !== (x.max === undefined)) f.push('bindings.' + act + '.parameters[' + i + ']: min en max horen samen');
        });
        if (b.value !== undefined && (!isGetal(b.value) || b.value < 0 || b.value > 1)) f.push('bindings.' + act + '.value moet tussen 0 en 1 liggen');
      });
    }
    if (p.chains !== undefined) {
      if (!isObject(p.chains) || !nummerSleutels(p.chains)) { f.push('"chains" moet rijen met nummers als sleutel hebben'); return f; }
      Object.keys(p.chains).forEach(function(rij) {
        var r = p.chains[rij];
        if (!isObject(r) || !isObject(r.blocks) || !nummerSleutels(r.blocks)) { f.push('chains.' + rij + '.blocks moet blokken met nummers als sleutel hebben'); return; }
        Object.keys(r.blocks).forEach(function(nr) {
          var b = r.blocks[nr], waar = 'chains.' + rij + '.blocks.' + nr;
          if (!isObject(b)) { f.push(waar + ' moet een object zijn'); return; }
          if (typeof b.uri !== 'string' || !b.uri) f.push(waar + ': "uri" ontbreekt');
          if (b.enabled !== undefined && typeof b.enabled !== 'boolean') f.push(waar + ': "enabled" moet true/false zijn');
          if (b.quickpot !== undefined && typeof b.quickpot !== 'string') f.push(waar + ': "quickpot" moet tekst zijn');
          ['parameters', 'properties'].forEach(function(soort) {
            var lijst = b[soort];
            if (lijst === undefined) return;
            if (!isObject(lijst) || !nummerSleutels(lijst) || !zonderGaten(lijst)) { f.push(waar + '.' + soort + ' moet genummerd zijn vanaf 1, zonder gaten'); return; }
            Object.keys(lijst).forEach(function(k) {
              var x = lijst[k];
              if (soort === 'parameters' && (!isObject(x) || typeof x.symbol !== 'string' || !SYMBOOL.test(x.symbol) || !isGetal(x.value))) f.push(waar + '.parameters.' + k + ' moet een geldig symbool en een getal hebben');
              if (soort === 'properties' && (!isObject(x) || typeof x.uri !== 'string' || typeof x.value !== 'string')) f.push(waar + '.properties.' + k + ' moet uri en value (tekst) hebben');
            });
          });
          if (b.scenes !== undefined) {
            if (!isObject(b.scenes) || !nummerSleutels(b.scenes)) { f.push(waar + '.scenes moet scènes met nummers als sleutel hebben'); return; }
            Object.keys(b.scenes).forEach(function(s) {
              var sc = b.scenes[s];
              if (!isObject(sc) || !Array.isArray(sc.parameters || []) || !Array.isArray(sc.properties || [])) { f.push(waar + '.scenes.' + s + ' moet lijsten parameters en properties hebben'); return; }
              (sc.parameters || []).forEach(function(x, i) {
                if (!isObject(x) || typeof x.symbol !== 'string' || !isGetal(x.value)) f.push(waar + '.scenes.' + s + '.parameters[' + i + '] moet symbol en value hebben');
              });
            });
          }
        });
      });
    }
    return f;
  }

  return { VERSIE: VERSIE, maak: maak, controleer: controleer, geradenSymbool: geradenSymbool, waardeAlsGetal: waardeAlsGetal, nieuweUuid: nieuweUuid };
});
