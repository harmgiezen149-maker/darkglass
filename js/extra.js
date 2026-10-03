// Extra's bij een preset: songdelen/footswitches, NAM-suggestie, waarden zelf
// aanpassen, versies, feedback, kopiëren/exporteren en het oefenblad.

Object.assign(I18N.nl, {
  songdelenTitel: 'SONGDELEN & FOOTSWITCHES',
  basisstand: 'basisstand',
  namTitel: 'NAM-CAPTURE SUGGESTIE',
  namZoek: 'Zoek op TONE3000',
  bewerkWaarden: 'BEWERK WAARDEN',
  toepassen: 'TOEPASSEN',
  annuleer: 'ANNULEER',
  kopieer: 'KOPIEER TEKST',
  gekopieerd: 'Gekopieerd!',
  exporteer: 'EXPORT',
  oefenblad: 'OEFENBLAD',
  versies: 'Eerdere versies',
  herstel: 'HERSTEL',
  versieHersteld: 'Eerdere versie teruggezet. Sla op om dit te bewaren.',
  feedbackTitel: 'HOE KLONK HET?',
  feedbackUitleg: 'Je beoordeling en opmerkingen worden meegenomen bij volgende analyses.',
  feedbackNotitie: 'Opmerking (optioneel), bv. "refrein te weinig grom"',
  tagsLabel: 'Tags (komma\'s), bv. live, metal, oefenen',
  feedbackOpslaan: 'FEEDBACK OPSLAAN',
  feedbackOpgeslagen: '✓ Feedback opgeslagen',
  handmatigFout: 'Niet toegepast, controleer: ',
  handmatigOk: '✓ Waarden aangepast.',
  wijzigingenOpslaan: 'WIJZIGINGEN OPSLAAN',
  opgeslagenKort: '✓ OPGESLAGEN',
  alleBassenFilter: 'Alle bassen',
  alleTags: 'Alle tags',
  alleBeoordelingen: 'Alle beoordelingen',
  goed: 'Goed',
  slecht: 'Niet goed',
  nietBeoordeeld: 'Niet beoordeeld',
  nogGeenPresets: 'Nog geen opgeslagen presets.',
  geenResultaten: 'Geen presets gevonden met deze filters.',
  zoekPh: 'Zoek op artiest, song, tag of genre...',
  importeer: 'IMPORT',
  exporteerAlles: 'EXPORT ALLES',
  importLeeg: 'Geen presets gevonden in dit bestand.',
  presetsGeimporteerd: 'presets geïmporteerd.'
});
Object.assign(I18N.en, {
  songdelenTitel: 'SONG SECTIONS & FOOTSWITCHES',
  basisstand: 'base',
  namTitel: 'NAM CAPTURE SUGGESTION',
  namZoek: 'Search on TONE3000',
  bewerkWaarden: 'EDIT VALUES',
  toepassen: 'APPLY',
  annuleer: 'CANCEL',
  kopieer: 'COPY TEXT',
  gekopieerd: 'Copied!',
  exporteer: 'EXPORT',
  oefenblad: 'PRACTICE SHEET',
  versies: 'Earlier versions',
  herstel: 'RESTORE',
  versieHersteld: 'Earlier version restored. Save to keep it.',
  feedbackTitel: 'HOW DID IT SOUND?',
  feedbackUitleg: 'Your rating and notes are used in future analyses.',
  feedbackNotitie: 'Note (optional), e.g. "chorus needs more growl"',
  tagsLabel: 'Tags (commas), e.g. live, metal, practice',
  feedbackOpslaan: 'SAVE FEEDBACK',
  feedbackOpgeslagen: '✓ Feedback saved',
  handmatigFout: 'Not applied, please check: ',
  handmatigOk: '✓ Values updated.',
  wijzigingenOpslaan: 'SAVE CHANGES',
  opgeslagenKort: '✓ SAVED',
  alleBassenFilter: 'All basses',
  alleTags: 'All tags',
  alleBeoordelingen: 'All ratings',
  goed: 'Good',
  slecht: 'Not good',
  nietBeoordeeld: 'Not rated',
  nogGeenPresets: 'No saved presets yet.',
  geenResultaten: 'No presets match these filters.',
  zoekPh: 'Search artist, song, tag or genre...',
  importeer: 'IMPORT',
  exporteerAlles: 'EXPORT ALL',
  importLeeg: 'No presets found in this file.',
  presetsGeimporteerd: 'presets imported.'
});

var FEEDBACK_TAGS = {
  nl: ['te schel', 'te dof', 'te modderig', 'te veel gain', 'te weinig gain', 'te veel compressie', 'te zacht', 'klinkt als het origineel', 'goed live', 'goed thuis'],
  en: ['too bright', 'too dull', 'too muddy', 'too much gain', 'too little gain', 'too compressed', 'too quiet', 'sounds like the original', 'good live', 'good at home']
};

// ---------- songdelen en NAM (onder de preset) ----------
function sceneExtraHtml(scene) {
  var h = '';
  if ((scene.songdelen || []).length) {
    h += '<div class="sectie-titel">' + esc(t('songdelenTitel')) + '</div><div class="songdelen">';
    scene.songdelen.forEach(function(d) {
      h += '<div class="songdeel"><div class="songdeel-kop"><span class="songdeel-naam">' + esc(d.deel) + '</span>'
        + '<span class="fs-badge">' + esc(d.footswitch || t('basisstand')) + '</span></div>'
        + (d.omschrijving ? '<div class="songdeel-tekst">' + esc(d.omschrijving) + '</div>' : '')
        + '<ul class="songdeel-lijst">' + (d.wijzigingen || []).map(function(w) {
          if (w.actie === 'wijzig') return '<li>' + esc(w.label) + ' → ' + esc(w.parameter) + ' <strong>' + esc(w.waarde) + '</strong></li>';
          return '<li>' + esc(w.label) + ' <span class="aanuit ' + (w.actie === 'aan' ? 'aan' : 'uit') + '">' + (w.actie === 'aan' ? 'ON' : 'OFF') + '</span></li>';
        }).join('') + '</ul></div>';
    });
    h += '</div>';
  }
  var n = scene.nam_suggestie;
  if (n && n.versterker) {
    var url = 'https://www.google.com/search?q=' + encodeURIComponent('site:tone3000.com ' + (n.zoekterm || n.versterker));
    h += '<div class="nam-box"><div class="nam-titel">' + esc(t('namTitel')) + '</div>'
      + '<div><strong>' + esc(n.versterker) + '</strong></div>'
      + (n.waarom ? '<div class="songdeel-tekst">' + esc(n.waarom) + '</div>' : '')
      + '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('namZoek')) + ': "' + esc(n.zoekterm || n.versterker) + '" ↗</a></div>';
  }
  return h;
}

// ---------- acties onder de preset ----------
function naRenderScene() {
  renderActies();
  zetOpslaanKnop();
}

function naSceneWijziging(bron) {
  huidig.laatsteBron = bron;
  zetOpslaanKnop();
}

function renderActies() {
  var el = document.getElementById('presetActies');
  if (!el) return;
  if (!huidig) { el.innerHTML = ''; return; }
  var p = huidig.presetId && presetsCache[huidig.presetId];
  var versies = (p && p.versies) || [];
  var h = '<div class="acties-rij">'
    + '<button class="actie-btn" onclick="startBewerken()">' + esc(t('bewerkWaarden')) + '</button>'
    + '<button class="actie-btn" onclick="kopieerTekst(this)">' + esc(t('kopieer')) + '</button>'
    + '<button class="actie-btn" onclick="exporteerHuidig()">' + esc(t('exporteer')) + '</button>'
    + '<button class="actie-btn" onclick="openOefenblad()">' + esc(t('oefenblad')) + '</button>'
    + '</div>';
  if (versies.length) {
    h += '<div class="acties-rij"><select id="versieKeuze" class="text-input versie-select">'
      + versies.map(function(v, i) { return '<option value="' + i + '">' + esc((v.datum || '?') + (v.bron ? ' · ' + v.bron : '')) + '</option>'; }).join('')
      + '</select><button class="actie-btn" onclick="herstelVersie()">' + esc(t('herstel')) + '</button><span class="acties-label">' + esc(t('versies')) + '</span></div>';
  }
  var fb = (p && p.feedback) || {};
  var tags = FEEDBACK_TAGS[currentLang] || FEEDBACK_TAGS.nl;
  h += '<div class="feedback-box"><div class="feedback-titel">' + esc(t('feedbackTitel')) + '</div>'
    + '<div class="feedback-uitleg">' + esc(t('feedbackUitleg')) + '</div>'
    + '<div class="acties-rij"><button class="duim' + (fb.score === 1 ? ' actief' : '') + '" data-score="1">👍</button>'
    + '<button class="duim' + (fb.score === -1 ? ' actief' : '') + '" data-score="-1">👎</button></div>'
    + '<div class="feedback-tags">' + tags.map(function(tg) {
      return '<label class="fb-tag"><input type="checkbox" value="' + esc(tg) + '"' + ((fb.tags || []).indexOf(tg) !== -1 ? ' checked' : '') + '> ' + esc(tg) + '</label>';
    }).join('') + '</div>'
    + '<input class="text-input" id="fbNotitie" placeholder="' + esc(t('feedbackNotitie')) + '" value="' + esc(fb.notitie || '') + '" />'
    + '<input class="text-input" id="fbTags" placeholder="' + esc(t('tagsLabel')) + '" value="' + esc(((p && p.tags) || []).join(', ')) + '" />'
    + '<button class="actie-btn actie-primair" onclick="slaFeedbackOp(this)">' + esc(t('feedbackOpslaan')) + '</button></div>';
  el.innerHTML = h;
  el.querySelectorAll('.duim').forEach(function(b) {
    b.addEventListener('click', function() {
      var actief = b.classList.contains('actief');
      el.querySelectorAll('.duim').forEach(function(x) { x.classList.remove('actief'); });
      if (!actief) b.classList.add('actief');
    });
  });
}

function slaFeedbackOp(btn) {
  var el = document.getElementById('presetActies');
  var duim = el.querySelector('.duim.actief');
  var feedback = {
    score: duim ? parseInt(duim.dataset.score, 10) : 0,
    tags: Array.prototype.map.call(el.querySelectorAll('.fb-tag input:checked'), function(i) { return i.value; }),
    notitie: document.getElementById('fbNotitie').value.trim().slice(0, 500),
    datum: datumTekst()
  };
  var tags = document.getElementById('fbTags').value.split(',').map(function(x) { return x.trim().toLowerCase(); }).filter(Boolean).slice(0, 12);
  var klaar = huidig.presetId && presetsCache[huidig.presetId] && !huidig.gewijzigd ? Promise.resolve(presetsCache[huidig.presetId]) : savePreset();
  klaar.then(function(p) {
    if (!p) return;
    var kopie = JSON.parse(JSON.stringify(presetsCache[p.id]));
    kopie.feedback = feedback;
    kopie.tags = tags;
    return bewaarPreset(kopie).then(function() {
      trackEvent('feedback', { bass: huidig.scenes[0].bas_id });
      btn.textContent = t('feedbackOpgeslagen');
    });
  }).catch(function(e) { alert(t('fout') + e.message); });
}

function herstelVersie() {
  var p = huidig.presetId && presetsCache[huidig.presetId];
  var i = parseInt(document.getElementById('versieKeuze').value, 10);
  if (!p || !p.versies || !p.versies[i]) return;
  huidig.scenes = JSON.parse(JSON.stringify(p.versies[i].scenes));
  huidig.gewijzigd = true;
  huidig.laatsteBron = 'herstel';
  if (!sceneVan(activeScene)) activeScene = huidig.scenes[0].bas_id;
  renderHuidig();
  addMsg('assistant', t('versieHersteld'));
}

// ---------- tekst, export en oefenblad ----------
function sceneAlsTekst(scene) {
  var b = basVan(scene.bas_id);
  var r = [huidig.artiest + ' — ' + huidig.song + (b ? ' (' + b.naam + ')' : '')];
  if (scene.stemming) r.push(t('stemming') + ': ' + scene.stemming);
  r.push('');
  r.push(t('signaalchain') + ': ' + (scene.chain_a || []).join(' > ') + (scene.routing === 'parallel' ? ' | B: ' + (scene.chain_b || []).join(' > ') + ' | MERGE: ' + (scene.merge_naar || []).join(' > ') : ''));
  r.push('');
  (scene.blokken || []).forEach(function(bl, i) {
    r.push((i + 1) + '. ' + (bl.label || bl.blok) + (bl.label && bl.label !== bl.blok ? ' [' + bl.blok + ']' : ''));
    (bl.instellingen || []).forEach(function(ins) { r.push('   ' + ins.parameter + ': ' + ins.waarde); });
  });
  (scene.songdelen || []).forEach(function(d) {
    r.push('');
    r.push(d.deel + (d.footswitch ? ' (' + d.footswitch + ')' : '') + ': ' + (d.wijzigingen || []).map(function(w) {
      return w.actie === 'wijzig' ? w.label + ' ' + w.parameter + ' ' + w.waarde : w.label + ' ' + w.actie;
    }).join(', '));
  });
  if ((scene.tips || []).length) { r.push(''); scene.tips.forEach(function(tip) { r.push('- ' + tip); }); }
  return r.join('\n');
}

function kopieerTekst(btn) {
  var scene = sceneVan(activeScene);
  if (!scene) return;
  var tekst = sceneAlsTekst(scene);
  var oud = btn.textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(tekst) : Promise.reject(new Error('geen klembord')))
    .then(function() { btn.textContent = t('gekopieerd'); setTimeout(function() { btn.textContent = oud; }, 1500); })
    .catch(function() { window.prompt('', tekst); });
}

function exporteerHuidig() {
  var p = huidig.presetId && presetsCache[huidig.presetId];
  var data = p && !huidig.gewijzigd ? p : { artist: huidig.artiest, song: huidig.song, versie: 3, scenes: huidig.scenes, onderzoek: huidig.onderzoek };
  download(bestandsnaam(huidig.artiest + '-' + huidig.song) + '.json', { type: 'darkglass-anagram-presets', versie: 1, presets: [data] });
}

function openOefenblad() {
  try {
    sessionStorage.setItem('dg_oefenblad', JSON.stringify({ artist: huidig.artiest, song: huidig.song, scenes: huidig.scenes, label: huidig.label }));
  } catch (e) {}
  window.open('/print.html?huidig=1', '_blank');
}

// ---------- waarden zelf aanpassen ----------
function startBewerken() {
  var scene = sceneVan(activeScene);
  if (!scene || bezig) return;
  var html = '<div class="bewerk-form">';
  (scene.blokken || []).forEach(function(b, bi) {
    var def = Catalogus.vindBlok(CATALOGUS, b.blok);
    html += '<div class="bewerk-blok"><div class="bewerk-blok-naam">' + esc(b.label || b.blok) + '</div>';
    (b.instellingen || []).forEach(function(ins, ii) {
      var p = def && Catalogus.vindParameter(def, ins.parameter);
      var id = 'bw_' + bi + '_' + ii;
      var veld;
      if (p && (p.type === 'keuze' || p.type === 'schakelaar')) {
        var opties = p.type === 'schakelaar' ? ['On', 'Off'] : p.opties;
        var r = Catalogus.controleerWaarde(p, ins.waarde);
        var actief = r.ok ? r.tekst : ins.waarde;
        veld = '<select class="text-input" id="' + id + '">' + opties.map(function(o) {
          return '<option' + (Catalogus.slug(o) === Catalogus.slug(actief) ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
      } else {
        veld = '<input class="text-input" id="' + id + '" value="' + esc(ins.waarde) + '" />';
      }
      html += '<label class="bewerk-regel"><span>' + esc(ins.parameter) + (p && p.type === 'knop' ? ' <small>(' + esc(Catalogus.formatSpec(p)) + ')</small>' : '') + '</span>' + veld + '</label>';
    });
    html += '</div>';
  });
  html += '<div class="bewerk-fout" id="bewerkFout"></div><div class="acties-rij">'
    + '<button class="actie-btn actie-primair" onclick="pasBewerkingToe()">' + esc(t('toepassen')) + '</button>'
    + '<button class="actie-btn" onclick="renderHuidig()">' + esc(t('annuleer')) + '</button></div></div>';
  document.getElementById('outputContent').innerHTML = html;
}

function pasBewerkingToe() {
  var scene = JSON.parse(JSON.stringify(sceneVan(activeScene)));
  scene.blokken.forEach(function(b, bi) {
    (b.instellingen || []).forEach(function(ins, ii) {
      var el = document.getElementById('bw_' + bi + '_' + ii);
      if (el) ins.waarde = el.value.trim();
    });
  });
  var c = Validatie.controleer(scene, CATALOGUS, {});
  var fouten = c.fouten.filter(function(f) { return f.soort === 'waarde' || f.soort === 'parameter'; });
  if (fouten.length) {
    document.getElementById('bewerkFout').textContent = t('handmatigFout') + fouten.map(function(f) { return f.melding; }).join('; ');
    return;
  }
  scene.blokken.forEach(function(b) {
    var def = Catalogus.vindBlok(CATALOGUS, b.blok);
    (b.instellingen || []).forEach(function(ins) {
      var p = def && Catalogus.vindParameter(def, ins.parameter);
      var r = p && Catalogus.controleerWaarde(p, ins.waarde);
      if (r && r.ok) ins.waarde = r.tekst;
    });
  });
  vervangScene(scene, 'handmatig');
  renderHuidig();
  addMsg('assistant', t('handmatigOk'));
}
