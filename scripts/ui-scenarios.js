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

  await page.fill('#chatInput', 'Iets minder drive');
  await page.click('.send-btn');
  await page.waitForFunction(function() {
    var m = document.querySelectorAll('#chatMessages .msg.assistant .msg-bubble');
    return m.length >= 2 && /bijgewerkt|updated/i.test(m[m.length - 1].textContent);
  }, null, { timeout: 15000 });
  stap('fine-tune chat werkt de actieve scene bij', true);

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
