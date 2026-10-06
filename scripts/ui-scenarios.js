// Scenario's voor scripts/ui-smoke.js. Elk scenario krijgt (page, basisUrl, stap).

async function analyseEnScenes(page, basis, stap) {
  await page.goto(basis + '/');
  await page.waitForSelector('#bassSelector .bass-btn');
  var knoppen = await page.locator('#bassSelector .bass-btn').count();
  stap('bas-keuze komt uit de rig (2 bassen + "alle")', knoppen === 3, 'aantal ' + knoppen);

  await page.click('#bassSelector [data-bass="alle"]');
  await page.fill('#artistInput', 'Tool');
  await page.fill('#songInput', 'Schism');
  await page.click('#analyzeBtn');
  await page.waitForSelector('#chatPanel:not(.hidden)', { timeout: 15000 });
  var tabs = await page.locator('#sceneTabs .scene-tab').count();
  stap('twee scenes na analyse met alle bassen', tabs === 2, 'tabs ' + tabs);
  stap('blokkaarten zichtbaar', await page.locator('#outputContent .blok-kaart').count() >= 2);

  await page.click('#sceneTabs [data-scene="pbass"]');
  stap('B-snaarwaarschuwing bij de 4-snarige P-bass', await page.locator('#outputContent .bsnaar-warning').count() === 1);

  stap('onderzoek met bronnen zichtbaar', await page.locator('#outputContent .onderzoek-box').count() === 1);
  var html = await page.locator('#outputContent').innerHTML();
  stap('bronnen met javascript: worden niet als link getoond', html.indexOf('javascript:') === -1);
  stap('Grunt als keuzelijst uit de catalogus', /selector-opt active">Fat/.test(html));

  await page.fill('#chatInput', 'Iets minder drive');
  await page.click('.send-btn');
  await page.waitForFunction(function() {
    var m = document.querySelectorAll('#chatMessages .msg.assistant .msg-bubble');
    return m.length >= 2 && /25%/.test(m[m.length - 1].textContent);
  }, null, { timeout: 15000 });
  stap('fine-tune chat geeft uitleg en werkt de actieve scene bij', /25%/.test(await page.locator('#outputContent').innerText()));

  await page.click('#translateBtn');
  await page.waitForFunction(function() { return /\[EN\]/.test(document.getElementById('outputContent').textContent); }, null, { timeout: 15000 });
  stap('vertalen vertaalt alleen de tekstvelden', true);

  await page.click('#saveBtn');
  await page.waitForSelector('#savedList .saved-item', { timeout: 10000 });
  stap('preset opgeslagen en zichtbaar in de lijst', true);
}

async function xssWordtGeescaped(page, basis, stap) {
  // Sla een preset op met HTML in de naam via de API en controleer de weergave.
  await page.evaluate(function() {
    return fetch('/api/presets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: { id: 'xss1', artist: '<img src=x onerror="window.__xss=1">', song: 'Test', bass: 'Spector', scenes: [{ basId: 'spector', content: '## TONE ANALYSE\n<b onmouseover=alert(1)>x</b>' }] } })
    });
  });
  await page.reload();
  await page.waitForSelector('#savedList .saved-item');
  var xss = await page.evaluate(function() { return window.__xss; });
  var tekst = await page.locator('#savedList').innerText();
  stap('HTML in presetnamen wordt niet uitgevoerd', !xss && tekst.indexOf('<img') !== -1);

  await page.click('#savedList [data-actie="laad"][data-id="xss1"]');
  await page.waitForSelector('#outputContent .legacy-melding');
  stap('oude tekstpreset wordt omgezet en getoond', !(await page.evaluate(function() { return window.__xss; })));
}

async function verwijderenVraagtBeheer(page, basis, stap) {
  await page.goto(basis + '/');
  await page.waitForSelector('#savedList .saved-item');
  var voor = await page.locator('#savedList .saved-item').count();
  await page.locator('#savedList [data-actie="wis"]').first().click();
  await page.waitForSelector('.login-overlay', { timeout: 5000 });
  stap('verwijderen vraagt om beheerderslogin', true);
  await page.fill('.login-input', process.env.ADMIN_WACHTWOORD);
  await page.click('.login-ok');
  await page.waitForFunction(function(n) { return document.querySelectorAll('#savedList .saved-item').length < n; }, voor, { timeout: 5000 });
  stap('na inloggen is de preset verwijderd', true);
}

module.exports = [analyseEnScenes, xssWordtGeescaped, verwijderenVraagtBeheer];

async function blokEditorEnSync(page, basis, stap) {
  await page.goto(basis + '/blocks.html');
  // Na het vorige scenario is er al een beheerderssessie; anders inloggen.
  if (await page.waitForSelector('.login-overlay', { timeout: 2000 }).catch(function() { return null; })) {
    await page.fill('.login-input', process.env.ADMIN_WACHTWOORD);
    await page.click('.login-ok');
  }
  await page.waitForSelector('#syncInfo:not(:empty)');
  await page.waitForFunction(function() { return /KosmOS/.test(document.getElementById('syncInfo').textContent); });
  stap('sync-paneel toont de catalogusversie', true);

  await page.click('.sectie-chevron >> nth=0');
  await page.click('.blok-chevron >> nth=0');
  var chips = await page.locator('.blok-item >> nth=0 >> .param-chip').count();
  stap('parameters worden als chips getoond', chips >= 3, 'chips ' + chips);

  await page.click('#btnCheck');
  await page.waitForSelector('.voorstel', { timeout: 15000 });
  var aantal = await page.locator('.voorstel').count();
  stap('ZOEK NIEUWE BLOKKEN levert voorstellen op', aantal === 2, 'voorstellen ' + aantal);

  await page.click('text=ALLE NIEUWE OVERNEMEN');
  await page.waitForFunction(function() { return document.querySelectorAll('.voorstel').length === 0; }, null, { timeout: 5000 });
  var namen = await page.locator('.blok-naam-preview').allInnerTexts();
  stap('overgenomen blokken staan in de editor', namen.indexOf('Neural Amp') !== -1 && namen.indexOf('Peggy Classic') !== -1, namen.slice(-3).join(','));

  await page.click('#saveBtn');
  await page.waitForSelector('#statusBar.ok');
  var d = await page.evaluate(function() { return fetch('/api/blocks').then(function(r) { return r.json(); }); });
  var b3k = d.blocks[0].blokken[0];
  stap('opslaan bewaart gestructureerde parameters', Array.isArray(b3k.parameters) && b3k.parameters[0].type === 'knop');
}

module.exports.push(blokEditorEnSync);

async function extrasStap4(page, basis, stap) {
  await page.goto(basis + '/');
  await page.waitForSelector('#bassSelector .bass-btn');
  await page.fill('#artistInput', 'Tool');
  await page.fill('#songInput', 'Schism');
  await page.click('#analyzeBtn');
  await page.waitForSelector('#chatPanel:not(.hidden)', { timeout: 15000 });
  var html = await page.locator('#outputContent').innerHTML();
  stap('songdelen met footswitch zichtbaar', /fs-badge">FS2/.test(html));
  stap('NAM-suggestie met TONE3000-zoeklink', /tone3000\.com/.test(html));

  // waarden zelf aanpassen: foute waarde wordt geweigerd, goede toegepast
  await page.click('text=BEWERK WAARDEN');
  await page.fill('#bw_1_0', '150%');
  await page.click('text=TOEPASSEN');
  stap('bewerken weigert een waarde buiten bereik', /buiten bereik/.test(await page.locator('#bewerkFout').innerText()));
  await page.fill('#bw_1_0', '33');
  await page.fill('#bw_1_0', '33%');
  await page.click('text=TOEPASSEN');
  await page.waitForSelector('#outputContent .blok-kaart');
  stap('handmatige waarde staat in de preset', /33%/.test(await page.locator('#outputContent').innerText()));

  // opslaan, opnieuw aanpassen → versie
  await page.click('#saveBtn');
  await page.waitForFunction(function() { return /OPGESLAGEN|SAVED/.test(document.getElementById('saveBtn').textContent); });
  await page.click('text=BEWERK WAARDEN');
  await page.fill('#bw_1_0', '44%');
  await page.click('text=TOEPASSEN');
  await page.waitForFunction(function() { return /WIJZIGINGEN OPSLAAN|SAVE CHANGES/.test(document.getElementById('saveBtn').textContent); });
  await page.click('#saveBtn');
  await page.waitForSelector('#versieKeuze', { timeout: 5000 });
  stap('na opnieuw opslaan staat er een eerdere versie klaar', await page.locator('#versieKeuze option').count() === 1);

  // feedback
  await page.click('.duim[data-score="1"]');
  await page.check('.fb-tag input[value="te schel"]');
  await page.fill('#fbTags', 'Metal, live');
  await page.click('text=FEEDBACK OPSLAAN');
  await page.waitForFunction(function() { return /Feedback opgeslagen/.test(document.body.innerText); });
  var p = await page.evaluate(function() { return fetch('/api/presets').then(function(r) { return r.json(); }); });
  var bewaard = Object.values(p.presets).find(function(x) { return x.feedback; });
  stap('feedback en tags opgeslagen bij de preset', bewaard && bewaard.feedback.score === 1 && bewaard.tags.join() === 'metal,live');

  // bibliotheek filteren
  await page.selectOption('#filterTag', 'metal');
  var aantal = await page.locator('#savedList .saved-item').count();
  await page.fill('#filterZoek', 'bestaatniet');
  var geen = await page.locator('#savedList .saved-item').count();
  stap('bibliotheek filtert op tag en zoekterm', aantal === 1 && geen === 0, aantal + '/' + geen);
  await page.fill('#filterZoek', '');
  await page.selectOption('#filterTag', '');

  // oefenblad
  var id = bewaard.id;
  await page.goto(basis + '/print.html?preset=' + id);
  await page.waitForFunction(function() { return /song/.test(document.getElementById('status').textContent); });
  stap('oefenblad toont de preset', /Microtubes B3K/.test(await page.locator('#inhoud').innerText()));

  // setlist
  await page.goto(basis + '/setlists.html');
  await page.fill('#nieuweNaam', 'Repetitie');
  await page.click('text=+ NIEUW');
  await page.click('text=+ SONG');
  await page.click('text=OPSLAAN');
  await page.waitForSelector('.setlist-kaart');
  stap('setlist aangemaakt met een song', /1 songs/.test(await page.locator('#setlists').innerText()));

  // rig
  await page.goto(basis + '/rig.html');
  await page.waitForSelector('.bas-kaart');
  await page.fill('#uitgang', 'FRFR thuis');
  await page.click('#opslaan');
  if (await page.waitForSelector('.login-overlay', { timeout: 2000 }).catch(function() { return null; })) {
    await page.fill('.login-input', process.env.ADMIN_WACHTWOORD);
    await page.click('.login-ok');
  }
  await page.waitForFunction(function() { return /Opgeslagen/.test(document.getElementById('melding').textContent); });
  var r = await page.evaluate(function() { return fetch('/api/rig').then(function(x) { return x.json(); }); });
  stap('rig-pagina slaat de speelsituatie op', r.rig.uitgang === 'FRFR thuis');
}

module.exports.push(extrasStap4);

async function navigatieEnBeheer(page, basis, stap) {
  await page.goto(basis + '/');
  stap('knoppen BLOKKEN en BEHEER in de hoofdapp', await page.locator('.top-nav a[href="/blocks.html"]').isVisible() && await page.locator('.top-nav a[href="/beheer.html"]').isVisible());
  await page.click('.top-nav a[href="/beheer.html"]');
  await page.waitForSelector('.tegel');
  stap('beheerpagina toont de tegels', await page.locator('.tegel').count() === 4);
  await page.waitForFunction(function() { return /blokken · KosmOS/.test(document.getElementById('infoBlokken').textContent); });
  stap('blokken-tegel toont aantal en versie', true);
  await page.click('#tegelBlokken');
  await page.waitForSelector('#syncPanel');
  stap('BLOKKEN-tegel opent de blok-editor', true);
  await page.click('a[href="/beheer.html"]');
  await page.waitForSelector('.tegel');
  stap('vanuit de blok-editor terug naar beheer', true);
}

module.exports.push(navigatieEnBeheer);

async function aiModelKeuze(page, basis, stap) {
  await page.goto(basis + '/');
  await page.waitForSelector('#aiKeuze option', { state: 'attached' });
  stap('keuzelijst met 4 combinaties van model en effort', await page.locator('#aiKeuze option').count() === 4);
  await page.selectOption('#aiKeuze', 'claude-sonnet-5-5|medium');
  stap('uitleg past zich aan de keuze aan', /goedkoopst|cheapest/i.test(await page.locator('#aiHint').innerText()));
  await page.reload();
  await page.waitForSelector('#aiKeuze option', { state: 'attached' });
  stap('keuze blijft bewaard na herladen', await page.inputValue('#aiKeuze') === 'claude-sonnet-5-5|medium');
  await page.fill('#artistInput', 'Muse');
  await page.fill('#songInput', 'Hysteria');
  await page.click('#analyzeBtn');
  await page.waitForSelector('#chatPanel:not(.hidden)', { timeout: 15000 });
  stap('resultaat noemt het gebruikte model', /Sonnet 5\.5 · Medium/.test(await page.locator('#chatMessages').innerText()));
  await page.selectOption('#aiKeuze', 'claude-sonnet-5-5|high');
}

module.exports.push(aiModelKeuze);

async function standaardModel(page, basis, stap) {
  var ctx = await page.context().browser().newContext();
  var schoon = await ctx.newPage();
  await schoon.goto(basis + '/');
  await schoon.waitForSelector('#aiKeuze option', { state: 'attached' });
  stap('zonder eerdere keuze staat Sonnet 5.5 · High geselecteerd', await schoon.inputValue('#aiKeuze') === 'claude-sonnet-5-5|high'
    && /Sonnet 5\.5 · High \((standaard|default)\)/.test(await schoon.locator('#aiKeuze option').first().innerText()));
  await ctx.close();
}

module.exports.push(standaardModel);

async function anagramFormaat(page, basis, stap) {
  var A = require('../shared/anagram-preset');
  // Officiële id invullen in de blok-editor (eerste blok)
  await page.goto(basis + '/blocks.html');
  if (await page.waitForSelector('.login-overlay', { timeout: 2000 }).catch(function() { return null; })) {
    await page.fill('.login-input', process.env.ADMIN_WACHTWOORD);
    await page.click('.login-ok');
  }
  await page.waitForSelector('.sectie-chevron');
  await page.click('.sectie-chevron >> nth=0');
  await page.click('.blok-chevron >> nth=0');
  var naam = await page.inputValue('.blok-item >> nth=0 >> [data-veld="naam"]');
  await page.fill('.blok-item >> nth=0 >> [data-veld="uri"]', 'urn:darkglass:test-blok');
  var params = await page.inputValue('.blok-item >> nth=0 >> [data-veld="params"]');
  await page.fill('.blok-item >> nth=0 >> [data-veld="params"]', params.replace(/^([^(,]+?)\s*\(/, '$1 [eerste] ('));
  await page.click('#saveBtn');
  await page.waitForSelector('#statusBar.ok');
  var d = await page.evaluate(function() { return fetch('/api/blocks').then(function(r) { return r.json(); }); });
  var b = d.blocks[0].blokken[0];
  stap('blok-editor bewaart officiële id en symbool', b.naam === naam && b.uri === 'urn:darkglass:test-blok' && b.parameters[0].symbol === 'eerste', JSON.stringify(b).slice(0, 200));

  await page.goto(basis + '/');
  await page.waitForSelector('#bassSelector .bass-btn');
  await page.fill('#artistInput', 'Tool');
  await page.fill('#songInput', 'Schism');
  await page.click('#analyzeBtn');
  await page.waitForSelector('#chatPanel:not(.hidden)', { timeout: 15000 });
  var [download] = await Promise.all([page.waitForEvent('download'), page.click('text=ANAGRAM-FORMAAT')]);
  var pad = await download.path();
  var json = JSON.parse(require('fs').readFileSync(pad, 'utf8'));
  stap('download in het officiële presetformaat is geldig', /\.anagram\.json$/.test(download.suggestedFilename()) && A.controleer(json).length === 0 && json.type === 'preset' && json.version === 1, A.controleer(json).join('; '));
  stap('songdelen staan als scènes in het bestand', JSON.stringify(json.preset.sceneNames) === '{"1":"Refrein"}');
  var info = await page.locator('#anagramInfo').innerText();
  stap('uitleg over de versleuteling zichtbaar', /versleuteld/.test(info) && /officiële id/.test(info) && !/Editor/.test(info));

  // Apparaatgrenzen instellen in de blok-editor en weer leegmaken
  await page.goto(basis + '/blocks.html');
  await page.waitForSelector('#limietenPanel');
  await page.fill('#limMaxBlokken', '3');
  await page.fill('#limIrMap', '/test/irs/');
  await page.click('#btnLimieten');
  await page.waitForFunction(function() { return /grenzen opgeslagen/.test(document.getElementById('statusBar').textContent); });
  var l = await page.evaluate(function() { return fetch('/api/blocks').then(function(r) { return r.json(); }); });
  stap('apparaatgrenzen worden opgeslagen', l.limieten.maxBlokken === 3 && l.limieten.irMap === '/test/irs');
  await page.reload();
  await page.waitForFunction(function() { return document.getElementById('limMaxBlokken').value === '3'; });
  stap('apparaatgrenzen staan na herladen weer in het paneel', true);
  await page.fill('#limMaxBlokken', '');
  await page.fill('#limIrMap', '');
  await page.click('#btnLimieten');
  await page.waitForFunction(function() { return /grenzen opgeslagen/.test(document.getElementById('statusBar').textContent); });
}

module.exports.push(anagramFormaat);

async function snelheid(page, basis, stap) {
  await page.goto(basis + '/');
  await page.waitForSelector('#diepteKeuze');
  stap('onderzoek staat standaard op Laag', await page.inputValue('#diepteKeuze') === 'laag' && /4 zoekopdrachten/.test(await page.locator('#diepteHint').innerText()));
  await page.selectOption('#diepteKeuze', 'hoog');
  await page.reload();
  await page.waitForSelector('#diepteKeuze');
  stap('keuze Hoog blijft bewaard na herladen', await page.inputValue('#diepteKeuze') === 'hoog' && /6 zoekopdrachten/.test(await page.locator('#diepteHint').innerText()));
  await page.waitForSelector('#bassSelector .bass-btn');
  await page.fill('#artistInput', 'Nirvana');
  await page.fill('#songInput', 'Lithium');
  var gedachte = false;
  var kijker = setInterval(function() {
    page.evaluate(function() { return document.getElementById('outputContent').textContent; })
      .then(function(t) { if (/💭/.test(t)) gedachte = true; }).catch(function() {});
  }, 20);
  await page.click('#analyzeBtn');
  await page.waitForSelector('#chatPanel:not(.hidden)', { timeout: 15000 });
  clearInterval(kijker);
  stap('voortgang toont wat de AI denkt', gedachte);
  stap('resultaat noemt de totale tijd', /klaar in \d+ s/.test(await page.locator('#chatMessages').innerText()));
  await page.selectOption('#diepteKeuze', 'laag');

  await page.goto(basis + '/stats.html');
  await page.waitForSelector('#dashView:not(.hidden)', { timeout: 5000 });
  var tekst = await page.locator('#snelheid').innerText();
  stap('stats tonen de snelheid per onderzoeksdiepte', /HOOG/.test(tekst) && /LAATSTE 10/.test(tekst) && /\d+ s/.test(tekst), tekst.slice(0, 120));
}

module.exports.push(snelheid);
