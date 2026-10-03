// Opgeslagen presets: opslaan, laden, verwijderen en de lijst tonen.

var presetsCache = {};

function presetNaarHuidig(p) {
  var scenes = Legacy.scenesUitPreset(p);
  return {
    artiest: p.artist, song: p.song, scenes: scenes, onderzoek: p.onderzoek || null,
    presetId: p.id, label: p.label || ''
  };
}

function basLabel(scenes) {
  return scenes.map(function(s) { var b = basVan(s.bas_id); return b ? b.naam : s.bas_id; }).join(' + ');
}

function savePreset() {
  if (!huidig) { alert(t('geenPreset')); return; }
  var bestaatAl = Object.keys(presetsCache).some(function(k) {
    return presetsCache[k].artist === huidig.artiest && presetsCache[k].song === huidig.song;
  });
  var label = '';
  if (bestaatAl) {
    var inp = window.prompt(t('bestaatAlPrompt'), '');
    if (inp === null) return;
    label = inp.trim();
  }
  var id = Date.now().toString();
  var preset = {
    id: id, versie: 3, artist: huidig.artiest, song: huidig.song, bass: basLabel(huidig.scenes),
    scenes: huidig.scenes, onderzoek: huidig.onderzoek || null, datum: datumTekst(), label: label
  };
  var btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = t('opslaanBezig');
  apiJson('/api/presets', { json: { preset: preset } })
    .then(function() {
      presetsCache[id] = preset;
      huidig.presetId = id;
      huidig.label = label;
      renderBibliotheek();
      trackEvent('save', { bass: huidig.scenes.length > 1 ? 'beide' : huidig.scenes[0].bas_id });
      btn.textContent = t('opgeslagen');
      btn.style.color = 'var(--accent)'; btn.style.borderColor = 'var(--accent)';
      setTimeout(function() {
        btn.innerHTML = '<span>&#9632;</span> <span data-i18n="presetOpslaan">' + esc(t('presetOpslaan')) + '</span>';
        btn.style.color = ''; btn.style.borderColor = ''; btn.disabled = false;
      }, 2000);
    })
    .catch(function(e) { alert(t('fout') + e.message); btn.innerHTML = '<span>&#9632;</span> ' + esc(t('presetOpslaan')); btn.disabled = false; });
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
  addMsg('assistant', t('presetGeladen'));
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
}

function deletePreset(id) {
  if (!window.confirm(t('verwijderenVraag'))) return;
  apiJson('/api/presets', { method: 'DELETE', json: { id: id } })
    .then(function() { delete presetsCache[id]; renderBibliotheek(); })
    .catch(function(e) { alert(t('fout') + e.message); });
}

function renderBibliotheek() {
  var keys = Object.keys(presetsCache).sort(function(a, b) { return b - a; });
  var panel = document.getElementById('savedPanel');
  var list = document.getElementById('savedList');
  if (!keys.length) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  list.innerHTML = keys.map(function(id) {
    var p = presetsCache[id];
    var n = Legacy.scenesUitPreset(p).length;
    var sub = (p.bass || '').split('(')[0].trim() + ' · ' + (p.datum || '') + (p.label ? ' · ' + p.label : '');
    return '<div class="saved-item"><div class="saved-item-header"><div>'
      + '<div class="saved-item-title">' + esc(p.artist) + ' — ' + esc(p.song) + (n > 1 ? '<span class="dual-badge">' + n + ' SCENES</span>' : '') + '</div>'
      + '<div class="saved-item-date">' + esc(sub) + '</div>'
      + '</div><div class="saved-item-actions">'
      + '<button class="saved-action-btn btn-load" data-actie="laad" data-id="' + esc(id) + '">' + esc(t('laden')) + '</button>'
      + '<button class="saved-action-btn btn-delete" data-actie="wis" data-id="' + esc(id) + '">&#10005;</button>'
      + '</div></div></div>';
  }).join('');
}

document.getElementById('savedList').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-actie]');
  if (!btn) return;
  if (btn.dataset.actie === 'laad') loadPreset(btn.dataset.id);
  if (btn.dataset.actie === 'wis') deletePreset(btn.dataset.id);
});

function laadBibliotheek() {
  apiJson('/api/presets')
    .then(function(d) { presetsCache = d.presets || {}; renderBibliotheek(); })
    .catch(function(e) { console.error('Presets laden mislukt:', e.message); });
}
