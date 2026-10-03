// Vertalingen (NL/EN) en taalwissel.
var currentLang = (function() { try { return localStorage.getItem('dg_lang') || 'nl'; } catch (e) { return 'nl'; } })();

var I18N = {
  nl: {
    navBlokken: 'BLOKKEN',
    // stap 3
    serieel: 'SERIEEL',
    toneAnalyse: 'TONE ANALYSE',
    signaalchain: 'SIGNAALCHAIN',
    blokkenTitel: 'BLOKKEN',
    stemming: 'Stemming',
    controleTitel: 'CONTROLE TEGEN DE CATALOGUS',
    controleGerepareerd: 'door Claude gerepareerd',
    controleOk: 'Alles klopt met de catalogus.',
    onderzoekTitel: 'ONDERZOEK & BRONNEN',
    zeker_hoog: 'ZEKER',
    zeker_middel: 'WAARSCHIJNLIJK',
    zeker_laag: 'INSCHATTING',
    bas: 'bas',
    bronnen: 'Bronnen',
    uitCache: 'eerder onderzocht',
    versOnderzoek: 'Opnieuw onderzoeken (cache negeren)',
    onderzoekMislukt: 'Onderzoek niet gelukt: ',
    oudePreset: 'Oude preset omgezet naar het nieuwe formaat. Laat Claude hem met de chat bijwerken voor een volledige controle.',
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
    navBlokken: 'BLOCKS',
    // step 3
    serieel: 'SERIAL',
    toneAnalyse: 'TONE ANALYSIS',
    signaalchain: 'SIGNAL CHAIN',
    blokkenTitel: 'BLOCKS',
    stemming: 'Tuning',
    controleTitel: 'CHECKED AGAINST THE CATALOGUE',
    controleGerepareerd: 'repaired by Claude',
    controleOk: 'Everything matches the catalogue.',
    onderzoekTitel: 'RESEARCH & SOURCES',
    zeker_hoog: 'CONFIRMED',
    zeker_middel: 'LIKELY',
    zeker_laag: 'ESTIMATE',
    bas: 'bass',
    bronnen: 'Sources',
    uitCache: 'researched earlier',
    versOnderzoek: 'Research again (ignore cache)',
    onderzoekMislukt: 'Research failed: ',
    oudePreset: 'Old preset converted to the new format. Ask Claude to update it in the chat for a full check.',
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
  try { localStorage.setItem('dg_lang', lang); } catch (e) {}
  applyTranslations();
  // Hervertaling van knop met live tekst
  var btn = document.getElementById('analyzeBtn');
  if (btn && !btn.disabled) document.getElementById('btnText').textContent = t('analyseerTone');
  if (typeof onTaalGewijzigd === 'function') onTaalGewijzigd();
}

