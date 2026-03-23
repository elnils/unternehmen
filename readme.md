# 📊 Company Profiles – GitHub Actions Setup

Vollautomatische Unternehmenssteckbriefe mit täglichem Daten-Update via GitHub Actions.

---

## ⚡ Einrichtung in 5 Minuten

### 1. Repository anlegen

```bash
# Neues Repo auf GitHub anlegen (z.B. "company-profiles")
# dann:
git clone https://github.com/DEIN-USERNAME/company-profiles.git
cd company-profiles
```

### 2. Dateien kopieren

Alle Dateien aus diesem Zip in das Repo-Verzeichnis kopieren:
```
company-profiles/
├── .github/
│   └── workflows/
│       └── update-data.yml   ← GitHub Actions Workflow
├── scripts/
│   └── fetch_data.py         ← Python Datenabruf-Script
├── data/
│   ├── companies.js          ← Statische Unternehmensliste
│   └── market_data.json      ← Wird automatisch befüllt (leer lassen)
├── js/
│   ├── charts.js
│   ├── export.js
│   └── cache.js
├── css/
│   └── style.css
└── index.html
```

### 3. GitHub Pages aktivieren

```
GitHub Repo → Settings → Pages
→ Source: "GitHub Actions"
→ Speichern
```

> **Wichtig:** Source muss auf **"GitHub Actions"** stehen, **nicht** "Deploy from branch"!

### 4. Erste Daten laden

```
GitHub Repo → Actions → "Update Market Data & Deploy"
→ "Run workflow" → "Run workflow"
```

Der erste Lauf dauert ~5-10 Minuten (alle ~200 Unternehmen).

### 5. Fertig!

Die App ist dann erreichbar unter:
```
https://DEIN-USERNAME.github.io/company-profiles/
```

---

## 🔄 Automatisches Update

Der Workflow läuft automatisch:
- **Mo-Fr 7:00 UTC** – Morgens (Börseneröffnung Europa)
- **Mo-Fr 17:00 UTC** – Nachmittags (Börseneröffnung USA)
- **Sa 7:00 UTC** – Wochendaten
- **Bei jedem Push** auf `main`
- **Manuell** via GitHub Actions → "Run workflow"

---

## 📋 Daten-Update Ablauf

```
GitHub Actions Runner
  │
  ├── scripts/fetch_data.py ausführen
  │     ├── Yahoo Finance (Kurse, Finanzen, Management, Eigentümer)
  │     ├── Wikipedia (Beschreibungen)
  │     ├── Wikidata (ISIN, LEI, Website)
  │     └── Google News RSS (Schlagzeilen)
  │
  ├── data/market_data.json schreiben
  │
  ├── git commit + push (nur bei Änderungen)
  │
  └── GitHub Pages deployen
        └── https://USERNAME.github.io/company-profiles/
```

---

## 📊 Datenstruktur `market_data.json`

```json
{
  "fetchedAt": "2025-01-15T07:03:22+00:00",
  "companyCount": 198,
  "data": {
    "sap": {
      "company": { "id": "sap", "name": "SAP SE", ... },
      "fetchedAt": "2025-01-15T07:03:22+00:00",
      "quote": {
        "price": 198.50,
        "change": 2.30,
        "changePct": 1.17,
        "currency": "EUR",
        "high52": 240.10,
        "low52": 145.20
      },
      "financials": {
        "revenue": 34068000000,
        "grossMargin": 0.724,
        "operatingMargin": 0.241,
        "netIncome": 3365000000,
        "peRatio": 42.3,
        "marketCap": 235000000000,
        "annualIS": [...],
        "quarterlyNI": [...]
      },
      "management": {
        "officers": [
          { "name": "Christian Klein", "title": "CEO", ... }
        ]
      },
      "ownership": { "institutionPct": 0.72, "topInstitutions": [...] },
      "wikipedia": { "extract": "SAP SE ist ein...", "url": "..." },
      "newsDE": [{ "title": "...", "link": "...", "date": "..." }]
    }
  }
}
```

---

## ➕ Unternehmen hinzufügen

In `data/companies.js` eintragen:

```javascript
{
  id: "mein-unternehmen",
  name: "Mein Unternehmen AG",
  ticker: "MUA",          // "-" wenn nicht gelistet
  exchange: "XETRA",
  country: "DE",
  hq: "München, DE",
  sector: "Technology",
  index: ["DAX"],         // oder ["Unlisted"]
  founded: 2001,
  employees: 5000,
  wikipedia: "Mein_Unternehmen_AG",
  wikidata: "Q12345",
  unlisted: true,         // nur wenn nicht gelistet
  tradeRegions: ["Europe","Americas"],
  competitors: ["sap","oracle"]
}
```

Dann einmal pushen → Workflow läuft automatisch.

---

## 🔌 Datenquellen

| Quelle | Was | Rate Limit |
|--------|-----|-----------|
| Yahoo Finance v8/v10 | Kurse, Finanzen, Mgmt, Eigentümer | ~0.4s Delay zwischen Requests |
| Wikipedia REST | Beschreibungen | ~0.3s Delay |
| Wikidata | ISIN, LEI, Website | ~0.3s Delay |
| Google News RSS | Schlagzeilen | Via feedparser |

> Yahoo Finance ist inoffiziell. Falls es blockiert wird: Issues → kommentieren, dann alternative API einbauen (Alpha Vantage, FMP).

---

## 🛠️ Lokal testen

```bash
# Python-Umgebung
pip install requests feedparser

# Daten abrufen (läuft ~5-10 Min für alle Firmen)
python scripts/fetch_data.py

# Lokaler Webserver
python -m http.server 8080
# → http://localhost:8080
```

---

## 📁 Dateistruktur

| Datei | Funktion |
|-------|---------|
| `.github/workflows/update-data.yml` | GitHub Actions: täglicher Fetch + Pages-Deploy |
| `scripts/fetch_data.py` | Python-Script: holt alle Marktdaten |
| `data/companies.js` | Statische Unternehmensliste (~200 Firmen) |
| `data/market_data.json` | **Automatisch generiert** – nicht manuell bearbeiten |
| `data/fetch_log.json` | **Automatisch generiert** – Log des letzten Runs |
| `index.html` | Haupt-App (lädt market_data.json beim Start) |
| `js/charts.js` | Chart.js Wrapper (Preis, Finanz, Eigentümer) |
| `js/export.js` | Export: Markdown / PDF / Word |
| `js/cache.js` | localStorage Cache (nur für manuelle Browser-Calls) |
| `css/style.css` | Design-System |

---

## ❓ Häufige Probleme

**"Page not found" nach Setup**
→ Settings → Pages → Source auf "GitHub Actions" setzen, dann Workflow manuell starten.

**`market_data.json` ist leer / fehlt**
→ Workflow einmal manuell via "Run workflow" starten.

**Workflow schlägt fehl**
→ Actions → letzter Run → Logs prüfen. Meistens Yahoo Finance Rate Limit → einfach nochmal starten.

**Kurs fehlt für ein Unternehmen**
→ Ticker in `companies.js` prüfen. Yahoo Finance Tickers enden manchmal auf `.DE`, `.F`, etc.
