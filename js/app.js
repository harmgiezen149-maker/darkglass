// Hoofdflow: bas kiezen, analyseren, scenes tonen, fine-tunen en vertalen.

var RIG = { bassen: [] };
var CATALOGUS = [];
var LIMIETEN = {};               // grenzen van het apparaat (blok-editor)
var selectedBass = null;          // bas-id of 'alle'
var huidig = null;                // { artiest, song, scenes: [...], onderzoek, presetId, label }
var activeScene = null;           // bas_id van de zichtbare scene
var chatVerzoeken = [];
var bezig = false;

function basVan(id) { return RIG.bassen.find(function(b) { return b.id === id; }) || null; }
function sceneVan(id) { return huidig ? huidig.scenes.find(function(s) { return s.bas_id === id; }) : null; }
function isMeerScene() { return !!huidig && huidig.scenes.length > 1; }

// =====================
// LADEN
// =====================
function laadRig() {
  return apiJson('/api/rig').then(function(d) { RIG = d.rig; })
    .catch(function(e) { console.error('Rig laden mislukt:', e.message); })
    .then(renderBasSelector);
}

function laadCatalogus() {
  return apiJson('/api/blocks').then(function(d) { CATALOGUS = Catalogus.normaliseerCatalogus(d.blocks); LIMIETEN = Catalogus.normaliseerLimieten(d.limieten); })
    .catch(function(e) { console.error('Catalogus laden mislukt:', e.message); });
}

// =====================
// BAS-KEUZE
// =====================
function renderBasSelector() {
  var wrap = document.getElementById('bassSelector');
  var knoppen = RIG.bassen.map(function(b) {
    return '<button class="bass-btn" data-bass="' + esc(b.id) + '"><span class="bass-name">' + esc(b.naam.toUpperCase()) + '</span>'
      + '<span class="bass-detail">' + esc(b.kort || (b.snaren + '-snarig')) + '</span></button>';
  });
  if (RIG.bassen.length > 1) {
    knoppen.push('<button class="bass-btn bass-btn-dual" data-bass="alle"><span class="bass-name">' + esc(t('alleBassen')) + '</span>'
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

// =====================
// AI-MODEL EN EFFORT
// =====================
var AI_OPSLAG = 'dg_ai';

function huidigeAi() {
  var el = document.getElementById('aiKeuze');
  return Modellen.uitWaarde(el ? el.value : '');
}

function aiTekst(ai) {
  return ai ? Modellen.label(ai) : '';
}

function renderAiKeuze() {
  var el = document.getElementById('aiKeuze');
  if (!el) return;
  var bewaard = '';
  try { bewaard = localStorage.getItem(AI_OPSLAG) || ''; } catch (e) {}
  var gekozen = Modellen.uitWaarde(bewaard || el.value);
  var std = Modellen.STANDAARD;
  el.innerHTML = Modellen.opties().map(function(o) {
    var isStd = o.model === std.model && o.effort === std.effort;
    return '<option value="' + esc(o.waarde) + '"' + (o.model === gekozen.model && o.effort === gekozen.effort ? ' selected' : '') + '>'
      + esc(o.label + (isStd ? ' (' + t('standaard') + ')' : '')) + '</option>';
  }).join('');
  zetAiHint();
}

function zetAiHint() {
  var ai = huidigeAi();
  var m = Modellen.model(ai.model);
  var hint = document.getElementById('aiHint');
  if (hint) hint.textContent = t('aiHint_' + (m ? m.kort : 'opus') + '_' + ai.effort);
}

document.getElementById('aiKeuze').addEventListener('change', function() {
  try { localStorage.setItem(AI_OPSLAG, this.value); } catch (e) {}
  zetAiHint();
});

// =====================
// ONDERZOEKSDIEPTE
// =====================
var DIEPTE_OPSLAG = 'dg_onderzoek';

function huidigeDiepte() {
  var el = document.getElementById('diepteKeuze');
  return el && el.value === 'hoog' ? 'hoog' : 'laag';
}

function zetDiepteHint() {
  var hint = document.getElementById('diepteHint');
  if (hint) hint.textContent = t('diepteHint_' + huidigeDiepte());
}

(function() {
  var el = document.getElementById('diepteKeuze');
  if (!el) return;
  try { if (localStorage.getItem(DIEPTE_OPSLAG) === 'hoog') el.value = 'hoog'; } catch (e) {}
  el.addEventListener('change', function() {
    try { localStorage.setItem(DIEPTE_OPSLAG, huidigeDiepte()); } catch (e) {}
    zetDiepteHint();
  });
  zetDiepteHint();
})();

function onTaalGewijzigd() {
  zetDiepteHint();
  renderAiKeuze();
  if (RIG.bassen.length) renderBasSelector();
  if (huidig && !bezig) renderHuidig();
  if (typeof renderBibliotheek === 'function') renderBibliotheek();
}

// =====================
// WEERGAVE
// =====================
function renderCtx(scene) {
  return {
    catalogus: CATALOGUS, bas: basVan(scene.bas_id), t: t,
    extra: typeof sceneExtraHtml === 'function' ? sceneExtraHtml : null
  };
}

function zetMeta() {
  var basTekst = huidig.scenes.map(function(s) { var b = basVan(s.bas_id); return b ? b.naam : s.bas_id; }).join(' + ');
  document.getElementById('outputMeta').textContent = (huidig.artiest + ' — ' + huidig.song + ' · ' + basTekst).toUpperCase()
    + (huidig.label ? ' · ' + huidig.label : '');
}

function renderSceneTabs() {
  var tabs = document.getElementById('sceneTabs');
  if (!isMeerScene()) { tabs.classList.add('hidden'); tabs.innerHTML = ''; return; }
  tabs.classList.remove('hidden');
  tabs.innerHTML = huidig.scenes.map(function(s, i) {
    var b = basVan(s.bas_id);
    return '<button class="scene-tab' + (s.bas_id === activeScene ? ' active' : '') + '" data-scene="' + esc(s.bas_id) + '">SCENE ' + (i + 1) + ' — ' + esc((b ? b.naam : s.bas_id).toUpperCase()) + '</button>';
  }).join('');
  tabs.querySelectorAll('.scene-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { switchScene(btn.dataset.scene); });
  });
}

function zetSceneIndicator() {
  var el = document.getElementById('sceneIndicator');
  if (!isMeerScene()) { el.classList.add('hidden'); return; }
  var i = huidig.scenes.findIndex(function(s) { return s.bas_id === activeScene; });
  var b = basVan(activeScene);
  el.classList.remove('hidden');
  el.textContent = t('chatPastScene') + 'SCENE ' + (i + 1) + ' — ' + (b ? b.naam : activeScene).toUpperCase();
}

function renderHuidig() {
  if (!huidig) return;
  var scene = sceneVan(activeScene) || huidig.scenes[0];
  activeScene = scene.bas_id;
  zetMeta();
  renderSceneTabs();
  zetSceneIndicator();
  var html = '';
  if (huidig.onderzoekFout) html += '<p class="afgekapt-melding">' + esc(huidig.onderzoekFout) + '</p>';
  if (scene.legacy) html += '<p class="legacy-melding">' + esc(t('oudePreset')) + '</p>';
  html += PresetRender.renderOnderzoek(huidig.onderzoek, { t: t });
  html += PresetRender.renderScene(scene, renderCtx(scene));
  document.getElementById('outputContent').innerHTML = html;
  if (typeof naRenderScene === 'function') naRenderScene(scene);
}

function switchScene(id) {
  if (!sceneVan(id) || bezig) return;
  activeScene = id;
  renderHuidig();
}

// =====================
// ANALYSEREN
// =====================
function analyzeTone() {
  var artist = document.getElementById('artistInput').value.trim();
  var song = document.getElementById('songInput').value.trim();
  if (!artist || !song) { alert(t('vulInVraag')); return; }
  if (!RIG.bassen.length || bezig) return;

  var bassen = selectedBass === 'alle' ? RIG.bassen.slice(0, 3).map(function(b) { return b.id; }) : [selectedBass];
  var btn = document.getElementById('analyzeBtn');
  bezig = true;
  btn.disabled = true;
  document.getElementById('btnText').textContent = t('analyseren');
  document.getElementById('outputPanel').classList.remove('hidden');
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('sceneTabs').classList.add('hidden');
  document.getElementById('sceneIndicator').classList.add('hidden');
  document.getElementById('outputMeta').textContent = (artist + ' — ' + song).toUpperCase();
  var log = [], onderzoekHtml = '';
  function toon(tekst) {
    document.getElementById('outputContent').innerHTML = onderzoekHtml + loadingHtml(tekst, log.slice(-8));
  }
  toon(t('bastoneAnalyseren'));
  document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth' });
  trackEvent('analyse', { bass: bassen.length > 1 ? 'beide' : bassen[0] });

  var vers = document.getElementById('versOnderzoek');
  sseVerzoek('/api/analyse', {
    artist: artist, song: song, bassen: bassen, extra: document.getElementById('extraInput').value.trim(),
    taal: currentLang, vers: !!(vers && vers.checked), model: huidigeAi().model, effort: huidigeAi().effort,
    diepte: huidigeDiepte()
  }, function(ev) {
    if (ev.onderzoek) onderzoekHtml = PresetRender.renderOnderzoek(ev.onderzoek, { t: t, open: true });
    if (ev.tekst) { log.push(ev.tekst); toon(ev.tekst); }
  }).then(function(r) {
    huidig = { artiest: r.artiest, song: r.song, scenes: r.scenes, onderzoek: r.onderzoek, onderzoekFout: r.onderzoekFout, kosten: r.kosten, ai: r.ai };
    activeScene = r.scenes[0].bas_id;
    chatVerzoeken = [];
    renderHuidig();
    document.getElementById('chatPanel').classList.remove('hidden');
    document.getElementById('chatMessages').innerHTML = '';
    var details = [r.ai ? aiTekst(r.ai) : '', r.kosten && r.kosten.dollar ? '$' + r.kosten.dollar.toFixed(2) : '',
      r.tijden && r.tijden.totaal ? t('klaarIn') + ' ' + Math.round(r.tijden.totaal / 1000) + ' s' : ''].filter(Boolean).join(' \u00b7 ');
    addMsg('assistant', (isMeerScene() ? t('dualPresetKlaar') : t('presetKlaar')) + (details ? ' (' + details + ')' : ''));
    if (vers) vers.checked = false;
  }).catch(function(e) {
    document.getElementById('outputContent').innerHTML = onderzoekHtml + '<p style="color:var(--accent2)">' + esc(t('fout') + e.message) + '</p>';
  }).then(function() {
    bezig = false;
    btn.disabled = false;
    document.getElementById('btnText').textContent = t('analyseerTone');
  });
}

// =====================
// FINE-TUNE CHAT
// =====================
function sendChat() {
  var input = document.getElementById('chatInput');
  var vraag = input.value.trim();
  var scene = sceneVan(activeScene);
  if (!vraag || !scene || bezig) return;
  input.value = '';
  addMsg('user', vraag);
  addMsg('assistant', t('presetBijwerken'));
  bezig = true;
  var log = [];
  document.getElementById('outputContent').innerHTML = loadingHtml(t('presetBijwerken'));
  sseVerzoek('/api/chat', {
    modus: 'chat', scene: scene, vraag: vraag, taal: currentLang, onderzoek: huidig.onderzoek,
    model: huidigeAi().model, effort: huidigeAi().effort,
    context: huidig.artiest + ' - ' + huidig.song, geschiedenis: chatVerzoeken.slice(-6)
  }, function(ev) {
    if (ev.tekst) { log.push(ev.tekst); document.getElementById('outputContent').innerHTML = loadingHtml(ev.tekst, log.slice(-6)); }
  }).then(function(r) {
    chatVerzoeken.push(vraag);
    if (r.ai) huidig.ai = r.ai;
    vervangScene(r.scene, 'chat');
    zetLaatsteBericht(r.antwoord || t('presetBijgewerkt'));
    trackEvent('chat');
  }).catch(function(e) {
    zetLaatsteBericht(t('fout') + e.message);
  }).then(function() { bezig = false; renderHuidig(); });
}

function vervangScene(nieuw, bron) {
  var i = huidig.scenes.findIndex(function(s) { return s.bas_id === nieuw.bas_id; });
  if (i === -1) return;
  huidig.scenes[i] = nieuw;
  huidig.gewijzigd = true;
  if (typeof naSceneWijziging === 'function') naSceneWijziging(bron);
}

function zetLaatsteBericht(tekst) {
  var last = document.getElementById('chatMessages').lastElementChild;
  if (last) { var b = last.querySelector('.msg-bubble'); if (b) b.innerHTML = toHtmlSimple(tekst); }
}

function addMsg(role, text) {
  var c = document.getElementById('chatMessages');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = '<span class="msg-role">' + esc(role === 'user' ? t('jij') : t('aiNaam')) + '</span><div class="msg-bubble">' + toHtmlSimple(text) + '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function toHtmlSimple(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}

// =====================
// VERTALEN
// =====================
function translatePreset() {
  var scene = sceneVan(activeScene);
  if (!scene || bezig) { if (!scene) alert(t('geenContentVertalen')); return; }
  var btn = document.getElementById('translateBtn');
  bezig = true;
  btn.disabled = true;
  btn.innerHTML = '<span>&#8635;</span> ' + esc(t('vertalenBezig'));
  document.getElementById('outputContent').innerHTML = loadingHtml(t('vertalenBezig'));
  sseVerzoek('/api/chat', { modus: 'vertaal', scene: scene, taal: currentLang, model: huidigeAi().model })
    .then(function(r) { vervangScene(r.scene, 'vertaling'); addMsg('assistant', t('vertaaldKlaar')); trackEvent('vertaal'); })
    .catch(function(e) { addMsg('assistant', t('fout') + e.message); })
    .then(function() {
      bezig = false;
      btn.innerHTML = '<span>&#8635;</span> ' + esc(t('vertaalKnop'));
      btn.disabled = false;
      renderHuidig();
    });
}

// =====================
// INIT
// =====================
document.getElementById('artistInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('songInput').focus(); });
document.getElementById('songInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') analyzeTone(); });

applyTranslations();
renderAiKeuze();
Promise.all([laadRig(), laadCatalogus()]).then(function() {
  if (typeof laadBibliotheek === 'function') laadBibliotheek();
});
checkApiStatus();
checkBlokUpdates();
setInterval(checkApiStatus, 180000);
try {
  if (!sessionStorage.getItem('dg_visit_tracked')) { trackEvent('visit'); sessionStorage.setItem('dg_visit_tracked', '1'); }
} catch (e) {}
