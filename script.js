// =====================
// TAAL / I18N
// =====================
var currentLang = localStorage.getItem('dg_lang') || 'nl';

var I18N = {
  nl: {
    logoSub: 'TONE ARCHITECT',
    panel01: '01 / SETUP',
    panel02: '02 / ANAGRAM PRESET',
    panel03: '03 / FINE-TUNE CHAT',
    panel04: '04 / OPGESLAGEN PRESETS',
    bassSelectie: 'BASS SELECTIE',
    spectorDetail: 'Actief · 5-snarig · EMG-Hz P/HH',
    pbassDetail: 'Actief · 4-snarig · Split-P EMG-Hz',
    beideBassen: 'BEIDE BASSEN',
    beideDetail: '2 scenes · Spector + P-Bass',
    artiest: 'ARTIEST',
    songtitel: 'SONGTITEL',
    extraWensen: 'EXTRA WENSEN',
    optioneel: '(optioneel)',
    artiestPh: 'bijv. Tool, Karnivool, VOLA...',
    songPh: 'bijv. Schism, We Are, Straight Lines...',
    extraPh: 'bijv: meer distortion dan het origineel, parallelle processing nodig...',
    analyseerTone: 'ANALYSEER TONE',
    analyseren: 'ANALYSEREN...',
    scene1: 'SCENE 1 — SPECTOR NS ETHOS 5',
    scene2: 'SCENE 2 — FENDER P-BASS',
    chatPh: 'Stel een vraag of geef een aanpassing...',
    presetOpslaan: 'PRESET OPSLAAN',
    opslaanBezig: 'OPSLAAN...',
    opgeslagen: '✓ OPGESLAGEN',
    vertaalKnop: 'VERTAAL',
    vertalenBezig: 'VERTALEN...',
    vertaaldKlaar: '✓ Preset vertaald.',
    geenContentVertalen: 'Geen preset om te vertalen.',
    pwaTitle: 'INSTALLEER ALS APP',
    pwaSub: 'Voeg toe aan je startscherm voor snelle toegang',
    pwaInstalleer: 'INSTALLEER',
    pwaLater: 'LATER',
    footer: "DARKGLASS ANAGRAM TONE ARCHITECT — HARM'S SIGNAL CHAIN",
    // dynamische teksten
    bastoneAnalyseren: 'Bastone analyseren...',
    presetBijwerken: 'Preset bijwerken...',
    presetKlaar: 'Preset klaar! Heb je vragen of wil je de sound verder verfijnen?',
    dualPresetKlaar: 'Beide presets klaar! Gebruik de tabs om te wisselen.',
    presetGeladen: 'Preset geladen! Wil je nog aanpassingen maken?',
    presetBijgewerkt: '✓ Preset bijgewerkt.',
    chatPastScene: 'Chat past de actieve scene aan: ',
    fout: 'Fout: ',
    vulInVraag: 'Vul artiest en songtitel in.',
    geenPreset: 'Geen preset om op te slaan.',
    bestaatAlPrompt: 'Er bestaat al een preset voor dit nummer.\nGeef 2-3 steekwoorden voor deze versie:',
    verwijderenVraag: 'Preset verwijderen?',
    bsnaarTitel: 'Let op: 4-snarige bas',
    bsnaarTekst: 'Dit nummer gebruikt waarschijnlijk noten onder de lage E. Met een 4-snarige bas kun je mogelijk niet alle noten spelen zoals in het origineel.',
    alleBassen: 'ALLE BASSEN',
    alleDetail: 'Een scene per bas',
    afgekapt: 'Let op: ',
    denktNa: 'Claude denkt na over de sound...',
    laden: 'LADEN',
    jij: 'JIJ',
    aiNaam: 'ANAGRAM AI',
    aiTaalInstructie: 'Antwoord in het Nederlands.'
  },
  en: {
    logoSub: 'TONE ARCHITECT',
    panel01: '01 / SETUP',
    panel02: '02 / ANAGRAM PRESET',
    panel03: '03 / FINE-TUNE CHAT',
    panel04: '04 / SAVED PRESETS',
    bassSelectie: 'BASS SELECTION',
    spectorDetail: 'Active · 5-string · EMG-Hz P/HH',
    pbassDetail: 'Active · 4-string · Split-P EMG-Hz',
    beideBassen: 'BOTH BASSES',
    beideDetail: '2 scenes · Spector + P-Bass',
    artiest: 'ARTIST',
    songtitel: 'SONG TITLE',
    extraWensen: 'EXTRA WISHES',
    optioneel: '(optional)',
    artiestPh: 'e.g. Tool, Karnivool, VOLA...',
    songPh: 'e.g. Schism, We Are, Straight Lines...',
    extraPh: 'e.g. more distortion than the original, parallel processing needed...',
    analyseerTone: 'ANALYZE TONE',
    analyseren: 'ANALYZING...',
    scene1: 'SCENE 1 — SPECTOR NS ETHOS 5',
    scene2: 'SCENE 2 — FENDER P-BASS',
    chatPh: 'Ask a question or request an adjustment...',
    presetOpslaan: 'SAVE PRESET',
    opslaanBezig: 'SAVING...',
    opgeslagen: '✓ SAVED',
    vertaalKnop: 'TRANSLATE',
    vertalenBezig: 'TRANSLATING...',
    vertaaldKlaar: '✓ Preset translated.',
    geenContentVertalen: 'No preset to translate.',
    pwaTitle: 'INSTALL AS APP',
    pwaSub: 'Add to your home screen for quick access',
    pwaInstalleer: 'INSTALL',
    pwaLater: 'LATER',
    footer: "DARKGLASS ANAGRAM TONE ARCHITECT — HARM'S SIGNAL CHAIN",
    bastoneAnalyseren: 'Analyzing bass tone...',
    presetBijwerken: 'Updating preset...',
    presetKlaar: 'Preset ready! Any questions or want to refine the sound?',
    dualPresetKlaar: 'Both presets ready! Use the tabs to switch.',
    presetGeladen: 'Preset loaded! Want to make any adjustments?',
    presetBijgewerkt: '✓ Preset updated.',
    chatPastScene: 'Chat updates the active scene: ',
    fout: 'Error: ',
    vulInVraag: 'Please enter artist and song title.',
    geenPreset: 'No preset to save.',
    bestaatAlPrompt: 'A preset already exists for this song.\nProvide 2-3 keywords for this version:',
    verwijderenVraag: 'Delete preset?',
    bsnaarTitel: 'Warning: 4-string bass',
    bsnaarTekst: 'This song likely uses notes below low E. On a 4-string bass you may not be able to play every note as in the original.',
    alleBassen: 'ALL BASSES',
    alleDetail: 'One scene per bass',
    afgekapt: 'Note: ',
    denktNa: 'Claude is thinking about the sound...',
    laden: 'LOAD',
    jij: 'YOU',
    aiNaam: 'ANAGRAM AI',
    aiTaalInstructie: 'Answer in English.'
  }
};

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.nl[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    var val = t(key);
    if (val) el.placeholder = val;
  });
  document.documentElement.setAttribute('lang', currentLang);
  var sel = document.getElementById('langSelect');
  if (sel) sel.value = currentLang;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('dg_lang', lang);
  applyTranslations();
  // Hervertaling van knop met live tekst
  var btn = document.getElementById('analyzeBtn');
  if (btn && !btn.disabled) document.getElementById('btnText').textContent = t('analyseerTone');
  if (RIG.bassen.length) renderBasSelector();
}

// =====================
// STATE
// =====================
var RIG = { bassen: [] };      // geladen via /api/rig
var selectedBass = null;       // bas-id of 'alle'
var actieveBassen = [];        // bassen in de huidige preset (1 of meer scenes)
var activeScene = null;        // bas-id van de zichtbare scene
var sceneData = {};            // bas-id → { content, html }
var chatVerzoeken = [];        // eerdere aanpassingsverzoeken (alleen tekst)
var currentPresetData = null;

function basVan(id) {
  return RIG.bassen.find(function(b) { return b.id === id; }) || null;
}
function isMeerScene() { return actieveBassen.length > 1; }

// =====================
// BASS SELECTIE
// =====================
function renderBasSelector() {
  var wrap = document.getElementById('bassSelector');
  var knoppen = RIG.bassen.map(function(b) {
    return '<button class="bass-btn" data-bass="' + esc(b.id) + '">'
      + '<span class="bass-name">' + esc(b.naam.toUpperCase()) + '</span>'
      + '<span class="bass-detail">' + esc(b.kort || (b.snaren + '-snarig')) + '</span></button>';
  });
  if (RIG.bassen.length > 1) {
    knoppen.push('<button class="bass-btn bass-btn-dual" data-bass="alle">'
      + '<span class="bass-name">' + esc(t('alleBassen')) + '</span>'
      + '<span class="bass-detail">' + esc(t('alleDetail')) + '</span></button>');
  }
  wrap.className = 'bass-selector bass-selector-' + Math.min(knoppen.length, 3);
  wrap.innerHTML = knoppen.join('');
  if (!selectedBass || (selectedBass !== 'alle' && !basVan(selectedBass))) selectedBass = RIG.bassen[0] && RIG.bassen[0].id;
  wrap.querySelectorAll('.bass-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.bass === selectedBass);
    btn.addEventListener('click', function() {
      wrap.querySelectorAll('.bass-btn').forEach(function(x) { x.classList.remove('active'); });
      btn.classList.add('active');
      selectedBass = btn.dataset.bass;
    });
  });
}

function laadRig() {
  return apiJson('/api/rig').then(function(d) { RIG = d.rig; })
    .catch(function(e) { console.error('Rig laden mislukt:', e.message); })
    .then(renderBasSelector);
}

document.getElementById('artistInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('songInput').focus(); });
document.getElementById('songInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') analyzeTone(); });

// =====================
// LOADING / UI HELPERS
// =====================
function loadingHtml(tekst) {
  return '<div class="loading"><div class="vu"><span></span><span></span><span></span><span></span><span></span><span></span></div><p>' + esc(tekst) + '</p></div>';
}

function zetMeta(artist, song) {
  var basTekst = isMeerScene()
    ? actieveBassen.map(function(id) { var b = basVan(id); return b ? b.naam : id; }).join(' + ')
    : (basVan(actieveBassen[0]) || { naam: '' }).naam;
  document.getElementById('outputMeta').textContent = artist.toUpperCase() + ' — ' + song.toUpperCase() + ' · ' + basTekst.toUpperCase();
}

function renderSceneTabs() {
  var tabs = document.getElementById('sceneTabs');
  if (!isMeerScene()) { tabs.classList.add('hidden'); tabs.innerHTML = ''; return; }
  tabs.classList.remove('hidden');
  tabs.innerHTML = actieveBassen.map(function(id, i) {
    var b = basVan(id);
    return '<button class="scene-tab' + (id === activeScene ? ' active' : '') + '" data-scene="' + esc(id) + '">SCENE ' + (i + 1) + ' — ' + esc((b ? b.naam : id).toUpperCase()) + '</button>';
  }).join('');
  tabs.querySelectorAll('.scene-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { switchScene(btn.dataset.scene); });
  });
}

function sceneLabel(id) {
  var i = actieveBassen.indexOf(id), b = basVan(id);
  return 'SCENE ' + (i + 1) + ' — ' + (b ? b.naam : id).toUpperCase();
}

function zetSceneIndicator() {
  var el = document.getElementById('sceneIndicator');
  if (isMeerScene()) { el.classList.remove('hidden'); el.textContent = t('chatPastScene') + sceneLabel(activeScene); }
  else el.classList.add('hidden');
}

// =====================
// ANALYSEER TONE
// =====================
function analyzeTone() {
  var artist = document.getElementById('artistInput').value.trim();
  var song = document.getElementById('songInput').value.trim();
  if (!artist || !song) { alert(t('vulInVraag')); return; }
  if (!RIG.bassen.length) return;

  actieveBassen = selectedBass === 'alle' ? RIG.bassen.slice(0, 3).map(function(b) { return b.id; }) : [selectedBass];
  activeScene = actieveBassen[0];
  sceneData = {};
  chatVerzoeken = [];
  currentPresetData = null;

  var btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('btnText').textContent = t('analyseren');
  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.add('hidden');
  zetMeta(artist, song);
  document.getElementById('outputContent').innerHTML = loadingHtml(t('bastoneAnalyseren'));
  renderSceneTabs();
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

  trackEvent('analyse', { bass: isMeerScene() ? 'beide' : activeScene });

  function klaar() { btn.disabled = false; document.getElementById('btnText').textContent = t('analyseerTone'); }

  streamChat(
    { modus: 'analyse', artist: artist, song: song, bassen: actieveBassen, extra: document.getElementById('extraInput').value.trim(), taal: currentLang },
    function(partial) {
      var deel = isMeerScene() ? splitScenes(partial)[activeScene] || partial : partial;
      document.getElementById('outputContent').innerHTML = toHtml(deel, activeScene);
    },
    function(fullText, waarschuwing) {
      var correctedArtist = artist, correctedSong = song;
      fullText.split('\n').forEach(function(l) {
        l = l.trim();
        if (l.startsWith('ARTIEST:')) correctedArtist = l.replace('ARTIEST:', '').trim();
        if (l.startsWith('SONG:')) correctedSong = l.replace('SONG:', '').trim();
      });
      var delen = isMeerScene() ? splitScenes(fullText) : {};
      actieveBassen.forEach(function(id) {
        var c = isMeerScene() ? (delen[id] || '') : fullText;
        sceneData[id] = { content: c, html: toHtml(c, id) };
      });
      currentPresetData = { artist: correctedArtist, song: correctedSong, bassen: actieveBassen.slice() };
      document.getElementById('outputContent').innerHTML = sceneData[activeScene].html + waarschuwingHtml(waarschuwing);
      zetMeta(correctedArtist, correctedSong);
      renderSceneTabs();
      document.getElementById('chatPanel').classList.remove('hidden');
      document.getElementById('chatMessages').innerHTML = '';
      zetSceneIndicator();
      addMsg('assistant', isMeerScene() ? t('dualPresetKlaar') : t('presetKlaar'));
      klaar();
    },
    function(err) {
      document.getElementById('outputContent').innerHTML = '<p style="color:var(--accent2)">' + esc(t('fout') + err) + '</p>';
      klaar();
    },
    function(status) {
      if (status === 'denkt na') document.getElementById('outputContent').innerHTML = loadingHtml(t('denktNa'));
    }
  );
}

function waarschuwingHtml(w) {
  return w ? '<p class="afgekapt-melding">' + esc(t('afgekapt') + w) + '</p>' : '';
}

// Splitst een antwoord met meerdere scenes op ==SCENE_<ID>== markers.
function splitScenes(text) {
  var uit = {};
  var re = /==SCENE_([A-Z0-9_-]+)==/gi, m, posities = [];
  while ((m = re.exec(text)) !== null) posities.push({ id: m[1].toLowerCase(), start: m.index, eind: re.lastIndex });
  posities.forEach(function(p, i) {
    var stop = i + 1 < posities.length ? posities[i + 1].start : text.length;
    uit[p.id] = text.substring(p.eind, stop).trim();
  });
  return uit;
}

// =====================
// SCENE WISSELEN
// =====================
function switchScene(scene) {
  if (!isMeerScene() || !sceneData[scene]) return;
  activeScene = scene;
  renderSceneTabs();
  document.getElementById('outputContent').innerHTML = sceneData[scene].html;
  zetSceneIndicator();
}

// =====================
// CHAT
// =====================
function sendChat() {
  var input = document.getElementById('chatInput');
  var msg = input.value.trim();
  if (!msg || !currentPresetData || !sceneData[activeScene]) return;
  input.value = '';
  addMsg('user', msg);
  addMsg('assistant', t('presetBijwerken'));
  var scene = activeScene;
  var vorige = sceneData[scene].content;

  document.getElementById('outputContent').innerHTML = loadingHtml(t('presetBijwerken'));
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });

  streamChat(
    {
      modus: 'chat', basId: scene, taal: currentLang, vraag: msg, preset: vorige,
      context: currentPresetData.artist + ' - ' + currentPresetData.song, geschiedenis: chatVerzoeken.slice(-6)
    },
    function(partial) { document.getElementById('outputContent').innerHTML = toHtml(partial, scene); },
    function(fullText, waarschuwing) {
      chatVerzoeken.push(msg);
      sceneData[scene] = { content: fullText, html: toHtml(fullText, scene) };
      if (activeScene === scene) document.getElementById('outputContent').innerHTML = sceneData[scene].html + waarschuwingHtml(waarschuwing);
      zetLaatsteBericht(t('presetBijgewerkt'));
      trackEvent('chat');
    },
    function(err) {
      document.getElementById('outputContent').innerHTML = sceneData[scene].html;
      zetLaatsteBericht(t('fout') + err);
    }
  );
}

function zetLaatsteBericht(tekst) {
  var lastMsg = document.getElementById('chatMessages').lastElementChild;
  if (lastMsg) { var b = lastMsg.querySelector('.msg-bubble'); if (b) b.textContent = tekst; }
}

// =====================
// STREAM HELPER
// =====================
// payload gaat naar /api/chat; de server bouwt de prompt zelf op.
function streamChat(payload, onChunk, onDone, onError, onStatus) {
  apiFetch('/api/chat', { json: payload })
  .then(function(r) {
    if (!r.ok) {
      return r.json().catch(function() { return {}; }).then(function(d) { throw new Error(d.error || ('HTTP ' + r.status)); });
    }
    var reader = r.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '', fullText = '', waarschuwing = '', fout = '', gerenderd = 0;
    function render() { if (fullText.length !== gerenderd) { gerenderd = fullText.length; onChunk(fullText); } }
    var timer = setInterval(render, 120);
    function read() {
      reader.read().then(function(result) {
        if (result.done) {
          clearInterval(timer);
          if (fout) onError(fout);
          else if (!fullText) onError('Leeg antwoord');
          else { render(); onDone(fullText, waarschuwing); }
          return;
        }
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach(function(line) {
          if (!line.startsWith('data: ')) return;
          var data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            var p = JSON.parse(data);
            if (p.text) fullText += p.text;
            if (p.status && onStatus) onStatus(p.status);
            if (p.waarschuwing) waarschuwing = p.waarschuwing;
            if (p.fout) fout = p.fout;
          } catch (e) {}
        });
        read();
      }).catch(function(e) { clearInterval(timer); onError(e.message); });
    }
    read();
  })
  .catch(function(e) { onError(e.message); });
}

function addMsg(role, text, id) {
  var c = document.getElementById('chatMessages');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  if (id) d.id = id;
  d.innerHTML = '<span class="msg-role">' + esc(role === 'user' ? t('jij') : t('aiNaam')) + '</span>'
    + '<div class="msg-bubble">' + toHtmlSimple(text) + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// =====================
// OPSLAAN & LADEN
// =====================
var presetsCache = {};

function presetScenes() {
  return actieveBassen.map(function(id) { return { basId: id, content: sceneData[id] ? sceneData[id].content : '' }; });
}

function savePreset() {
  if (!currentPresetData) { alert(t('geenPreset')); return; }
  var id = Date.now().toString();
  var datum = new Date().toLocaleDateString(currentLang === 'en' ? 'en-GB' : 'nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  var bestaatAl = Object.keys(presetsCache).some(function(k) {
    return presetsCache[k].artist === currentPresetData.artist && presetsCache[k].song === currentPresetData.song;
  });
  var label = '';
  if (bestaatAl) {
    var inp = window.prompt(t('bestaatAlPrompt'), '');
    if (inp === null) return;
    label = inp.trim();
  }
  var bas = actieveBassen.map(function(b) { var x = basVan(b); return x ? x.naam : b; }).join(' + ');
  var preset = {
    id: id, artist: currentPresetData.artist, song: currentPresetData.song, bass: bas,
    isDual: isMeerScene(), scenes: presetScenes(), datum: datum, label: label
  };
  var btn = document.getElementById('saveBtn');
  btn.disabled = true; btn.textContent = t('opslaanBezig');
  apiJson('/api/presets', { json: { preset: preset } })
  .then(function() {
    presetsCache[id] = preset;
    renderSavedPanel();
    trackEvent('save', { bass: isMeerScene() ? 'beide' : actieveBassen[0] });
    btn.textContent = t('opgeslagen');
    btn.style.color = 'var(--accent)'; btn.style.borderColor = 'var(--accent)';
    setTimeout(function() {
      btn.innerHTML = '<span>&#9632;</span> <span data-i18n="presetOpslaan">' + esc(t('presetOpslaan')) + '</span>';
      btn.style.color = ''; btn.style.borderColor = ''; btn.disabled = false;
    }, 2000);
  })
  .catch(function(e) { alert(t('fout') + e.message); btn.innerHTML = '<span>&#9632;</span> ' + esc(t('presetOpslaan')); btn.disabled = false; });
}

// =====================
// VERTAAL PRESET
// =====================
function translatePreset() {
  if (!currentPresetData || !sceneData[activeScene]) { alert(t('geenContentVertalen')); return; }
  var btn = document.getElementById('translateBtn');
  var scene = activeScene;
  btn.disabled = true;
  btn.innerHTML = '<span>&#8635;</span> ' + esc(t('vertalenBezig'));
  document.getElementById('outputContent').innerHTML = loadingHtml(t('vertalenBezig'));

  function herstelKnop() { btn.innerHTML = '<span>&#8635;</span> ' + esc(t('vertaalKnop')); btn.disabled = false; }

  streamChat(
    { modus: 'vertaal', tekst: sceneData[scene].content, taal: currentLang },
    function(partial) { document.getElementById('outputContent').innerHTML = toHtml(partial, scene); },
    function(fullText) {
      sceneData[scene] = { content: fullText, html: toHtml(fullText, scene) };
      if (activeScene === scene) document.getElementById('outputContent').innerHTML = sceneData[scene].html;
      addMsg('assistant', t('vertaaldKlaar'));
      trackEvent('vertaal');
      herstelKnop();
    },
    function(err) {
      document.getElementById('outputContent').innerHTML = sceneData[scene].html + '<p style="color:var(--accent2)">' + esc(t('fout') + err) + '</p>';
      herstelKnop();
    }
  );
}

// Oude presets bewaarden sceneSpector/scenePbass of content; zet om naar scenes.
function scenesVan(p) {
  if (Array.isArray(p.scenes) && p.scenes.length) return p.scenes;
  if (p.isDual && p.sceneSpector && p.scenePbass) return [{ basId: 'spector', content: p.sceneSpector }, { basId: 'pbass', content: p.scenePbass }];
  var basId = /precision|p-bass/i.test(p.bass || '') ? 'pbass' : 'spector';
  return [{ basId: basId, content: p.content || '' }];
}

function loadPreset(id) {
  var p = presetsCache[id]; if (!p) return;
  var scenes = scenesVan(p);
  actieveBassen = scenes.map(function(s) { return s.basId; });
  activeScene = actieveBassen[0];
  sceneData = {};
  scenes.forEach(function(s) { sceneData[s.basId] = { content: s.content, html: toHtml(s.content, s.basId) }; });
  chatVerzoeken = [];
  currentPresetData = { artist: p.artist, song: p.song, bassen: actieveBassen.slice() };

  zetMeta(p.artist, p.song);
  renderSceneTabs();
  document.getElementById('outputContent').innerHTML = sceneData[activeScene].html;
  zetSceneIndicator();
  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('chatMessages').innerHTML = '';
  addMsg('assistant', t('presetGeladen'));
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
}

function deletePreset(id) {
  if (!window.confirm(t('verwijderenVraag'))) return;
  apiJson('/api/presets', { method: 'DELETE', json: { id: id } })
  .then(function() { delete presetsCache[id]; renderSavedPanel(); })
  .catch(function(e) { alert(t('fout') + e.message); });
}

function renderSavedPanel() {
  var keys = Object.keys(presetsCache).sort(function(a, b) { return b - a; });
  var panel = document.getElementById('savedPanel');
  var list = document.getElementById('savedList');
  if (keys.length === 0) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  list.innerHTML = keys.map(function(id) {
    var p = presetsCache[id];
    var subtitle = (p.bass || '').split('(')[0].trim() + ' · ' + (p.datum || '');
    if (p.label) subtitle += ' · ' + p.label;
    var dualBadge = scenesVan(p).length > 1 ? '<span class="dual-badge">' + scenesVan(p).length + ' SCENES</span>' : '';
    return '<div class="saved-item"><div class="saved-item-header"><div>'
      + '<div class="saved-item-title">' + esc(p.artist) + ' — ' + esc(p.song) + dualBadge + '</div>'
      + '<div class="saved-item-date">' + esc(subtitle) + '</div>'
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

function laadAllePresets() {
  apiJson('/api/presets')
  .then(function(d) { presetsCache = d.presets || {}; renderSavedPanel(); })
  .catch(function(e) { console.error('Presets laden mislukt:', e.message); });
}

// =====================
// API STATUS CHECK
// =====================
function checkApiStatus() {
  var el = document.getElementById('apiStatus');
  if (!el) return;
  fetch('/api/status')
  .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(d) {
    if (d.hasIncident || d.degraded) {
      el.className = 'api-status ' + (d.degraded ? 'err' : 'warn');
      var names = (d.incidents || []).map(function(i) { return i.name; }).join(', ');
      el.innerHTML = '<span class="api-status-dot"></span> ' + (d.degraded ? 'API STORING' : 'API MELDING');
      el.title = names || 'Melding op Anthropic statuspagina';
    } else {
      el.className = 'api-status ok';
      el.innerHTML = '<span class="api-status-dot"></span> API OK';
    }
  })
  .catch(function() {
    el.className = 'api-status ok';
    el.innerHTML = '<span class="api-status-dot"></span> API OK';
  });
}

// =====================
// B-SNAAR DETECTIE
// =====================
function checkBSnaar(tekst) {
  var regels = tekst.toLowerCase().split('\n');
  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (r.startsWith('b_snaar_vereist:')) return r.indexOf('ja') !== -1 || r.indexOf('yes') !== -1;
  }
  return false;
}

// =====================
// VISUELE CONTROLS
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
    + '<text class="knob-center-val" x="30" y="31">' + esc(display) + '</text>'
    + '</svg><div class="knob-label">' + esc(label) + '</div></div>';
}

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
    + '<text class="knob-center-val" x="30" y="31">' + esc(display) + '</text>'
    + '</svg><div class="knob-label">' + esc(label) + '</div></div>';
}

function makeToggle(label, isOn) {
  return '<div class="toggle-wrap">'
    + '<div class="toggle-track ' + (isOn ? 'on' : 'off') + '"><div class="toggle-thumb"></div></div>'
    + '<div class="toggle-val">' + (isOn ? 'ON' : 'OFF') + '</div>'
    + '<div class="toggle-label">' + esc(label) + '</div></div>';
}

function makeSelector(label, options, activeVal) {
  var opts = options.map(function(o) {
    return '<span class="selector-opt' + (o.trim().toLowerCase() === activeVal.trim().toLowerCase() ? ' active' : '') + '">' + esc(o.trim()) + '</span>';
  }).join('');
  return '<div class="selector-wrap"><div class="selector-label">' + esc(label) + '</div><div class="selector-opts">' + opts + '</div></div>';
}

function makeTextBadge(label, value) {
  return '<div class="textbadge-wrap"><div class="textbadge-label">' + esc(label) + '</div><div class="textbadge-val">' + esc(value) + '</div></div>';
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

function renderChainRegel(chainStr) {
  var norm = chainStr.replace(/\u2192/g, '>').replace(/->/g, '>');
  var blokken = norm.split('>').map(function(b) { return b.trim(); }).filter(Boolean);
  var html = '';
  blokken.forEach(function(b, idx) {
    html += '<span class="chain-block">' + esc(b) + '</span>';
    if (idx < blokken.length - 1) html += '<span class="chain-arrow">\u2192</span>';
  });
  return html;
}

// =====================
// HTML RENDERER
// =====================
function vet(tekst) {
  return esc(tekst).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function toHtml(txt, basId) {
  var regels = txt.split('\n');
  var html = '';
  var inBlok = false, blokNaam = '', blokSettings = [], blokUitleg = '';
  var blokTeller = 0, inChain = false, chainHtml = '', inTips = false;

  var bas = basVan(basId);
  if (bas && bas.snaren < 5 && checkBSnaar(txt)) {
    html += '<div class="bsnaar-warning"><span class="bsnaar-icon">⚠</span>'
      + '<div><strong>' + esc(t('bsnaarTitel')) + '</strong><br>' + esc(t('bsnaarTekst')) + '</div></div>';
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
      + '<div class="blok-titel"><span class="blok-nummer">' + blokTeller + '</span><span class="blok-naam">' + esc(blokNaam) + '</span></div>'
      + '<div class="blok-body">' + (blokSettings.length ? visuals : '') + (blokUitleg ? '<div class="blok-uitleg">' + vet(blokUitleg) + '</div>' : '') + '</div></div>';
    inBlok = false; blokNaam = ''; blokSettings = []; blokUitleg = '';
  }
  function sluitChain() { if (!inChain) return; html += '<div class="chain-container">' + chainHtml + '</div>'; chainHtml = ''; inChain = false; }
  function sluitTips() { if (!inTips) return; html += '</div>'; inTips = false; }

  var SECTIE_LABEL = {
    'TONE ANALYSE': currentLang === 'en' ? 'TONE ANALYSIS' : 'TONE ANALYSE',
    'SIGNAALCHAIN': currentLang === 'en' ? 'SIGNAL CHAIN' : 'SIGNAALCHAIN',
    'BLOKKEN':      currentLang === 'en' ? 'BLOCKS' : 'BLOKKEN',
    'FINE-TUNE TIPS': 'FINE-TUNE TIPS'
  };

  for (var i = 0; i < regels.length; i++) {
    var r = regels[i].trim();
    if (!r) continue;
    if (r.toLowerCase().startsWith('b_snaar_vereist:')) continue;
    if (r.startsWith('ARTIEST:') || r.startsWith('SONG:')) continue;
    if (/^==SCENE_[A-Z0-9_-]+==$/i.test(r)) continue;

    if (r.startsWith('## ')) {
      sluitBlok(); sluitChain(); sluitTips();
      var sectie = r.replace('## ', '');
      var displayLabel = esc(SECTIE_LABEL[sectie] || sectie);
      if (sectie === 'SIGNAALCHAIN') { html += '<div class="sectie-titel">' + displayLabel + '</div>'; inChain = true; chainHtml = ''; }
      else if (sectie === 'FINE-TUNE TIPS') { html += '<div class="sectie-titel">' + displayLabel + '</div><div class="tip-box">'; inTips = true; }
      else { html += '<div class="sectie-titel">' + displayLabel + '</div>'; }
      continue;
    }

    if (inChain) {
      if (r === 'SERIEEL') chainHtml += '<div class="chain-row"><span class="parallel-badge" style="border-color:var(--accent);color:var(--accent)">→ ' + (currentLang === 'en' ? 'SERIAL' : 'SERIEEL') + '</span></div>';
      else if (r === 'PARALLEL') chainHtml += '<div class="chain-row"><span class="parallel-badge">⇄ PARALLEL ROUTING</span></div>';
      else if (r.startsWith('CHAIN_A:')) chainHtml += '<div class="chain-row"><span class="chain-label">A</span>' + renderChainRegel(r.replace('CHAIN_A:', '').trim()) + '</div>';
      else if (r.startsWith('CHAIN_B:')) chainHtml += '<div class="chain-row"><span class="chain-label">B</span>' + renderChainRegel(r.replace('CHAIN_B:', '').trim()) + '</div>';
      else if (r.startsWith('CHAIN:')) chainHtml += '<div class="chain-row">' + renderChainRegel(r.replace('CHAIN:', '').trim()) + '</div>';
      else if (r.startsWith('MERGE_NAAR:')) chainHtml += '<div class="chain-row"><span class="chain-merge">⇣ MERGE</span>' + renderChainRegel(r.replace('MERGE_NAAR:', '').trim()) + '</div>';
      else if (r.indexOf('→') !== -1 || r.indexOf('>') !== -1) chainHtml += '<div class="chain-row">' + renderChainRegel(r) + '</div>';
      else chainHtml += '<p style="font-size:0.75rem;color:var(--text-dim);margin:0.25rem 0">' + vet(r) + '</p>';
      continue;
    }

    if (r.startsWith('### ')) { sluitBlok(); blokTeller++; inBlok = true; blokNaam = r.replace('### ', ''); continue; }

    if (inBlok) {
      if (r === 'INSTELLINGEN:' || r === 'SETTINGS:') continue;
      if (r.startsWith('- ')) { blokSettings.push(r); }
      else if (r.startsWith('UITLEG:') || r.startsWith('EXPLANATION:')) {
        blokUitleg = r.replace(/^(UITLEG|EXPLANATION):/, '').trim();
      }
      continue;
    }

    if (inTips) { html += '<p style="margin-bottom:0.5rem">' + vet(r) + '</p>'; continue; }
    html += '<p>' + vet(r) + '</p>';
  }

  sluitBlok(); sluitChain(); sluitTips();
  return html;
}

function toHtmlSimple(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}

// =====================
// TRACKING
// =====================
function trackEvent(event, meta) {
  try {
    fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event, meta: meta || {} })
    }).catch(function() {});
  } catch (e) {}
}

// =====================
// INIT
// =====================
applyTranslations();
laadRig();
laadAllePresets();
checkApiStatus();
setInterval(checkApiStatus, 180000);

if (!sessionStorage.getItem('dg_visit_tracked')) {
  trackEvent('visit');
  sessionStorage.setItem('dg_visit_tracked', '1');
}
