// Presetbibliotheek: opslaan (met versiegeschiedenis), laden, verwijderen,
// zoeken/filteren op tekst, bas, beoordeling en tags, en import/export.

var presetsCache = {};
var MAX_VERSIES = 10;
function kloon(x) { return JSON.parse(JSON.stringify(x)); }
var filters = { zoek: '', bas: '', beoordeling: '', tag: '' };

function presetNaarHuidig(p) {
  return {
    artiest: p.artist, song: p.song, scenes: kloon(Legacy.scenesUitPreset(p)), onderzoek: p.onderzoek || null,
    presetId: p.id, label: p.label || '', gewijzigd: false
  };
}

function basLabel(scenes) {
  return scenes.map(function(s) { var b = basVan(s.bas_id); return b ? b.naam : s.bas_id; }).join(' + ');
}

function bewaarPreset(preset) {
  return apiJson('/api/presets', { json: { preset: preset } }).then(function() {
    presetsCache[preset.id] = preset;
    renderBibliotheek();
    return preset;
  });
}

function zetOpslaanKnop() {
  var btn = document.getElementById('saveBtn');
  if (!btn || btn.disabled) return;
  var bestaand = huidig && huidig.presetId && presetsCache[huidig.presetId];
  var tekst = bestaand ? (huidig.gewijzigd ? t('wijzigingenOpslaan') : t('opgeslagenKort')) : t('presetOpslaan');
  btn.innerHTML = '<span>&#9632;</span> ' + esc(tekst);
}

function savePreset() {
  if (!huidig) { alert(t('geenPreset')); return Promise.resolve(null); }
  var btn = document.getElementById('saveBtn');
  var bestaand = huidig.presetId && presetsCache[huidig.presetId];
  var preset;
  if (bestaand) {
    preset = JSON.parse(JSON.stringify(bestaand));
    if (JSON.stringify(Legacy.scenesUitPreset(bestaand)) !== JSON.stringify(huidig.scenes)) {
      preset.versies = [{ datum: bestaand.bijgewerkt || bestaand.datum, bron: huidig.laatsteBron || '', scenes: Legacy.scenesUitPreset(bestaand) }]
        .concat(bestaand.versies || []).slice(0, MAX_VERSIES);
    }
    delete preset.content; delete preset.sceneSpector; delete preset.scenePbass;
    preset.versie = 3;
    preset.scenes = kloon(huidig.scenes);
    preset.onderzoek = huidig.onderzoek || preset.onderzoek || null;
    preset.bass = basLabel(huidig.scenes);
    preset.bijgewerkt = datumTekst();
  } else {
    var bestaatAl = Object.keys(presetsCache).some(function(k) {
      return presetsCache[k].artist === huidig.artiest && presetsCache[k].song === huidig.song;
    });
    var label = '';
    if (bestaatAl) {
      var inp = window.prompt(t('bestaatAlPrompt'), '');
      if (inp === null) return Promise.resolve(null);
      label = inp.trim();
    }
    preset = {
      id: Date.now().toString(), versie: 3, artist: huidig.artiest, song: huidig.song, bass: basLabel(huidig.scenes),
      scenes: kloon(huidig.scenes), onderzoek: huidig.onderzoek || null, datum: datumTekst(), label: label, tags: [], versies: []
    };
  }
  btn.disabled = true; btn.textContent = t('opslaanBezig');
  return bewaarPreset(preset).then(function(p) {
    huidig.presetId = p.id;
    huidig.label = p.label || '';
    huidig.gewijzigd = false;
    trackEvent('save', { bass: huidig.scenes.length > 1 ? 'beide' : huidig.scenes[0].bas_id });
    btn.textContent = t('opgeslagen');
    setTimeout(function() { btn.disabled = false; zetOpslaanKnop(); }, 1500);
    if (typeof renderActies === 'function') renderActies();
    return p;
  }).catch(function(e) {
    alert(t('fout') + e.message);
    btn.disabled = false; zetOpslaanKnop();
    return null;
  });
}

function loadPreset(id) {
  var p = presetsCache[id];
  if (!p || bezig) return;
  huidig = presetNaarHuidig(p);
  activeScene = huidig.scenes[0].bas_id;
  chatVerzoeken = [];
  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('chatMessages').innerHTML = '';
  renderHuidig();
  zetOpslaanKnop();
  if (typeof renderActies === 'function') renderActies();
  addMsg('assistant', t('presetGeladen'));
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
}

function deletePreset(id) {
  if (!window.confirm(t('verwijderenVraag'))) return;
  apiJson('/api/presets', { method: 'DELETE', json: { id: id } })
    .then(function() {
      delete presetsCache[id];
      if (huidig && huidig.presetId === id) { huidig.presetId = null; zetOpslaanKnop(); if (typeof renderActies === 'function') renderActies(); }
      renderBibliotheek();
    })
    .catch(function(e) { alert(t('fout') + e.message); });
}

// ---------- zoeken en filteren ----------
function presetBassen(p) { return Legacy.scenesUitPreset(p).map(function(s) { return s.bas_id; }); }

function voldoetAanFilters(p) {
  if (filters.zoek) {
    var hooi = [p.artist, p.song, p.label, (p.tags || []).join(' '), p.onderzoek && p.onderzoek.genre].join(' ').toLowerCase();
    if (filters.zoek.toLowerCase().split(/\s+/).some(function(w) { return w && hooi.indexOf(w) === -1; })) return false;
  }
  if (filters.bas && presetBassen(p).indexOf(filters.bas) === -1) return false;
  var score = p.feedback && p.feedback.score;
  if (filters.beoordeling === 'goed' && score !== 1) return false;
  if (filters.beoordeling === 'slecht' && score !== -1) return false;
  if (filters.beoordeling === 'geen' && score) return false;
  if (filters.tag && (p.tags || []).indexOf(filters.tag) === -1) return false;
  return true;
}

function alleTags() {
  var set = {};
  Object.keys(presetsCache).forEach(function(k) { (presetsCache[k].tags || []).forEach(function(tg) { set[tg] = true; }); });
  return Object.keys(set).sort();
}

function renderFilters() {
  var basSel = document.getElementById('filterBas');
  var tagSel = document.getElementById('filterTag');
  if (!basSel) return;
  basSel.innerHTML = '<option value="">' + esc(t('alleBassenFilter')) + '</option>' + RIG.bassen.map(function(b) {
    return '<option value="' + esc(b.id) + '"' + (filters.bas === b.id ? ' selected' : '') + '>' + esc(b.naam) + '</option>';
  }).join('');
  tagSel.innerHTML = '<option value="">' + esc(t('alleTags')) + '</option>' + alleTags().map(function(tg) {
    return '<option value="' + esc(tg) + '"' + (filters.tag === tg ? ' selected' : '') + '>' + esc(tg) + '</option>';
  }).join('');
  var b = document.getElementById('filterBeoordeling');
  b.innerHTML = [['', t('alleBeoordelingen')], ['goed', '👍 ' + t('goed')], ['slecht', '👎 ' + t('slecht')], ['geen', t('nietBeoordeeld')]]
    .map(function(o) { return '<option value="' + o[0] + '"' + (filters.beoordeling === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
}

function renderBibliotheek() {
  var panel = document.getElementById('savedPanel');
  var list = document.getElementById('savedList');
  var alle = Object.keys(presetsCache);
  panel.classList.remove('hidden');
  renderFilters();
  var keys = alle.filter(function(k) { return voldoetAanFilters(presetsCache[k]); })
    .sort(function(a, b) { return String(b).localeCompare(String(a), undefined, { numeric: true }); });
  document.getElementById('savedTeller').textContent = keys.length + ' / ' + alle.length;
  if (!alle.length) { list.innerHTML = '<p class="leeg-melding">' + esc(t('nogGeenPresets')) + '</p>'; return; }
  list.innerHTML = keys.map(function(id) {
    var p = presetsCache[id];
    var n = Legacy.scenesUitPreset(p).length;
    var sub = (p.bass || '').split('(')[0].trim() + ' · ' + (p.bijgewerkt || p.datum || '') + (p.label ? ' · ' + p.label : '');
    var score = p.feedback && p.feedback.score;
    var tags = (p.tags || []).map(function(tg) { return '<span class="tag-chip">' + esc(tg) + '</span>'; }).join('');
    return '<div class="saved-item"><div class="saved-item-header"><div>'
      + '<div class="saved-item-title">' + (score === 1 ? '👍 ' : score === -1 ? '👎 ' : '') + esc(p.artist) + ' — ' + esc(p.song)
      + (n > 1 ? '<span class="dual-badge">' + n + ' SCENES</span>' : '') + '</div>'
      + '<div class="saved-item-date">' + esc(sub) + '</div>' + (tags ? '<div class="tag-rij">' + tags + '</div>' : '')
      + '</div><div class="saved-item-actions">'
      + '<button class="saved-action-btn btn-load" data-actie="laad" data-id="' + esc(id) + '">' + esc(t('laden')) + '</button>'
      + '<button class="saved-action-btn" data-actie="print" data-id="' + esc(id) + '" title="' + esc(t('oefenblad')) + '">&#9113;</button>'
      + '<button class="saved-action-btn btn-delete" data-actie="wis" data-id="' + esc(id) + '">&#10005;</button>'
      + '</div></div></div>';
  }).join('') || '<p class="leeg-melding">' + esc(t('geenResultaten')) + '</p>';
}

document.getElementById('savedList').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-actie]');
  if (!btn) return;
  if (btn.dataset.actie === 'laad') loadPreset(btn.dataset.id);
  if (btn.dataset.actie === 'wis') deletePreset(btn.dataset.id);
  if (btn.dataset.actie === 'print') window.open('/print.html?preset=' + encodeURIComponent(btn.dataset.id), '_blank');
});

['filterZoek', 'filterBas', 'filterBeoordeling', 'filterTag'].forEach(function(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(id === 'filterZoek' ? 'input' : 'change', function() {
    filters = {
      zoek: document.getElementById('filterZoek').value.trim(),
      bas: document.getElementById('filterBas').value,
      beoordeling: document.getElementById('filterBeoordeling').value,
      tag: document.getElementById('filterTag').value
    };
    renderBibliotheek();
  });
});

function laadBibliotheek() {
  apiJson('/api/presets')
    .then(function(d) { presetsCache = d.presets || {}; renderBibliotheek(); })
    .catch(function(e) { console.error('Presets laden mislukt:', e.message); });
}

// ---------- export / import ----------
function download(naam, data) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function bestandsnaam(s) { return String(s || 'preset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'preset'; }

function exporteerAlles() {
  var lijst = Object.keys(presetsCache).map(function(k) { return presetsCache[k]; });
  download('anagram-presets-' + new Date().toISOString().slice(0, 10) + '.json', { type: 'darkglass-anagram-presets', versie: 1, presets: lijst });
}

function importeer(input) {
  var f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  f.text().then(function(tekst) {
    var data = JSON.parse(tekst);
    var lijst = Array.isArray(data) ? data : data.presets ? data.presets : data.preset ? [data.preset] : [data];
    lijst = lijst.filter(function(p) { return p && p.artist && p.song && (p.scenes || p.content || p.sceneSpector); });
    if (!lijst.length) throw new Error(t('importLeeg'));
    var basis = Date.now();
    return lijst.reduce(function(prom, p, i) {
      return prom.then(function() {
        var kopie = JSON.parse(JSON.stringify(p));
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(kopie.id || '') || presetsCache[kopie.id]) kopie.id = String(basis + i);
        return bewaarPreset(kopie);
      });
    }, Promise.resolve()).then(function() { alert(lijst.length + ' ' + t('presetsGeimporteerd')); });
  }).catch(function(e) { alert(t('fout') + e.message); });
}
