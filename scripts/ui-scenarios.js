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
