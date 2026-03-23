# 📊 Company Profiles

**Kostenlose Unternehmenssteckbriefe für STOXX 600, S&P 500, DAX 40 und EU-Unternehmen**

Läuft als statische GitHub Pages App – kein Server, kein Backend, keine API-Kosten.

## 🚀 Setup (GitHub Pages)

### 1. Repository anlegen

```bash
# Neues GitHub Repo erstellen (z.B. "company-profiles")
# Dann die Dateien hochladen oder pushen:

git clone https://github.com/DEIN-USERNAME/company-profiles.git
cd company-profiles
# Dateien einkopieren
git add .
git commit -m "Initial commit"
git push
```

### 2. GitHub Pages aktivieren

- GitHub → Repository → **Settings** → **Pages**
- Source: **Deploy from a branch**
- Branch: `main` / `/(root)`
- **Save** → App läuft unter: `https://DEIN-USERNAME.github.io/company-profiles/`

## 📂 Dateistruktur

```
company-profiles/
├── index.html          ← Hauptseite (Suche + Grid)
├── css/
│   └── style.css       ← Design (Dark/Light Mode)
├── js/
│   ├── cache.js        ← LocalStorage Cache (6h TTL)
│   ├── api.js          ← Wikipedia, Yahoo Finance, RSS
│   └── export.js       ← Clipboard, PDF, DOCX Export
└── data/
    └── companies.js    ← Unternehmensdatenbank (~100 Firmen)
```

## 🔌 Datenquellen (alle kostenlos)

| Quelle | Daten | Limits |
|--------|-------|--------|
| **Wikipedia REST API** | Beschreibung, Thumbnail | Kostenlos, unbegrenzt |
| **Wikidata** | ISIN, Gründungsjahr, Mitarbeiter | Kostenlos, unbegrenzt |
| **Yahoo Finance** (inoffiziell) | Aktienkurs, KGV, KBV, Umsatz, ... | Keine offizielle API – kann jederzeit geblockt werden |
| **Google News RSS** | Aktuelle Nachrichten | Kostenlos |
| **Yahoo Finance RSS** | Unternehmens-News | Kostenlos |
| **SEC EDGAR** | US-Geschäftsberichte | Kostenlos |
| **Bundesanzeiger** | DE-Pflichtveröffentlichungen | Kostenlos |
| **DGAP** | DE/EU Kapitalmarktnachrichten | Kostenlos |

### ⚠️ Hinweis zu Yahoo Finance
Yahoo Finance bietet keine offizielle kostenlose API. Die inoffizielle API (`query1.finance.yahoo.com`) funktioniert derzeit direkt aus dem Browser, kann aber jederzeit geblockt werden. Falls das passiert:
- Alternative: [Alpha Vantage](https://www.alphavantage.co/) (kostenloser Tier: 25 Req/Tag)
- Alternative: [Financial Modeling Prep](https://financialmodelingprep.com/) (kostenloser Tier)

## 💡 Features

- **🔍 Suche** über Name, Ticker, Land
- **🏷️ Filter** nach Index (DAX, STOXX600, S&P500, EU) und Branche
- **📊 Steckbrief** mit Aktienkurs, Kennzahlen, Wikipedia-Text, News
- **📋 Klickbare Felder** – jedes Feld einzeln in Zwischenablage kopieren
- **📤 Export** als Markdown (Clipboard), PDF (Druckdialog), Word (.docx)
- **⏱ Cache** – Daten werden 6h im LocalStorage gecacht
- **🌓 Dark/Light Mode**
- **🌐 DE/EN** Sprachumschalter

## ➕ Weitere Unternehmen hinzufügen

In `data/companies.js` ein Objekt einfügen:

```javascript
{ 
  id: "mein-unternehmen",        // URL-safe, einzigartig
  name: "Mein Unternehmen AG",
  ticker: "MUA",
  exchange: "XETRA",             // XETRA, NYSE, NASDAQ, LSE, ...
  country: "DE",                 // ISO 2-Letter
  sector: "Technology",          // Aus den vorhandenen Sektoren
  index: ["DAX", "STOXX600"],   // Array mit Indizes
  wikipedia: "Mein_Unternehmen", // Wikipedia-Seitenname (URL-encoded)
  wikidata: "Q12345"            // Wikidata Q-ID (optional)
}
```

## 🔧 CORS-Proxy

RSS-Feeds von Drittanbietern werden über `corsproxy.io` geladen (kostenlos, Open Source). Bei Problemen kann der Proxy in `js/api.js` getauscht werden:

```javascript
const CORS_PROXY = "https://api.allorigins.win/get?url="; // Alternative
```

## 📜 Lizenz

MIT – frei verwendbar und erweiterbar.
