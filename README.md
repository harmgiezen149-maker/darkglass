# Darkglass Anagram Tone Architect

AI-powered tool die op basis van artiest + song een preset-plan genereert voor de Darkglass Anagram.

## Structuur

```
/
├── index.html          Hoofdpagina (app)
├── blocks.html         Blok editor (parameters beheren)
├── stats.html          Gebruiksstatistieken (wachtwoord)
├── js/                 App-logica (i18n, util, bibliotheek, app)
├── shared/             Gedeeld door browser en server: catalogus, validatie, renderer, legacy-omzetting
├── style.css           Styling
├── manifest.json       PWA manifest
├── service-worker.js   PWA service worker (offline + caching)
├── icon-192.png        PWA icoon
├── icon-512.png        PWA icoon
├── vercel.json         Vercel config
├── package.json
└── api/
    ├── chat.js         Anthropic streaming endpoint
    ├── presets.js      Preset opslag (Upstash Redis)
    ├── blocks.js       Blok definities (Upstash Redis)
    ├── status.js       Anthropic API status check
    └── stats.js        Gebruiksstatistieken (Upstash Redis)
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

- AI tone-analyse met visuele preset (knobs, toggles, signaalchain)
- Dual-scene mode (Spector + P-Bass tegelijk)
- Fine-tune chat met live streaming
- Cloud preset-opslag (Upstash Redis)
- Blok editor met samenvouwbare secties
- NL/EN vertaling
- PWA (installeerbaar op startscherm)
- Gebruiksstatistieken + Vercel Analytics
