// =====================
// STATE
// =====================
var selectedBass = 'spector';
var chatHistory = [];
var chatContext = '';
var currentPresetData = null;

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

document.getElementById('artistInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('songInput').focus();
});
document.getElementById('songInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') analyzeTone();
});

// =====================
// SYSTEEM PROMPT
// =====================
var SYSTEM_ANALYZE = 'Je bent een expert in bas-gitaar sound design voor de Darkglass Anagram (KosmOS v1.13). '
  + 'Gebruik ALLEEN de hieronder vermelde officiële bloknamen en hun EXACTE parameters met de juiste waardebereiken.\n\n'

  + '=== DRIVE BLOKKEN ===\n'
  + 'Microtubes B3K (Darkglass B3K pedaal)\n'
  + '  Parameters: Drive (0-100%), Blend (0-100%), Level (0-100%), Tone (3kHz-8kHz), Grunt (Off/Fat/Raw), Mid Boost (On/Off)\n\n'
  + 'Vintage Microtubes (Darkglass VMT pedaal)\n'
  + '  Parameters: Drive (0-100%), Blend (0-100%), Level (0-100%), Tone (0-100%), Grunt (On/Off)\n\n'
  + 'Alpha Omicron (Darkglass Alpha Omicron pedaal)\n'
  + '  Parameters: Drive (0-100%), Blend (0-100%), Level (0-100%), Voice (Alpha/Omega)\n\n'
  + 'Duality Fuzz (Darkglass Duality Fuzz pedaal)\n'
  + '  Parameters: Fuzz (0-100%), Blend (0-100%), Level (0-100%), Voice (Silicon/Germanium)\n\n'
  + 'Chinchilla (EHX Big Muff Pi-stijl)\n'
  + '  Parameters: Gain (0-100%), Blend (0-100%), Level (0-100%), Tone (0-100%)\n\n'
  + 'Microtubes X (Darkglass Microtubes X)\n'
  + '  Parameters: Drive (0-100%), Blend (0-100%), Level (0-100%), Bass (0-100%), Treble (0-100%)\n\n'
  + 'Bee Kolme OD (Boss ODB-3-stijl)\n'
  + '  Parameters: Gain (0-100%), Level (0-100%), Blend (0-100%), EQ Low (0-100%), EQ High (0-100%)\n\n'
  + 'Arc Dreamer (Tube Screamer-stijl)\n'
  + '  Parameters: Drive (0-100%), Tone (0-100%), Level (0-100%)\n\n'

  + '=== COMPRESSOR BLOKKEN ===\n'
  + 'Ignissor (Darkglass multiband compressor)\n'
  + '  Parameters: Low Threshold (-60 tot 0 dB), Mid Threshold (-60 tot 0 dB), High Threshold (-60 tot 0 dB), Ratio (1:1-20:1), Attack (1-100 ms), Release (10-500 ms), Gain (0-24 dB)\n\n'
  + 'Luminal FET Compressor (UA 1176-stijl)\n'
  + '  Parameters: Input (0.0-10.0), Output (0.0-10.0), Attack (0.0-10.0), Release (0.0-10.0), Ratio (4:1/8:1/12:1/20:1/All), Blend (0-100%)\n\n'
  + 'BUS Compressor (SSL G-Bus-stijl)\n'
  + '  Parameters: Threshold (-30 tot 0 dB), Ratio (2:1/4:1/10:1), Attack (1/3/10/30/100 ms), Release (100/200/400 ms of Auto), Makeup Gain (0-24 dB)\n\n'
  + 'Compressor/Limiter (algemeen)\n'
  + '  Parameters: Threshold (-60 tot 0 dB), Ratio (1:1-20:1 of Limiter), Attack (0.1-100 ms), Release (10-2000 ms), Makeup Gain (0-24 dB)\n\n'

  + '=== PREAMP / AMP BLOKKEN ===\n'
  + 'Harmonic Booster (Darkglass Harmonic Booster)\n'
  + '  Parameters: Gain (0-100%), Level (0-100%), Bass (-15 tot +15 dB), Treble (-15 tot +15 dB)\n\n'
  + 'Leo Bass (Fender Bassman-stijl)\n'
  + '  Parameters: Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Presence (0-100%), Master (0-100%)\n\n'
  + 'Jim Bass (Ampeg SVT-stijl)\n'
  + '  Parameters: Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Master (0-100%), Bright (On/Off)\n\n'
  + 'Gentle (Aguilar Tone Hammer-stijl)\n'
  + '  Parameters: Gain (0-100%), Bass (0-100%), Mid (0-100%), Mid Freq (40Hz-1kHz), Treble (0-100%), Master (0-100%)\n\n'
  + 'Peggy Bass (Ampeg SVT-VR-stijl)\n'
  + '  Parameters: Gain (0-100%), Bass (0-100%), Mid (0-100%), Treble (0-100%), Master (0-100%)\n\n'
  + 'SWIRL-900 (SWR SM-900-stijl)\n'
  + '  Parameters: Gain (0-100%), Bass (0-100%), Lo-Mid (0-100%), Hi-Mid (0-100%), Treble (0-100%), Master (0-100%)\n\n'

  + '=== CABINET / IR ===\n'
  + 'IR Loader\n'
  + '  Parameters: IR File (naam van het geladen kabinet), Level (0-100%), Low Cut (20-500 Hz), High Cut (2kHz-20kHz)\n'
  + '  Beschikbare IR-namen: Darkglass Neo 4x10, Modern Bass 4x10, Peggy 8x10, Jim Bass 8x10, Vintage 4x10, Vintage 2x15\n\n'

  + '=== EQ / FILTER BLOKKEN ===\n'
  + 'Parametric EQ\n'
  + '  Parameters: Low Freq (20-500 Hz), Low Gain (-15/+15 dB), Low-Mid Freq (100Hz-2kHz), Low-Mid Gain (-15/+15 dB), Low-Mid Q (0.5-10), Mid Freq (200Hz-5kHz), Mid Gain (-15/+15 dB), Mid Q (0.5-10), High-Mid Freq (500Hz-10kHz), High-Mid Gain (-15/+15 dB), High-Mid Q (0.5-10), High Freq (1kHz-20kHz), High Gain (-15/+15 dB)\n\n'
  + 'Darkglass 6-Band EQ\n'
  + '  Parameters: 40Hz (+/-15 dB), 150Hz (+/-15 dB), 500Hz (+/-15 dB), 2kHz (+/-15 dB), 5kHz (+/-15 dB), 12kHz (+/-15 dB)\n\n'
  + 'Hi-Pass Filter\n'
  + '  Parameters: Frequency (20-500 Hz), Slope (6/12/18/24 dB/oct)\n\n'
  + 'Lo-Pass Filter\n'
  + '  Parameters: Frequency (1kHz-20kHz), Slope (6/12/18/24 dB/oct)\n\n'
  + 'Noise Suppressor (Boss NS-2-stijl)\n'
  + '  Parameters: Threshold (0-100%), Decay (0-100%)\n\n'

  + '=== MODULATIE BLOKKEN ===\n'
  + 'Mint Chocolate Chorus (Boss CE-2-stijl)\n'
  + '  Parameters: Rate (0-100%), Depth (0-100%), Blend (0-100%)\n\n'
  + 'Flamingo Flanger (Boss BF-2-stijl)\n'
  + '  Parameters: Rate (0-100%), Depth (0-100%), Resonance (0-100%), Manual (0-100%)\n\n'
  + 'Pharos Phaser (MXR Phase 90-stijl)\n'
  + '  Parameters: Rate (0-100%), Depth (0-100%), Blend (0-100%)\n\n'
  + 'Tremora Tremolo (Boss TR-2-stijl)\n'
  + '  Parameters: Rate (0-100%), Depth (0-100%), Wave (Sine/Square)\n\n'

  + '=== PITCH / OCTAVE BLOKKEN ===\n'
  + 'Sublime Octaver mono (Boss OC-2-stijl)\n'
  + '  Parameters: Oct 1 Level (0-100%), Oct 2 Level (0-100%), Direct Level (0-100%)\n\n'
  + 'Subcitri Octaver poly (EHX POG-stijl)\n'
  + '  Parameters: Sub Oct Level (0-100%), Oct Up Level (0-100%), Dry Level (0-100%), Detune (cents)\n\n'

  + '=== DELAY BLOKKEN ===\n'
  + 'Digital Delay (Boss DD-3-stijl)\n'
  + '  Parameters: Time (1-2000 ms of BPM-sync), Feedback (0-100%), Blend (0-100%), Mode (Normal/Hold)\n\n'
  + 'Analog Delay (Boss DM-2-stijl)\n'
  + '  Parameters: Time (20-600 ms), Feedback (0-100%), Blend (0-100%)\n\n'

  + '=== REVERB BLOKKEN ===\n'
  + 'Room Reverb\n'
  + '  Parameters: Decay (0.1-10 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)\n\n'
  + 'Plate Reverb\n'
  + '  Parameters: Decay (0.1-10 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)\n\n'
  + 'Hall Reverb\n'
  + '  Parameters: Decay (0.5-20 s), Pre-delay (0-100 ms), Blend (0-100%), Damping (0-100%)\n\n'

  + '=== UTILITY BLOKKEN ===\n'
  + 'Gain: Level (0-200%), Pad (-20 tot 0 dB)\n'
  + 'Split: Balance (0-100%)\n'
  + 'Merge: Blend (0-100%), Pan A (L-R), Pan B (L-R)\n\n'

  + '=== INSTRUCTIES ===\n'
  + 'Zet ALTIJD als absolute eerste regel:\n'
  + 'B_SNAAR_VEREIST: ja of nee\n\n'
  + 'Gebruik ALLEEN de parameter-namen zoals hierboven vermeld.\n'
  + 'Geef GEEN parameters op die niet in het blok bestaan.\n\n'
  + 'Structureer je antwoord ALTIJD exact zo:\n\n'
  + '## TONE ANALYSE\n[analyse]\n\n'
  + '## SIGNAALCHAIN\n'
  + 'SERIEEL of PARALLEL\n'
  + 'CHAIN_A: Blok1 > Blok2 > Blok3\n'
  + 'CHAIN_B: Blok4 > Blok5 (alleen bij parallel)\n'
  + 'MERGE_NAAR: Blok6 (alleen bij parallel)\n\n'
  + '## BLOKKEN\n\n'
  + '### BLOKNAAM (origineel model)\n'
  + 'INSTELLINGEN:\n'
  + '- Parameternaam: waarde\n'
  + 'UITLEG: één zin waarom\n\n'
  + '## FINE-TUNE TIPS\n[3 concrete tips. Als stemming relevant is, vermeld dan ALLEEN de basstemming (bijv. Drop D, Eb standaard, C# standaard) en niet de gitaarstemming. Let hierbij op welke bas er gekozen is, de spector is standaard in BEADG en de Precision is standaard in EADG]\n\n'
  + 'Antwoord in het Nederlands.';

// =====================
// ANALYSEER TONE
// =====================
function analyzeTone() {
  var artist = document.getElementById('artistInput').value.trim();
  var song = document.getElementById('songInput').value.trim();
  if (!artist || !song) { alert('Vul artiest en songtitel in.'); return; }

  var bassLabel = selectedBass === 'spector'
    ? 'Spector NS Ethos 5 (actief, 5-snarig, EMG-Hz pickup in P/HH configuratie)'
    : 'Fender Precision Bass (actief, 4-snarig, Split-P EMG-Hz pickup)';

  var btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('btnText').textContent = 'ANALYSEREN...';

  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('outputMeta').textContent =
    artist.toUpperCase() + ' — ' + song.toUpperCase() + ' · ' + bassLabel.toUpperCase();
  document.getElementById('outputContent').innerHTML =
    '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>Bastone analyseren...</p></div>';
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

  var extra = document.getElementById('extraInput').value.trim();
  var userMsg = 'Ik wil de bastone van "' + song + '" van ' + artist
    + ' namaken met mijn ' + bassLabel + ' en de Darkglass Anagram. Geef me een volledig preset-plan.'
    + (extra ? '\n\nExtra wensen: ' + extra : '');

  chatHistory = [{ role: 'user', content: userMsg }];
  chatContext = artist + ' - ' + song + ' | ' + bassLabel;
  currentPresetData = null;

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: SYSTEM_ANALYZE })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chatHistory.push({ role: 'assistant', content: d.content });

    currentPresetData = {
      artist: artist,
      song: song,
      bass: bassLabel,
      content: d.content
    };

    document.getElementById('outputContent').innerHTML = toHtml(d.content);
    document.getElementById('chatPanel').classList.remove('hidden');
    document.getElementById('chatMessages').innerHTML = '';
    addMsg('assistant', 'Preset klaar! Heb je vragen of wil je de sound verder verfijnen?');
    document.getElementById('chatPanel').scrollIntoView({ behavior: 'smooth' });
  })
  .catch(function(e) {
    document.getElementById('outputContent').innerHTML =
      '<p style="color:var(--accent2)">Fout: ' + e.message + '</p>';
  })
  .finally(function() {
    btn.disabled = false;
    document.getElementById('btnText').textContent = 'ANALYSEER TONE';
  });
}

// =====================
// CHAT — herbouwt panel 02
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

  var systemChat = SYSTEM_ANALYZE
    + '\n\nDe gebruiker heeft een aanvullende wens. Genereer een VOLLEDIG NIEUW bijgewerkt preset-plan in exact hetzelfde formaat. Verwerk de aanpassing volledig. Geef alleen het preset-plan, geen extra uitleg erbuiten.';

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatHistory, system: systemChat })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    chatHistory.push({ role: 'assistant', content: d.content });

    if (currentPresetData) {
      currentPresetData.content = d.content;
    }

    document.getElementById('outputContent').innerHTML = toHtml(d.content);
    var lastMsg = document.getElementById('chatMessages').lastElementChild;
    if (lastMsg) {
      var bubble = lastMsg.querySelector('.msg-bubble');
      if (bubble) bubble.innerHTML = '✓ Preset bijgewerkt op basis van je wens.';
    }
    document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
  })
  .catch(function(e) {
    document.getElementById('outputContent').innerHTML =
      '<p style="color:var(--accent2)">Fout: ' + e.message + '</p>';
    var lastMsg = document.getElementById('chatMessages').lastElementChild;
    if (lastMsg) {
      var bubble = lastMsg.querySelector('.msg-bubble');
      if (bubble) bubble.textContent = 'Fout: ' + e.message;
    }
  });
}

function addMsg(role, text, id) {
  var c = document.getElementById('chatMessages');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  if (id) d.id = id;
  d.innerHTML = '<span class="msg-role">'
    + (role === 'user' ? 'JIJ' : 'ANAGRAM AI')
    + '</span><div class="msg-bubble">' + toHtmlSimple(text) + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// =====================
// OPSLAAN & LADEN
// =====================
// Cache voor presets (geladen vanuit Redis)
var presetsCache = {};

// =====================
// OPSLAAN
// =====================
function savePreset() {
  if (!currentPresetData) { alert('Geen preset om op te slaan.'); return; }

  var id = Date.now().toString();
  var datum = new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  var bestaatAl = false;
  for (var key in presetsCache) {
    if (presetsCache[key].artist === currentPresetData.artist && presetsCache[key].song === currentPresetData.song) {
      bestaatAl = true; break;
    }
  }

  var label = '';
  if (bestaatAl) {
    var input = window.prompt('Er bestaat al een preset voor dit nummer.\nGeef 2-3 steekwoorden voor deze versie\n(bijv: meer distortion, parallel, minder comp):', '');
    if (input === null) return;
    label = input.trim();
  }

  var preset = {
    id: id,
    artist: currentPresetData.artist,
    song: currentPresetData.song,
    bass: currentPresetData.bass,
    content: currentPresetData.content,
    datum: datum,
    label: label
  };

  var btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'OPSLAAN...';

  fetch('/api/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset: preset })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    presetsCache[id] = preset;
    renderSavedPanel();
    btn.textContent = '✓ OPGESLAGEN';
    btn.style.color = 'var(--accent)';
    btn.style.borderColor = 'var(--accent)';
    setTimeout(function() {
      btn.innerHTML = '<span>&#9632;</span> PRESET OPSLAAN';
      btn.style.color = ''; btn.style.borderColor = '';
      btn.disabled = false;
    }, 2000);
  })
  .catch(function(e) {
    alert('Opslaan mislukt: ' + e.message);
    btn.innerHTML = '<span>&#9632;</span> PRESET OPSLAAN';
    btn.disabled = false;
  });
}

// =====================
// LADEN (één preset)
// =====================
function loadPreset(id) {
  var p = presetsCache[id];
  if (!p) return;

  currentPresetData = { artist: p.artist, song: p.song, bass: p.bass, content: p.content };

  document.getElementById('outputMeta').textContent =
    p.artist.toUpperCase() + ' — ' + p.song.toUpperCase() + ' · ' + p.bass.toUpperCase();
  document.getElementById('outputContent').innerHTML = toHtml(p.content);
  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('chatMessages').innerHTML = '';
  chatHistory = [];
  chatContext = p.artist + ' - ' + p.song + ' | ' + p.bass;

  addMsg('assistant', 'Preset geladen! Wil je nog aanpassingen maken?');
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
}

// =====================
// VERWIJDEREN
// =====================
function deletePreset(id) {
  if (!window.confirm('Preset verwijderen?')) return;

  fetch('/api/presets', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: id })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    delete presetsCache[id];
    renderSavedPanel();
  })
  .catch(function(e) { alert('Verwijderen mislukt: ' + e.message); });
}

// =====================
// PANEL RENDEREN
// =====================
function renderSavedPanel() {
  var keys = Object.keys(presetsCache).sort(function(a, b) { return b - a; });
  var panel = document.getElementById('savedPanel');
  var list = document.getElementById('savedList');

  if (keys.length === 0) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  list.innerHTML = keys.map(function(id) {
    var p = presetsCache[id];
    var subtitle = p.bass.split('(')[0].trim() + ' · ' + p.datum;
    if (p.label) subtitle += ' · ' + p.label;
    return '<div class="saved-item">'
      + '<div class="saved-item-header"><div>'
      + '<div class="saved-item-title">' + p.artist + ' — ' + p.song + '</div>'
      + '<div class="saved-item-date">' + subtitle + '</div>'
      + '</div><div class="saved-item-actions">'
      + '<button class="saved-action-btn btn-load" onclick="loadPreset(\'' + id + '\')">LADEN</button>'
      + '<button class="saved-action-btn btn-delete" onclick="deletePreset(\'' + id + '\')">✕</button>'
      + '</div></div></div>';
  }).join('');
}

// =====================
// PRESETS OPHALEN BIJ OPSTARTEN
// =====================
function laadAllePresets() {
  fetch('/api/presets')
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.error) throw new Error(d.error);
    presetsCache = d.presets || {};
    renderSavedPanel();
  })
  .catch(function(e) { console.error('Presets laden mislukt:', e.message); });
}

laadAllePresets();

// =====================
// B-SNAAR DETECTIE
// =====================
function checkBSnaar(tekst) {
  var t = tekst.toLowerCase();
  var regels = t.split('\n');
  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (r.startsWith('b_snaar_vereist:')) {
      return r.indexOf('ja') !== -1;
    }
  }
  var keywords = ['lage b-snaar', 'lage b snaar', 'b-snaar nodig', 'b-snaar vereist',
    'vijfde snaar', '5e snaar', 'low b string', 'low-b', 'onder de e-snaar'];
  for (var j = 0; j < keywords.length; j++) {
    if (t.indexOf(keywords[j]) !== -1) return true;
  }
  return false;
}

// =====================
// SIGNAALCHAIN RENDERER
// =====================
function renderChainRegel(chainStr) {
  var normalized = chainStr.replace(/→/g, '>').replace(/->/g, '>');
  var blokken = normalized.split('>').map(function(b) { return b.trim(); }).filter(Boolean);
  var html = '';
  blokken.forEach(function(b, idx) {
    html += '<span class="chain-block">' + b + '</span>';
    if (idx < blokken.length - 1) html += '<span class="chain-arrow">→</span>';
  });
  return html;
}

// =====================
// HTML RENDERER (output)
// =====================
function toHtml(t) {
  var regels = t.split('\n');
  var html = '';
  var inBlok = false;
  var blokNaam = '';
  var blokSettings = [];
  var blokUitleg = '';
  var blokTeller = 0;
  var inChain = false;
  var chainHtml = '';
  var inTips = false;

  if (selectedBass === 'pbass' && checkBSnaar(t)) {
    html += '<div class="bsnaar-warning"><span class="bsnaar-icon">⚠</span>'
      + '<div><strong>Let op: 4-snarige bas</strong><br>'
      + 'Dit nummer maakt waarschijnlijk gebruik van een lage B-snaar. '
      + 'Met je Fender Precision Bass kun je mogelijk niet alle noten spelen zoals in het origineel. '
      + 'Overweeg de Spector NS Ethos 5.</div></div>';
  }

  function sluitBlok() {
    if (!inBlok) return;
    var settingsHtml = blokSettings.map(function(s) {
      var idx = s.indexOf(':');
      if (idx === -1) return '';
      var param = s.substring(0, idx).replace(/^-\s*/, '').trim();
      var waarde = s.substring(idx + 1).trim();
      return '<div class="setting-item"><div class="setting-param">' + param + '</div><div class="setting-waarde">' + waarde + '</div></div>';
    }).join('');
    html += '<div class="blok-kaart"><div class="blok-titel"><span class="blok-nummer">' + blokTeller + '</span><span class="blok-naam">' + blokNaam + '</span></div><div class="blok-body">';
    if (settingsHtml) html += '<div class="blok-settings">' + settingsHtml + '</div>';
    if (blokUitleg) html += '<div class="blok-uitleg">' + blokUitleg + '</div>';
    html += '</div></div>';
    inBlok = false; blokNaam = ''; blokSettings = []; blokUitleg = '';
  }

  function sluitChain() {
    if (!inChain) return;
    html += '<div class="chain-container">' + chainHtml + '</div>';
    chainHtml = ''; inChain = false;
  }

  function sluitTips() {
    if (!inTips) return;
    html += '</div>';
    inTips = false;
  }

  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (!r) continue;
    if (r.toLowerCase().startsWith('b_snaar_vereist:')) continue;

    if (r.startsWith('## ')) {
      sluitBlok(); sluitChain(); sluitTips();
      var sectie = r.replace('## ', '');
      if (sectie === 'SIGNAALCHAIN') {
        html += '<div class="sectie-titel">SIGNAALCHAIN</div>';
        inChain = true; chainHtml = '';
      } else if (sectie === 'FINE-TUNE TIPS') {
        html += '<div class="sectie-titel">FINE-TUNE TIPS</div><div class="tip-box">';
        inTips = true;
      } else {
        html += '<div class="sectie-titel">' + sectie + '</div>';
      }
      continue;
    }

    if (inChain) {
      if (r === 'SERIEEL') {
        chainHtml += '<div class="chain-row"><span class="parallel-badge" style="border-color:var(--accent);color:var(--accent)">→ SERIEEL</span></div>';
      } else if (r === 'PARALLEL') {
        chainHtml += '<div class="chain-row"><span class="parallel-badge">⇄ PARALLEL ROUTING</span></div>';
      } else if (r.startsWith('CHAIN_A:')) {
        chainHtml += '<div class="chain-row"><span class="chain-label">A</span>' + renderChainRegel(r.replace('CHAIN_A:', '').trim()) + '</div>';
      } else if (r.startsWith('CHAIN_B:')) {
        chainHtml += '<div class="chain-row"><span class="chain-label">B</span>' + renderChainRegel(r.replace('CHAIN_B:', '').trim()) + '</div>';
      } else if (r.startsWith('CHAIN:')) {
        chainHtml += '<div class="chain-row">' + renderChainRegel(r.replace('CHAIN:', '').trim()) + '</div>';
      } else if (r.startsWith('MERGE_NAAR:')) {
        chainHtml += '<div class="chain-row"><span class="chain-merge">⇣ MERGE</span>' + renderChainRegel(r.replace('MERGE_NAAR:', '').trim()) + '</div>';
      } else if (r.indexOf('→') !== -1 || r.indexOf('>') !== -1) {
        chainHtml += '<div class="chain-row">' + renderChainRegel(r) + '</div>';
      } else {
        chainHtml += '<p style="font-size:0.75rem;color:var(--text-dim);margin:0.25rem 0">' + r + '</p>';
      }
      continue;
    }

    if (r.startsWith('### ')) {
      sluitBlok();
      blokTeller++; inBlok = true;
      blokNaam = r.replace('### ', '');
      continue;
    }

    if (inBlok) {
      if (r === 'INSTELLINGEN:') continue;
      if (r.startsWith('- ')) { blokSettings.push(r); }
      else if (r.startsWith('UITLEG:')) { blokUitleg = r.replace('UITLEG:', '').trim(); }
      continue;
    }

    if (inTips) {
      html += '<p style="margin-bottom:0.5rem">' + r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>';
      continue;
    }

    html += '<p>' + r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '</p>';
  }

  sluitBlok(); sluitChain(); sluitTips();
  return html;
}

// =====================
// SIMPELE HTML (chat)
// =====================
function toHtmlSimple(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}
