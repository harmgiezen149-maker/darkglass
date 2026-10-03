# Darkglass Anagram Tone Architect

AI-powered tool die op basis van artiest + song een preset-plan genereert voor de Darkglass Anagram.

## Structuur

```
/
├── index.html          Hoofdpagina (analyse, chat, bibliotheek)
├── beheer.html         Beheer: inloggen/uitloggen en snelkoppelingen naar blokken, rig, setlists, stats
├── blocks.html         Blok-editor + sync met de Darkglass-handleiding
├── rig.html            Mijn rig: bassen, uitgang, speelstijl
├── setlists.html       Setlists samenstellen
├── print.html          Printbaar oefenblad (preset of setlist)
├── stats.html          Gebruik en API-kosten (beheer)
├── auth-ui.js          Escaping + fetch met login-venster
├── js/                 App-logica: i18n, util, bibliotheek, extra (feedback, versies, bewerken), app
├── shared/             Gedeeld door browser en server: catalogus, validatie, renderer, legacy-omzetting
├── style.css, manifest.json, service-worker.js, icon-*.png
├── api/
│   ├── analyse.js      Onderzoek → ontwerp → controle (SSE)
│   ├── chat.js         Fine-tunen en vertalen (SSE)
│   ├── blocks.js       Blokcatalogus
│   ├── blocks-sync.js  Handleiding/release notes uitlezen, voorstellen, cron
│   ├── presets.js      Presets (Redis-hash)
│   ├── setlists.js     Setlists
│   ├── rig.js          Rig
│   ├── login.js        Sessies
│   ├── stats.js        Gebruik en kosten
│   ├── status.js       Anthropic-status
│   └── _lib/           Gedeelde serverlogica (geen endpoints)
├── scripts/            Dev-server, nep-Claude, UI-rooktest
└── tests/              Unit-tests (node --test), ook in GitHub Actions
```

## Environment Variables (Vercel)

| Naam | Omschrijving |
|------|--------------|
| `ANTHROPIC_API_KEY` | Anthropic API-sleutel |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `ADMIN_WACHTWOORD` | Wachtwoord voor beheer: blokken, rig, presets verwijderen, stats. Valt terug op `STATS_WACHTWOORD`. Zonder een van beide is beheer uitgeschakeld. |
| `APP_WACHTWOORD` | *(optioneel)* Als gezet moet je inloggen om de app te gebruiken. Aanrader als de URL publiek is. |
| `SESSION_SECRET` | *(optioneel)* Extra geheim voor de sessie-cookies. |
| `LIMIET_ANALYSES_PER_UUR` | *(optioneel)* Analyses per IP per uur, standaard 20. |
| `LIMIET_CHAT_PER_UUR` | *(optioneel)* Chat/vertaal-verzoeken per IP per uur, standaard 60. |
| `LIMIET_CLAUDE_PER_DAG` | *(optioneel)* Maximaal aantal Claude-aanroepen per dag voor de hele app, standaard 300. |
| `CRON_SECRET` | *(aanbevolen)* Geheim voor de wekelijkse Vercel Cron die controleert of er nieuwe blokken of een nieuwe handleiding zijn. Zonder dit geheim draait de cron niet. |
| `HANDLEIDING_URL` | *(optioneel)* Andere URL voor de Anagram-handleiding (PDF). |
| `SYNC_CRON_RELEASENOTES` | *(optioneel)* `0` = de wekelijkse cron zoekt niet via web search naar release notes (scheelt ca. $0,10 per week). |
| `CLAUDE_MODEL` | *(optioneel)* Ander model dan `claude-opus-5-5`. |
| `CLAUDE_GEEN_FALLBACK` | *(optioneel)* `1` schakelt de server-side fallback uit (bij een weigering door de veiligheidsfilters probeert de API anders zelf een passend model). |

De functies `analyse`, `chat` en `blocks-sync` mogen tot 300 seconden draaien (`vercel.json`). Dat werkt met Vercel *fluid compute*, de standaard voor nieuwe projecten. Op een ouder Hobby-project zonder fluid compute geldt een maximum van 60 s: zet fluid compute dan aan in de projectinstellingen.

## Lokaal draaien

```bash
npm install
npm run dev        # http://localhost:3000, geheugen-Redis en nep-Claude zonder API-sleutel
npm test           # unit-tests
npm run test:ui    # UI-rooktest met Playwright (vereist Playwright)
```

## Deploy via Git Bash

```bash
# Eerste keer: repo klonen
git clone https://github.com/<gebruiker>/<repo>.git
cd <repo>

# Bestanden uit deze zip in de repo-map plaatsen, daarna:
git add .
git commit -m "Update app"
git push

# Vercel deployt automatisch bij elke push naar main
```

## Hoe een analyse werkt

1. **Onderzoek**: MusicBrainz zoekt de juiste opname en de bassist. Daarna zoekt Claude met web search en web fetch naar de bas, de pickups, de versterker, de pedalen, de speeltechniek en de productie. Het resultaat is een *toneprofiel* met per bevinding een zekerheid (zeker / waarschijnlijk / inschatting) en bronnen. Het profiel wordt 180 dagen per song bewaard; vink *Opnieuw onderzoeken* aan om het te verversen.
2. **Ontwerp**: met het toneprofiel, je rig en de blokcatalogus maakt Claude de preset als JSON (structured outputs). Bloknamen komen uit een vaste lijst, dus Claude kan geen blokken verzinnen.
3. **Controle**: de server controleert elke parameter en waarde tegen de catalogus, inclusief bereik, eenheid en keuzes, en ook de signaalketen. Bij fouten repareert Claude de preset één keer. Wat daarna nog niet klopt, wordt automatisch begrensd of weggehaald. Dat zie je onder *Controle tegen de catalogus*.

Fine-tunen en vertalen werken op dezelfde JSON. Bij vertalen worden alleen de tekstvelden vertaald, de waarden niet. Oude presets in tekstformaat worden bij het laden automatisch omgezet.

## Blokken synchroniseren met Darkglass

In de blok-editor (`/blocks.html`) staat het paneel **SYNC MET DARKGLASS**:

- **ZOEK NIEUWE BLOKKEN** controleert of de handleiding gewijzigd is en zoekt via web search naar blokken uit nieuwere KosmOS-versies. Die blokken komen binnen als *onbevestigd*.
- **LEES HANDLEIDING** haalt de officiële PDF op en laat Claude in stappen alle blokken en parameters uitlezen (bereiken, eenheden, keuzes). Kosten: ca. $2–5 per volledige run.
- **UPLOAD PDF** doet hetzelfde met een eigen PDF (max. 3,2 MB; gebruik voor grotere bestanden de URL).

Elke wijziging komt als voorstel binnen (nieuw / gewijzigd / niet in de handleiding). Je kiest per voorstel OVERNEMEN, BEWERK of NEGEREN. Er wordt nooit automatisch iets overschreven. Elke week controleert een Vercel Cron of er iets nieuws is en zet dan de melding **UPDATE BESCHIKBAAR** in de editor.

Parameters worden gestructureerd opgeslagen (type, bereik, eenheid, opties). In de editor typ je ze nog steeds als tekst, bijvoorbeeld `Drive (0-100%), Grunt (Off/Fat/Raw), Bright (On/Off)`. De chips eronder laten zien hoe ze herkend zijn.

## Features

- **Analyse in drie stappen**: onderzoek met bronnen, een preset als JSON, en controle tegen de catalogus (zie hierboven)
- **Blokcatalogus** met gestructureerde parameters, gesynchroniseerd met de officiële handleiding en de release notes
- **Meerdere bassen**: één scene per bas uit je rig, met een B-snaarwaarschuwing voor 4-snarige bassen
- **Songdelen en footswitches**: welke blokken per songdeel aan of uit gaan, met niveaucompensatie
- **NAM-suggestie**: welke capture van de echte versterker je in het Neural-blok laadt, met een zoeklink naar TONE3000
- **Fine-tune chat**: Claude past de preset aan en legt uit wat er veranderde. Je kunt ook zelf waarden bewerken; die worden gecontroleerd
- **Versies**: elke opgeslagen wijziging bewaart de vorige versie (laatste 10), die je kunt terugzetten
- **Feedback die meeleert**: met 👍/👎, tags als "te schel" en notities. Goed beoordeelde presets in hetzelfde genre en terugkerende feedback gaan mee in volgende analyses
- **Bibliotheek**: zoeken en filteren op bas, beoordeling en tag, plus export en import als JSON
- **Setlists en oefenblad**: printbaar per song of per setlist (ook als PDF)
- **Kosten in de stats**: kosten per analyse en per soort aanroep, tokens en zoekopdrachten
- NL/EN, PWA (offline met netwerk-eerst caching), inloggen voor beheer, rate limits

### Direct naar de Anagram exporteren?

Het presetformaat van de Darkglass Suite is niet openbaar. Daarom exporteert de app voorlopig naar JSON, als tekst (KOPIEER TEKST) en als oefenblad. Met een voorbeeldbestand van een preset die uit de Suite is geëxporteerd, kan een directe export worden toegevoegd.
