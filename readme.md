# 📊 Company Profiles
Statische GitHub Pages App – kein Server, kein Backend, keine API-Kosten.

---

## 🚀 GitHub Pages Setup

```bash
# 1. GitHub Repo anlegen und Dateien pushen
git init && git add . && git commit -m "Company Profiles v2" && git push

# 2. GitHub → Settings → Pages → Deploy from branch → main / root

# Fertig: https://DEIN-USERNAME.github.io/company-profiles/
```

---

## 📋 Features

### Unternehmensdatenbank
- **DAX 40** – alle 40 Unternehmen
- **MDAX** – ~30 wichtige Vertreter
- **SDAX** – ~17 Unternehmen
- **EURO STOXX 50** – EU-Auswahl
- **Dow Jones 30** – alle 30
- **NASDAQ 100** – Auswahl ~35
- **S&P 500** – wichtigste ~40
- **Nicht gelistet** – DE (Bosch, Schwarz/Lidl, ZF, ZEISS, etc.), CN (BYD, Alibaba, Huawei, CATL, Xiaomi), IN (Tata, Infosys, Wipro, Reliance)

### Filter & Suche
- Index, Land, Branche, Handelsregion
- Volltextsuche über Name, Ticker, Headquarter, Sektor
- Über 30 Branchen-Chips

### Steckbrief (Detail-Panel)
| Tab | Inhalt |
|-----|--------|
| Übersicht | Kurs-KPIs, Stammdaten, Management, Wettbewerber, Wikipedia, Handelszonen |
| Kennzahlen | Umsatz, Rohmarge, EBIT, Nettogewinn, F&E, Steuerquote, Verschuldung, Bewertung, Analysten |
| Kurschart | 12 Monate Linie + Volumen-Balken (Chart.js) |
| 5-Jahres | Jahres-Balkendiagramm + Quartals-Nettogewinn + Detailtabelle |
| Eigentümer | Doughnut-Chart (Institutionell/Insider/Streubesitz) + Top-Investoren |
| News | Google News RSS + Yahoo Finance RSS (automatisch, 6h Cache) |
| Berichte | SEC EDGAR (US), Bundesanzeiger (DE), DGAP, Google-Suche |
| Notizen | Freitextfeld, wird in Export eingebettet |

### Export
- **📋 Markdown** – in Zwischenablage kopieren
- **🖨️ PDF** – Druckdialog öffnen
- **📄 Word (.docx)** – Download via docx.js CDN

### Jedes Feld kopierbar
- KPI-Karten per Klick in Clipboard
- Tabellen-Zeilen per Klick
- Wikipedia-Text per Klick

### Cache-System
- Aktienkurse: 15 Minuten
- Finanzkennzahlen / Wikipedia: 6 Stunden
- Statische Daten (Wiki, Wikidata): 24 Stunden

---

## 🔌 Datenquellen (alle kostenlos)

| Quelle | Daten | Anmerkung |
|--------|-------|-----------|
| **Wikipedia REST API** | Beschreibung, Thumbnail | Kostenlos, stabil |
| **Wikidata** | ISIN, Gründung, LEI, Website | Kostenlos, stabil |
| **Yahoo Finance** (inoffiziell) | Kurse, KGV, Umsatz, Cashflow, Quartalszahlen, Eigentümer, Management | Inoffiziell – kann geblockt werden |
| **Google News RSS** | Aktuelle Nachrichten | Kostenlos |
| **Yahoo Finance RSS** | Ticker-spezifische News | Kostenlos |
| **SEC EDGAR** | US-Geschäftsberichte | Offiziell, kostenlos |
| **Bundesanzeiger** | DE-Pflichtveröffentlichungen | Offiziell, kostenlos |
| **DGAP / EQS** | Kapitalmarktmeldungen | Kostenlos |
| **corsproxy.io** | CORS-Proxy für RSS-Feeds | Kostenloser Open-Source-Proxy |

### ⚠️ Yahoo Finance
Die inoffizielle Yahoo Finance API (`query1.finance.yahoo.com`) funktioniert derzeit direkt aus dem Browser. Es gibt keine offizielle kostenlose Variante. Falls sie geblockt wird:

**Alternativen:**
- [Alpha Vantage](https://www.alphavantage.co/) – 25 Req/Tag kostenlos
- [Financial Modeling Prep](https://financialmodelingprep.com/) – 250 Req/Tag kostenlos
- [Polygon.io](https://polygon.io/) – kostenloser Tier

---

## ➕ Weitere Unternehmen hinzufügen

In `data/companies.js` einfügen:

```javascript
{
  id: "mein-unternehmen",        // Eindeutig, URL-safe
  name: "Mein Unternehmen AG",
  ticker: "MUA",                 // "-" wenn nicht gelistet
  exchange: "XETRA",             // oder "Unlisted"
  country: "DE",
  hq: "München, DE",             // Hauptsitz
  sector: "Technology",          // aus SECTORS-Array
  index: ["DAX"],                // oder ["Unlisted"]
  founded: 2001,
  employees: 5000,               // ungefähr
  wikipedia: "Mein_Unternehmen", // Wikipedia-Seitenname
  wikidata: "Q12345",            // Wikidata-ID (optional)
  unlisted: true,                // nur wenn nicht börsennotiert
  tradeRegions: ["Europe","Americas"],
  competitors: ["anderes-unternehmen-id"]
}
```

---

## 🗂️ Projektstruktur

```
company-profiles/
├── index.html          ← App (alles in einer Datei)
├── css/style.css       ← Design
├── js/
│   ├── cache.js        ← localStorage Cache
│   ├── api.js          ← Alle API-Calls + Formatter
│   ├── charts.js       ← Chart.js Wrapper
│   └── export.js       ← Markdown / PDF / DOCX
└── data/companies.js   ← ~200 Unternehmen
```

---

## 📜 Lizenz
MIT
