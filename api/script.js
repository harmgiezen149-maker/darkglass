// =====================
// STATE
// =====================
var selectedBass = 'spector';
var chatHistory = [];
var chatContext = '';
var currentPresetData = null;
// Dual scene state
var isDualMode = false;
var activeScene = 'spector'; // 'spector' of 'pbass'
var sceneData = { spector: null, pbass: null }; // { content, html }

// =====================
// BASS SELECTIE
// =====================
document.querySelectorAll('.bass-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.bass-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    selectedBass = btn.dataset.bass;
  });
});
document.getElementById('artistInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('songInput').focus(); });
document.getElementById('songInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') analyzeTone(); });

// =====================
// SYSTEEM PROMPT
// =====================
var SYSTEM_ANALYZE = 'Je bent een expert in bas-gitaar sound design voor de Darkglass Anagram (KosmOS v1.13). '
  + 'Gebruik ALLEEN de bloknamen en parameters die verderop in deze prompt vermeld staan onder BESCHIKBARE ANAGRAM BLOKKEN. '
  + 'Geef GEEN parameters op die niet in die lijst staan.\n\n'
  + 'Zet ALTIJD de eerste drie regels zo:\n'
  + 'B_SNAAR_VEREIST: ja of nee\n'
  + 'ARTIEST: [correcte officiele artiestnaam]\n'
  + 'SONG: [correcte officiele songtitel]\n\n'
  + 'Structureer je antwoord daarna ALTIJD exact zo:\n\n'
  + '## TONE ANALYSE\n[analyse van de bastone]\n\n'
  + '## SIGNAALCHAIN\n'
  + 'SERIEEL of PARALLEL\n'
  + 'CHAIN_A: Blok1 > Blok2 > Blok3\n'
  + 'CHAIN_B: Blok4 > Blok5 (alleen bij parallel)\n'
  + 'MERGE_NAAR: Blok6 (alleen bij parallel)\n\n'
  + '## BLOKKEN\n\n'
  + '### BLOKNAAM (origineel model)\n'
  + 'INSTELLINGEN:\n'
  + '- Parameternaam: waarde\n'
  + 'UITLEG: een zin waarom\n\n'
  + '## FINE-TUNE TIPS\n[3 concrete tips. Als stemming relevant is, vermeld dan ALLEEN de basstemming (bijv. Drop D, Eb standaard, C# standaard) en niet de gitaarstemming. Let hierbij op welke bas er gekozen is, de spector is standaard in BEADG en de Precision is standaard in EADG]\n\n'
  + 'Antwoord in het Nederlands.';

var SYSTEM_DUAL = SYSTEM_ANALYZE
  + '\n\nDe gebruiker wil presets voor TWEE bassen tegelijk. Genereer twee volledige, aparte presets.'
  + 'Gebruik exact dit formaat:\n\n'
  + '==SCENE_SPECTOR==\n'
  + 'B_SNAAR_VEREIST: ja of nee\n'
  + 'ARTIEST: [naam]\n'
  + 'SONG: [naam]\n'
  + '## TONE ANALYSE\n...\n'
  + '## SIGNAALCHAIN\n...\n'
  + '## BLOKKEN\n...\n'
  + '## FINE-TUNE TIPS\n...\n'
  + '==SCENE_PBASS==\n'
  + 'B_SNAAR_VEREIST: nee\n'
  + 'ARTIEST: [naam]\n'
  + 'SONG: [naam]\n'
  + '## TONE ANALYSE\n...\n'
  + '## SIGNAALCHAIN\n...\n'
  + '## BLOKKEN\n...\n'
  + '## FINE-TUNE TIPS\n...\n\n'
  + 'Beide presets gebruiken dezelfde blokken structuur maar met aangepaste instellingen per bas. '
  + 'Vermeld bij de P-Bass scene of blokken aan of uit moeten staan om de sound werkbaar te maken voor 4 snaren. '
  + 'De Spector is 5-snarig (BEADG, actief, EMG-Hz P/HH), de P-Bass is 4-snarig (EADG, actief, Split-P EMG-Hz).';

// =====================
// ANALYSEER TONE
// =====================
function analyzeTone() {
  var artist = document.getElementById('artistInput').value.trim();
  var song = document.getElementById('songInput').value.trim();
  if (!artist || !song) { alert('Vul artiest en songtitel in.'); return; }

  isDualMode = selectedBass === 'beide';
  activeScene = 'spector';
  sceneData = { spector: null, pbass: null };

  var bassLabel = isDualMode
    ? 'Spector NS Ethos 5 (actief, 5-snarig, EMG-Hz P/HH) EN Fender Precision Bass (actief, 4-snarig, Split-P EMG-Hz)'
    : (selectedBass === 'spector'
        ? 'Spector NS Ethos 5 (actief, 5-snarig, EMG-Hz pickup in P/HH configuratie)'
        : 'Fender Precision Bass (actief, 4-snarig, Split-P EMG-Hz pickup)');

  var btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('btnText').textContent = 'ANALYSEREN...';

  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('outputMeta').textContent =
    artist.toUpperCase() + ' \u2014 ' + song.toUpperCase()
    + (isDualMode ? ' \u00b7 SPECTOR + P-BASS' : ' \u00b7 ' + bassLabel.split('(')[0].trim().toUpperCase());
  document.getElementById('outputContent').innerHTML =
    '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>Bastone analyseren...</p></div>';

  // Scene tabs tonen/verbergen
  if (isDualMode) {
    document.getElementById('sceneTabs').classList.remove('hidden');
    document.getElementById('tabSpector').classList.add('active');
    document.getElementById('tabPbass').classList.remove('active');
  } else {
    document.getElementById('sceneTabs').classList.add('hidden');
  }

  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

  var extra = document.getElementById('extraInput').value.trim();
  var userMsg = isDualMode
    ? 'Ik wil de bastone van "' + song + '" van ' + artist + ' namaken met BEIDE mijn bassen en de Darkglass Anagram. Genereer twee complete presets: een voor de Spector NS Ethos 5 (5-snarig) en een voor de Fender Precision Bass (4-snarig).' + (extra ? '\n\nExtra wensen: ' + extra : '')
    : 'Ik wil de bastone van "' + song + '" van ' + artist + ' namaken met mijn ' + bassLabel + ' en de Darkglass Anagram. Geef me een volledig preset-plan.' + (extra ? '\n\nExtra wensen: ' + extra : '');

  chatHistory = [{ role: 'user', content: userMsg }];
  chatContext = artist + ' - ' + song + (isDualMode ? ' | BEIDE BASSEN' : ' | ' + bassLabel);
  currentPresetData = null;

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: isDualMode ? SYSTEM_DUAL : SYSTEM_ANALYZE })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chatHistory.push({ role: 'assistant', content: d.content });

    // Corrigeer artiest/song
    var correctedArtist = artist, correctedSong = song;
    d.content.split('\n').forEach(function(l) {
      l = l.trim();
      if (l.startsWith('ARTIEST:')) correctedArtist = l.replace('ARTIEST:', '').trim();
      if (l.startsWith('SONG:')) correctedSong = l.replace('SONG:', '').trim();
    });

    if (isDualMode) {
      // Splits response in twee scenes
      var parts = splitDualResponse(d.content);
      sceneData.spector = { content: parts.spector, html: toHtml(parts.spector, 'spector') };
      sceneData.pbass   = { content: parts.pbass,   html: toHtml(parts.pbass, 'pbass') };
      activeScene = 'spector';
      document.getElementById('outputContent').innerHTML = sceneData.spector.html;

      currentPresetData = {
        artist: correctedArtist, song: correctedSong,
        bass: 'Beide bassen',
        isDual: true,
        sceneData: sceneData
      };
    } else {
      var html = toHtml(d.content, selectedBass);
      currentPresetData = { artist: correctedArtist, song: correctedSong, bass: bassLabel, content: d.content, isDual: false };
      document.getElementById('outputContent').innerHTML = html;
    }

    document.getElementById('outputMeta').textContent =
      correctedArtist.toUpperCase() + ' \u2014 ' + correctedSong.toUpperCase()
      + (isDualMode ? ' \u00b7 SPECTOR + P-BASS' : ' \u00b7 ' + bassLabel.split('(')[0].trim().toUpperCase());

    document.getElementById('chatPanel').classList.remove('hidden');
    document.getElementById('chatMessages').innerHTML = '';

    // Scene indicator in chat
    if (isDualMode) {
      document.getElementById('sceneIndicator').classList.remove('hidden');
      document.getElementById('sceneIndicator').textContent = 'Chat past de actieve scene aan: SCENE 1 \u2014 SPECTOR';
    } else {
      document.getElementById('sceneIndicator').classList.add('hidden');
    }

    addMsg('assistant', isDualMode
      ? 'Beide presets klaar! Gebruik de tabs om te wisselen. De chat past de actieve scene aan.'
      : 'Preset klaar! Heb je vragen of wil je de sound verder verfijnen?');
    document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
  })
  .catch(function(e) {
    document.getElementById('outputContent').innerHTML = '<p style="color:var(--accent2)">Fout: ' + e.message + '</p>';
  })
  .finally(function() {
    btn.disabled = false;
    document.getElementById('btnText').textContent = 'ANALYSEER TONE';
  });
}

// =====================
// SCENE WISSELEN
// =====================
function switchScene(scene) {
  if (!isDualMode || !sceneData[scene]) return;
  activeScene = scene;

  document.getElementById('tabSpector').classList.toggle('active', scene === 'spector');
  document.getElementById('tabPbass').classList.toggle('active', scene === 'pbass');
  document.getElementById('outputContent').innerHTML = sceneData[scene].html;

  var sceneLabel = scene === 'spector' ? 'SCENE 1 \u2014 SPECTOR' : 'SCENE 2 \u2014 P-BASS';
  document.getElementById('sceneIndicator').textContent = 'Chat past de actieve scene aan: ' + sceneLabel;

  // Reset chat context naar actieve scene
  chatHistory = [
    { role: 'user', content: chatHistory[0] ? chatHistory[0].content : '' },
    { role: 'assistant', content: sceneData[scene].content }
  ];
}

// =====================
// DUAL RESPONSE SPLITTER
// =====================
function splitDualResponse(text) {
  var spectorIdx = text.indexOf('==SCENE_SPECTOR==');
  var pbassIdx   = text.indexOf('==SCENE_PBASS==');

  var spectorText = '', pbassText = '';

  if (spectorIdx !== -1 && pbassIdx !== -1) {
    spectorText = text.substring(spectorIdx + '==SCENE_SPECTOR=='.length, pbassIdx).trim();
    pbassText   = text.substring(pbassIdx   + '==SCENE_PBASS=='.length).trim();
  } else {
    // Fallback: als markers ontbreken, gebruik de hele tekst voor beide
    spectorText = text;
    pbassText   = text;
  }
  return { spector: spectorText, pbass: pbassText };
}

// =====================
// CHAT
// =====================
function sendChat() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });
  addMsg('assistant', 'Preset wordt bijgewerkt...');

  document.getElementById('outputContent').innerHTML =
    '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>Preset bijwerken...</p></div>';
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

  var bassForChat = isDualMode
    ? (activeScene === 'spector'
        ? 'Spector NS Ethos 5 (actief, 5-snarig, EMG-Hz P/HH)'
        : 'Fender Precision Bass (actief, 4-snarig, Split-P EMG-Hz)')
    : (selectedBass === 'spector'
        ? 'Spector NS Ethos 5 (actief, 5-snarig, EMG-Hz P/HH)'
        : 'Fender Precision Bass (actief, 4-snarig, Split-P EMG-Hz)');

  var systemChat = SYSTEM_ANALYZE
    + '\n\nDe gebruiker verfijnt de preset voor: ' + bassForChat + '. '
    + 'Genereer een VOLLEDIG NIEUW bijgewerkt preset-plan in exact hetzelfde formaat. Geen extra uitleg buiten het preset-plan.';

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: systemChat })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chatHistory.push({ role: 'assistant', content: d.content });

    var html = toHtml(d.content, isDualMode ? activeScene : selectedBass);
    document.getElementById('outputContent').innerHTML = html;

    if (isDualMode) {
      sceneData[activeScene] = { content: d.content, html: html };
      if (currentPresetData) currentPresetData.sceneData = sceneData;
    } else {
      if (currentPresetData) currentPresetData.content = d.content;
    }

    var lastMsg = document.getElementById('chatMessages').lastElementChild;
    if (lastMsg) { var b = lastMsg.querySelector('.msg-bubble'); if (b) b.innerHTML = '\u2713 Preset bijgewerkt.'; }
    document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
  })
  .catch(function(e) {
    document.getElementById('outputContent').innerHTML = '<p style="color:var(--accent2)">Fout: ' + e.message + '</p>';
    var lastMsg = document.getElementById('chatMessages').lastElementChild;
    if (lastMsg) { var b = lastMsg.querySelector('.msg-bubble'); if (b) b.textContent = 'Fout: ' + e.message; }
  });
}

function addMsg(role, text, id) {
  var c = document.getElementById('chatMessages');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  if (id) d.id = id;
  d.innerHTML = '<span class="msg-role">' + (role === 'user' ? 'JIJ' : 'ANAGRAM AI') + '</span>'
    + '<div class="msg-bubble">' + toHtmlSimple(text) + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// =====================
// OPSLAAN & LADEN
// =====================
var presetsCache = {};

function savePreset() {
  if (!currentPresetData) { alert('Geen preset om op te slaan.'); return; }
  var id = Date.now().toString();
  var datum = new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  var bestaatAl = false;
  for (var key in presetsCache) {
    if (presetsCache[key].artist === currentPresetData.artist && presetsCache[key].song === currentPresetData.song) { bestaatAl = true; break; }
  }
  var label = '';
  if (bestaatAl) {
    var inp = window.prompt('Er bestaat al een preset voor dit nummer.\nGeef 2-3 steekwoorden voor deze versie:', '');
    if (inp === null) return;
    label = inp.trim();
  }

  var preset = {
    id: id,
    artist: currentPresetData.artist,
    song: currentPresetData.song,
    bass: currentPresetData.bass,
    isDual: currentPresetData.isDual || false,
    content: currentPresetData.isDual ? null : currentPresetData.content,
    sceneSpector: currentPresetData.isDual ? currentPresetData.sceneData.spector.content : null,
    scenePbass:   currentPresetData.isDual ? currentPresetData.sceneData.pbass.content   : null,
    datum: datum,
    label: label
  };

  var btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = 'OPSLAAN...';
  fetch('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preset: preset }) })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    presetsCache[id] = preset;
    renderSavedPanel();
    btn.textContent = '\u2713 OPGESLAGEN';
    btn.style.color = 'var(--accent)'; btn.style.borderColor = 'var(--accent)';
    setTimeout(function() { btn.innerHTML = '<span>&#9632;</span> PRESET OPSLAAN'; btn.style.color = ''; btn.style.borderColor = ''; btn.disabled = false; }, 2000);
  })
  .catch(function(e) { alert('Opslaan mislukt: ' + e.message); btn.innerHTML = '<span>&#9632;</span> PRESET OPSLAAN'; btn.disabled = false; });
}

function loadPreset(id) {
  var p = presetsCache[id]; if (!p) return;

  isDualMode = p.isDual || false;
  activeScene = 'spector';

  document.getElementById('outputMeta').textContent = p.artist.toUpperCase() + ' \u2014 ' + p.song.toUpperCase() + ' \u00b7 ' + p.bass.toUpperCase();

  if (isDualMode && p.sceneSpector && p.scenePbass) {
    sceneData.spector = { content: p.sceneSpector, html: toHtml(p.sceneSpector, 'spector') };
    sceneData.pbass   = { content: p.scenePbass,   html: toHtml(p.scenePbass, 'pbass') };
    document.getElementById('sceneTabs').classList.remove('hidden');
    document.getElementById('tabSpector').classList.add('active');
    document.getElementById('tabPbass').classList.remove('active');
    document.getElementById('outputContent').innerHTML = sceneData.spector.html;
    currentPresetData = { artist: p.artist, song: p.song, bass: p.bass, isDual: true, sceneData: sceneData };
    document.getElementById('sceneIndicator').classList.remove('hidden');
    document.getElementById('sceneIndicator').textContent = 'Chat past de actieve scene aan: SCENE 1 \u2014 SPECTOR';
  } else {
    document.getElementById('sceneTabs').classList.add('hidden');
    document.getElementById('sceneIndicator').classList.add('hidden');
    document.getElementById('outputContent').innerHTML = toHtml(p.content || '', 'spector');
    currentPresetData = { artist: p.artist, song: p.song, bass: p.bass, content: p.content, isDual: false };
  }

  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('chatMessages').innerHTML = '';
  chatHistory = [];
  chatContext = p.artist + ' - ' + p.song + ' | ' + p.bass;
  addMsg('assistant', 'Preset geladen! Wil je nog aanpassingen maken?');
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
}

function deletePreset(id) {
  if (!window.confirm('Preset verwijderen?')) return;
  fetch('/api/presets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) })
  .then(function(r) { return r.json(); })
  .then(function(d) { if (d.error) throw new Error(d.error); delete presetsCache[id]; renderSavedPanel(); })
  .catch(function(e) { alert('Verwijderen mislukt: ' + e.message); });
}

function renderSavedPanel() {
  var keys = Object.keys(presetsCache).sort(function(a, b) { return b - a; });
  var panel = document.getElementById('savedPanel');
  var list = document.getElementById('savedList');
  if (keys.length === 0) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  list.innerHTML = keys.map(function(id) {
    var p = presetsCache[id];
    var subtitle = p.bass + ' \u00b7 ' + p.datum;
    if (p.label) subtitle += ' \u00b7 ' + p.label;
    var dualBadge = p.isDual ? '<span style="font-size:0.55rem;color:var(--accent2);border:1px solid var(--accent2);padding:0.1rem 0.35rem;border-radius:2px;margin-left:0.5rem;font-family:var(--font-a);letter-spacing:0.1em">2 SCENES</span>' : '';
    return '<div class="saved-item"><div class="saved-item-header"><div>'
      + '<div class="saved-item-title">' + p.artist + ' \u2014 ' + p.song + dualBadge + '</div>'
      + '<div class="saved-item-date">' + subtitle + '</div>'
      + '</div><div class="saved-item-actions">'
      + '<button class="saved-action-btn btn-load" onclick="loadPreset(\'' + id + '\')">LADEN</button>'
      + '<button class="saved-action-btn btn-delete" onclick="deletePreset(\'' + id + '\')">&#10005;</button>'
      + '</div></div></div>';
  }).join('');
}

function laadAllePresets() {
  fetch('/api/presets')
  .then(function(r) { return r.json(); })
  .then(function(d) { presetsCache = d.presets || {}; renderSavedPanel(); })
  .catch(function(e) { console.error('Presets laden mislukt:', e.message); });
}
laadAllePresets();

// =====================
// API STATUS CHECK
// =====================
function checkApiStatus() {
  var el = document.getElementById('apiStatus');
  if (!el) return;
  el.className = 'api-status ok';
  el.innerHTML = '<span class="api-status-dot"></span> CHECKING...';

  fetch('/api/status')
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function(d) {
    if (d.hasIncident || d.degraded) {
      el.className = 'api-status ' + (d.degraded ? 'err' : 'warn');
      var label = d.degraded ? 'API STORING' : 'API MELDING';
      var names = (d.incidents || []).map(function(i) { return i.name; }).join(', ');
      el.innerHTML = '<span class="api-status-dot"></span> ' + label;
      el.title = names || 'Melding op Anthropic statuspagina';
    } else {
      el.className = 'api-status ok';
      el.innerHTML = '<span class="api-status-dot"></span> API OK';
      el.title = 'Anthropic API werkt normaal';
    }
  })
  .catch(function(e) {
    el.className = 'api-status ok';
    el.innerHTML = '<span class="api-status-dot"></span> API OK';
    el.title = 'Status: ' + e.message;
  });
}

checkApiStatus();
setInterval(checkApiStatus, 180000);

// =====================
// B-SNAAR DETECTIE
// =====================
function checkBSnaar(tekst) {
  var t = tekst.toLowerCase();
  var regels = t.split('\n');
  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (r.startsWith('b_snaar_vereist:')) return r.indexOf('ja') !== -1;
  }
  var kw = ['lage b-snaar','lage b snaar','b-snaar nodig','b-snaar vereist','vijfde snaar','5e snaar','low b string','low-b','onder de e-snaar'];
  for (var j = 0; j < kw.length; j++) { if (t.indexOf(kw[j]) !== -1) return true; }
  return false;
}

// =====================
// KNOB — unipolair
// =====================
function makeKnob(label, value, unit, pct) {
  pct = Math.max(0, Math.min(1, pct));
  var cx = 30, cy = 30, r = 22;
  var startDeg = 180, totalDeg = 330;
  function pt(deg) {
    var rad = (deg - 90) * Math.PI / 180;
    return { x: parseFloat((cx + r * Math.cos(rad)).toFixed(2)), y: parseFloat((cy + r * Math.sin(rad)).toFixed(2)) };
  }
  var s = pt(startDeg), bgEnd = pt(startDeg + totalDeg);
  var e = pt(startDeg + pct * totalDeg);
  var largeArc = (pct * totalDeg) > 180 ? 1 : 0;
  var bgPath = 'M ' + s.x + ' ' + s.y + ' A ' + r + ' ' + r + ' 0 1 1 ' + bgEnd.x + ' ' + bgEnd.y;
  var fillPath = pct > 0.001 ? ('M ' + s.x + ' ' + s.y + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + e.x + ' ' + e.y) : '';
  var display = value + (unit === '%' ? '%' : (unit ? ' ' + unit : ''));
  return '<div class="knob-wrap">'
    + '<svg class="knob-svg" width="60" height="60" viewBox="0 0 60 60">'
    + '<path class="knob-track" d="' + bgPath + '"/>'
    + (fillPath ? '<path class="knob-fill" d="' + fillPath + '"/>' : '')
    + '<text class="knob-center-val" x="30" y="31">' + display + '</text>'
    + '</svg><div class="knob-label">' + label + '</div></div>';
}

// =====================
// KNOB — bipolair
// =====================
function makeKnobBipolar(label, value, unit, pct) {
  pct = Math.max(-1, Math.min(1, pct));
  var cx = 30, cy = 30, r = 22;
  function pt(deg) {
    var rad = (deg - 90) * Math.PI / 180;
    return { x: parseFloat((cx + r * Math.cos(rad)).toFixed(2)), y: parseFloat((cy + r * Math.sin(rad)).toFixed(2)) };
  }
  var trackStart = pt(210), trackEnd = pt(150);
  var bgPath = 'M ' + trackStart.x + ' ' + trackStart.y + ' A ' + r + ' ' + r + ' 0 1 1 ' + trackEnd.x + ' ' + trackEnd.y;
  var center = pt(0);
  var fillPath = '';
  if (Math.abs(pct) > 0.01) {
    var arcDeg = Math.abs(pct) * 150;
    var largeArc = arcDeg > 180 ? 1 : 0;
    var endPt;
    if (pct > 0) {
      endPt = pt(arcDeg);
      fillPath = 'M ' + center.x + ' ' + center.y + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + endPt.x + ' ' + endPt.y;
    } else {
      endPt = pt(360 - arcDeg);
      fillPath = 'M ' + center.x + ' ' + center.y + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 0 ' + endPt.x + ' ' + endPt.y;
    }
  }
  var display = value + (unit ? ' ' + unit : '');
  return '<div class="knob-wrap">'
    + '<svg class="knob-svg" width="60" height="60" viewBox="0 0 60 60">'
    + '<path class="knob-track" d="' + bgPath + '"/>'
    + '<circle cx="' + center.x + '" cy="' + center.y + '" r="2.5" fill="#3d3d4d"/>'
    + (fillPath ? '<path class="knob-fill" d="' + fillPath + '"/>' : '')
    + '<text class="knob-center-val" x="30" y="31">' + display + '</text>'
    + '</svg><div class="knob-label">' + label + '</div></div>';
}

function makeToggle(label, isOn) {
  return '<div class="toggle-wrap">'
    + '<div class="toggle-track ' + (isOn ? 'on' : 'off') + '"><div class="toggle-thumb"></div></div>'
    + '<div class="toggle-val">' + (isOn ? 'ON' : 'OFF') + '</div>'
    + '<div class="toggle-label">' + label + '</div></div>';
}

function makeSelector(label, options, activeVal) {
  var opts = options.map(function(o) {
    return '<span class="selector-opt' + (o.trim().toLowerCase() === activeVal.trim().toLowerCase() ? ' active' : '') + '">' + o.trim() + '</span>';
  }).join('');
  return '<div class="selector-wrap"><div class="selector-label">' + label + '</div><div class="selector-opts">' + opts + '</div></div>';
}

function makeTextBadge(label, value) {
  return '<div class="textbadge-wrap"><div class="textbadge-label">' + label + '</div><div class="textbadge-val">' + value + '</div></div>';
}

function renderSettingVisual(param, value) {
  var p = param.trim(), v = value.trim();
  if (v.toLowerCase() === 'on') return makeToggle(p, true);
  if (v.toLowerCase() === 'off') return makeToggle(p, false);
  var pctM = v.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (pctM) { var pv = parseFloat(pctM[1]); return makeKnob(p, Math.round(pv), '%', pv / 100); }
  var unitM = v.match(/^([+-]?\d+(?:\.\d+)?)\s*(ms|Hz|kHz|dB|s|cents)$/i);
  if (unitM) {
    var uv = parseFloat(unitM[1]), unit = unitM[2], pctVal = 0.5;
    if (unit === 'ms') pctVal = Math.min(1, uv / 2000);
    else if (unit.toLowerCase() === 'hz') pctVal = Math.min(1, uv / 10000);
    else if (unit === 'kHz') pctVal = Math.min(1, uv / 20);
    else if (unit === 'dB') {
      if (uv < -20) { pctVal = Math.min(1, Math.max(0, (uv + 80) / 80)); return makeKnob(p, uv, unit, pctVal); }
      else { return makeKnobBipolar(p, uv, unit, uv / 15); }
    }
    else if (unit === 's') pctVal = Math.min(1, uv / 20);
    else if (unit === 'cents') pctVal = Math.min(1, Math.max(0, (uv + 100) / 200));
    return makeKnob(p, uv, unit, pctVal);
  }
  var num = v.match(/^(\d+(?:\.\d+)?)$/);
  if (num) { var nv = parseFloat(num[1]); return makeKnob(p, nv % 1 === 0 ? Math.round(nv) : nv, '', Math.min(1, nv / 10)); }
  if (v.indexOf('/') !== -1) {
    var parts = v.split('/').map(function(x) { return x.trim(); });
    if (parts.length <= 6 && parts.every(function(x) { return x.length < 16; })) return makeSelector(p, parts, parts[0]);
    return makeTextBadge(p, v);
  }
  if (v.match(/^\d+:\d+$/) || v === 'All' || v === 'Auto') return makeSelector(p, [v], v);
  return makeTextBadge(p, v);
}

// =====================
// SIGNAALCHAIN RENDERER
// =====================
function renderChainRegel(chainStr) {
  var norm = chainStr.replace(/\u2192/g, '>').replace(/->/g, '>');
  var blokken = norm.split('>').map(function(b) { return b.trim(); }).filter(Boolean);
  var html = '';
  blokken.forEach(function(b, idx) {
    html += '<span class="chain-block">' + b + '</span>';
    if (idx < blokken.length - 1) html += '<span class="chain-arrow">\u2192</span>';
  });
  return html;
}

// =====================
// HTML RENDERER
// =====================
function toHtml(t, bassContext) {
  var regels = t.split('\n');
  var html = '';
  var inBlok = false, blokNaam = '', blokSettings = [], blokUitleg = '';
  var blokTeller = 0, inChain = false, chainHtml = '', inTips = false;

  // B-snaar waarschuwing alleen voor pbass context
  var showBsnaar = (bassContext === 'pbass') && checkBSnaar(t);
  if (showBsnaar) {
    html += '<div class="bsnaar-warning"><span class="bsnaar-icon">\u26a0</span>'
      + '<div><strong>Let op: 4-snarige bas</strong><br>'
      + 'Dit nummer maakt waarschijnlijk gebruik van een lage B-snaar. '
      + 'Met je Fender Precision Bass kun je mogelijk niet alle noten spelen zoals in het origineel.</div></div>';
  }

  function sluitBlok() {
    if (!inBlok) return;
    var visuals = '<div class="visual-controls">';
    blokSettings.forEach(function(s) {
      var idx = s.indexOf(':');
      if (idx === -1) return;
      var param = s.substring(0, idx).replace(/^-\s*/, '').trim();
      var waarde = s.substring(idx + 1).trim();
      visuals += renderSettingVisual(param, waarde);
    });
    visuals += '</div>';
    html += '<div class="blok-kaart">'
      + '<div class="blok-titel"><span class="blok-nummer">' + blokTeller + '</span><span class="blok-naam">' + blokNaam + '</span></div>'
      + '<div class="blok-body">' + (blokSettings.length ? visuals : '') + (blokUitleg ? '<div class="blok-uitleg">' + blokUitleg + '</div>' : '') + '</div></div>';
    inBlok = false; blokNaam = ''; blokSettings = []; blokUitleg = '';
  }
  function sluitChain() { if (!inChain) return; html += '<div class="chain-container">' + chainHtml + '</div>'; chainHtml = ''; inChain = false; }
  function sluitTips() { if (!inTips) return; html += '</div>'; inTips = false; }

  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (!r) continue;
    if (r.toLowerCase().startsWith('b_snaar_vereist:')) continue;
    if (r.startsWith('ARTIEST:') || r.startsWith('SONG:')) continue;

    if (r.startsWith('## ')) {
      sluitBlok(); sluitChain(); sluitTips();
      var sectie = r.replace('## ', '');
      if (sectie === 'SIGNAALCHAIN') { html += '<div class="sectie-titel">SIGNAALCHAIN</div>'; inChain = true; chainHtml = ''; }
      else if (sectie === 'FINE-TUNE TIPS') { html += '<div class="sectie-titel">FINE-TUNE TIPS</div><div class="tip-box">'; inTips = true; }
      else { html += '<div class="sectie-titel">' + sectie + '</div>'; }
      continue;
    }

    if (inChain) {
      if (r === 'SERIEEL') chainHtml += '<div class="chain-row"><span class="parallel-badge" style="border-color:var(--accent);color:var(--accent)">\u2192 SERIEEL</span></div>';
      else if (r === 'PARALLEL') chainHtml += '<div class="chain-row"><span class="parallel-badge">\u21c4 PARALLEL ROUTING</span></div>';
      else if (r.startsWith('CHAIN_A:')) chainHtml += '<div class="chain-row"><span class="chain-label">A</span>' + renderChainRegel(r.replace('CHAIN_A:', '').trim()) + '</div>';
      else if (r.startsWith('CHAIN_B:')) chainHtml += '<div class="chain-row"><span class="chain-label">B</span>' + renderChainRegel(r.replace('CHAIN_B:', '').trim()) + '</div>';
      else if (r.startsWith('CHAIN:')) chainHtml += '<div class="chain-row">' + renderChainRegel(r.replace('CHAIN:', '').trim()) + '</div>';
      else if (r.startsWith('MERGE_NAAR:')) chainHtml += '<div class="chain-row"><span class="chain-merge">\u21e3 MERGE</span>' + renderChainRegel(r.replace('MERGE_NAAR:', '').trim()) + '</div>';
      else if (r.indexOf('\u2192') !== -1 || r.indexOf('>') !== -1) chainHtml += '<div class="chain-row">' + renderChainRegel(r) + '</div>';
      else chainHtml += '<p style="font-size:0.75rem;color:var(--text-dim);margin:0.25rem 0">' + r + '</p>';
      continue;
    }

    if (r.startsWith('### ')) { sluitBlok(); blokTeller++; inBlok = true; blokNaam = r.replace('### ', ''); continue; }

    if (inBlok) {
      if (r === 'INSTELLINGEN:') continue;
      if (r.startsWith('- ')) { blokSettings.push(r); }
      else if (r.startsWith('UITLEG:')) { blokUitleg = r.replace('UITLEG:', '').trim(); }
      continue;
    }

    if (inTips) { html += '<p style="margin-bottom:0.5rem">' + r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>'; continue; }
    html += '<p>' + r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>';
  }

  sluitBlok(); sluitChain(); sluitTips();
  return html;
}

function toHtmlSimple(t) {
  return t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}
