// Controle van een preset (scene) tegen de blokcatalogus: bestaan de blokken
// en parameters, liggen waarden binnen bereik, klopt de signaalketen.
// Werkt in de browser (window.Validatie) en in Node.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalogus'));
  else root.Validatie = factory(root.Catalogus);
})(typeof self !== 'undefined' ? self : this, function(Catalogus) {

  function kopie(x) { return JSON.parse(JSON.stringify(x)); }

  function ketenItems(scene) {
    return [].concat(scene.chain_a || [], scene.chain_b || [], scene.merge_naar || []);
  }

  // Zoekt het blok in de scene bij een keten-item (label, of anders bloknaam).
  function blokBijKetenItem(scene, item) {
    var s = Catalogus.slug(item);
    return (scene.blokken || []).find(function(b) { return Catalogus.slug(b.label) === s; })
      || (scene.blokken || []).find(function(b) { return Catalogus.slug(b.blok) === s; })
      || null;
  }

  // Geeft { fouten, waarschuwingen } terug. Fouten zijn dingen die Claude moet
  // repareren; waarschuwingen zijn alleen ter informatie.
  // opties.volumeBlok: naam van het blok dat de keten moet afsluiten.
  function controleer(scene, catalogus, opties) {
    opties = opties || {};
    var fouten = [], waarschuwingen = [];
    var labels = {};

    (scene.blokken || []).forEach(function(b, i) {
      var waar = b.label || b.blok || ('blok ' + (i + 1));
      var lk = Catalogus.slug(b.label || b.blok);
      if (labels[lk]) fouten.push({ soort: 'label', blok: waar, melding: 'label "' + waar + '" komt dubbel voor; geef elk blok een uniek label' });
      labels[lk] = true;

      var def = Catalogus.vindBlok(catalogus, b.blok);
      if (!def) { fouten.push({ soort: 'blok', blok: waar, melding: 'blok "' + b.blok + '" bestaat niet in de catalogus' }); return; }

      var gezien = {};
      (b.instellingen || []).forEach(function(ins) {
        var p = Catalogus.vindParameter(def, ins.parameter);
        if (!p) {
          fouten.push({ soort: 'parameter', blok: waar, parameter: ins.parameter, melding: def.naam + ' heeft geen parameter "' + ins.parameter + '" (wel: ' + def.parameters.map(function(x) { return x.naam; }).join(', ') + ')' });
          return;
        }
        if (gezien[p.naam]) waarschuwingen.push({ soort: 'dubbel', blok: waar, parameter: p.naam, melding: p.naam + ' staat dubbel ingesteld' });
        gezien[p.naam] = true;
        var r = Catalogus.controleerWaarde(p, ins.waarde);
        if (!r.ok) fouten.push({ soort: 'waarde', blok: waar, parameter: p.naam, waarde: ins.waarde, melding: waar + ' → ' + p.naam + ' = "' + ins.waarde + '": ' + r.fout, begrensd: r.begrensd, eenheid: p.eenheid });
      });
    });

    var items = ketenItems(scene);
    items.forEach(function(item) {
      if (!blokBijKetenItem(scene, item)) fouten.push({ soort: 'keten', blok: item, melding: 'de signaalketen noemt "' + item + '", maar dat blok staat niet in de lijst met blokken' });
    });
    (scene.blokken || []).forEach(function(b) {
      var inKeten = items.some(function(item) { return blokBijKetenItem(scene, item) === b; });
      if (!inKeten) waarschuwingen.push({ soort: 'keten', blok: b.label || b.blok, melding: (b.label || b.blok) + ' staat niet in de signaalketen' });
    });
    if (scene.routing === 'parallel' && !(scene.chain_b || []).length) {
      fouten.push({ soort: 'keten', melding: 'routing is parallel, maar chain_b is leeg' });
    }
    (scene.songdelen || []).forEach(function(d) {
      (d.wijzigingen || []).forEach(function(w) {
        var b = blokBijKetenItem(scene, w.label);
        if (!b) { fouten.push({ soort: 'songdeel', melding: 'songdeel "' + d.deel + '" verwijst naar "' + w.label + '", maar dat blok staat niet in de preset' }); return; }
        if (w.actie !== 'wijzig') return;
        var def = Catalogus.vindBlok(catalogus, b.blok);
        var p = def && Catalogus.vindParameter(def, w.parameter);
        if (!p) { fouten.push({ soort: 'songdeel', melding: 'songdeel "' + d.deel + '": ' + b.blok + ' heeft geen parameter "' + w.parameter + '"' }); return; }
        var r = Catalogus.controleerWaarde(p, w.waarde);
        if (!r.ok) fouten.push({ soort: 'songdeel', melding: 'songdeel "' + d.deel + '": ' + p.naam + ' = "' + w.waarde + '": ' + r.fout });
      });
    });
    if (opties.volumeBlok) {
      var laatste = scene.routing === 'parallel' && (scene.merge_naar || []).length ? scene.merge_naar[scene.merge_naar.length - 1] : (scene.chain_a || [])[(scene.chain_a || []).length - 1];
      var lb = laatste && blokBijKetenItem(scene, laatste);
      if (!lb || Catalogus.slug(lb.blok) !== Catalogus.slug(opties.volumeBlok)) {
        fouten.push({ soort: 'keten', melding: 'sluit de signaalketen af met het blok "' + opties.volumeBlok + '" als volumeregelaar' });
      }
    }
    return { fouten: fouten, waarschuwingen: waarschuwingen };
  }

  // Lost wat nog fout is zelf op: waarden begrenzen, onbekende parameters en
  // keten-verwijzingen weghalen, waarden netjes noteren. Geeft { scene, aanpassingen }.
  function herstel(scene, catalogus) {
    var s = kopie(scene);
    var aanpassingen = [];
    s.blokken = (s.blokken || []).filter(function(b) {
      var def = Catalogus.vindBlok(catalogus, b.blok);
      if (!def) { aanpassingen.push('Blok "' + b.blok + '" verwijderd (bestaat niet)'); return false; }
      b.blok = def.naam;
      if (!b.label) b.label = def.naam;
      b.instellingen = (b.instellingen || []).filter(function(ins) {
        var p = Catalogus.vindParameter(def, ins.parameter);
        if (!p) { aanpassingen.push((b.label) + ': parameter "' + ins.parameter + '" verwijderd (bestaat niet)'); return false; }
        ins.parameter = p.naam;
        var r = Catalogus.controleerWaarde(p, ins.waarde);
        if (r.ok) { ins.waarde = r.tekst; return true; }
        if (r.begrensd != null) {
          var nieuw = Catalogus.controleerWaarde(p, String(r.begrensd) + (p.eenheid && p.eenheid !== ':1' ? ' ' + p.eenheid : (p.eenheid === ':1' ? ':1' : '')));
          aanpassingen.push(b.label + ': ' + p.naam + ' ' + ins.waarde + ' → ' + nieuw.tekst + ' (buiten bereik)');
          ins.waarde = nieuw.tekst;
          return true;
        }
        aanpassingen.push(b.label + ': ' + p.naam + ' "' + ins.waarde + '" verwijderd (' + r.fout + ')');
        return false;
      });
      return true;
    });
    ['chain_a', 'chain_b', 'merge_naar'].forEach(function(k) {
      s[k] = (s[k] || []).filter(function(item) {
        var ok = !!blokBijKetenItem(s, item);
        if (!ok) aanpassingen.push('"' + item + '" uit de signaalketen gehaald (geen blok)');
        return ok;
      });
    });
    if (s.routing === 'parallel' && !s.chain_b.length) s.routing = 'serieel';
    (s.songdelen || []).forEach(function(d) {
      d.wijzigingen = (d.wijzigingen || []).filter(function(w) {
        var b = blokBijKetenItem(s, w.label);
        if (!b) { aanpassingen.push('Songdeel "' + d.deel + '": verwijzing naar "' + w.label + '" verwijderd'); return false; }
        if (w.actie !== 'wijzig') return true;
        var def = Catalogus.vindBlok(catalogus, b.blok);
        var p = def && Catalogus.vindParameter(def, w.parameter);
        var r = p && Catalogus.controleerWaarde(p, w.waarde);
        if (r && r.ok) { w.parameter = p.naam; w.waarde = r.tekst; return true; }
        aanpassingen.push('Songdeel "' + d.deel + '": ' + w.parameter + ' "' + w.waarde + '" verwijderd');
        return false;
      });
    });
    return { scene: s, aanpassingen: aanpassingen };
  }

  function foutTekst(fouten) {
    return fouten.map(function(f, i) { return (i + 1) + '. ' + f.melding; }).join('\n');
  }

  return { controleer: controleer, herstel: herstel, foutTekst: foutTekst, blokBijKetenItem: blokBijKetenItem };
});
