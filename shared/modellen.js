// Keuze van AI-model en effort. Eén lijst voor browser (window.Modellen) en
// server (require), zodat de server alleen deze combinaties toestaat.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Modellen = factory();
})(typeof self !== 'undefined' ? self : this, function() {

  // Prijzen in dollars per miljoen tokens (cache-schrijven = 1,25x input, 5 minuten).
  var MODELLEN = [
    { id: 'claude-sonnet-5-5', naam: 'Sonnet 5.5', kort: 'sonnet', prijs: { input: 2.00, output: 10.00, cacheSchrijven: 2.50, cacheLezen: 0.20 } },
    { id: 'claude-opus-5-5', naam: 'Opus 5.5', kort: 'opus', prijs: { input: 4.00, output: 20.00, cacheSchrijven: 5.00, cacheLezen: 0.20 } }
  ];
  var EFFORTS = ['high', 'medium'];
  var STANDAARD = { model: 'claude-sonnet-5-5', effort: 'high' };

  function model(id) {
    return MODELLEN.find(function(m) { return m.id === id; }) || null;
  }

  // Alleen bekende combinaties; anders de standaard (of de opgegeven terugval).
  function kies(id, effort, terugval) {
    var t = terugval || STANDAARD;
    return {
      model: model(id) ? id : t.model,
      effort: EFFORTS.indexOf(effort) !== -1 ? effort : t.effort
    };
  }

  function label(keuze) {
    var m = model(keuze.model);
    return (m ? m.naam : keuze.model) + ' · ' + keuze.effort.charAt(0).toUpperCase() + keuze.effort.slice(1);
  }

  // Alle keuzes voor de dropdown, standaard eerst.
  function opties() {
    var uit = [];
    MODELLEN.forEach(function(m) {
      EFFORTS.forEach(function(e) {
        uit.push({ waarde: m.id + '|' + e, model: m.id, effort: e, kort: m.kort, label: label({ model: m.id, effort: e }) });
      });
    });
    return uit;
  }

  function uitWaarde(waarde) {
    var d = String(waarde || '').split('|');
    return kies(d[0], d[1]);
  }

  return { MODELLEN: MODELLEN, EFFORTS: EFFORTS, STANDAARD: STANDAARD, model: model, kies: kies, label: label, opties: opties, uitWaarde: uitWaarde };
});
