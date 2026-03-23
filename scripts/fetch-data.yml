#!/usr/bin/env python3
"""
Company Profiles – Data Fetcher
================================
Fetches market data for all companies in data/companies.js
and writes structured JSON to data/market_data.json

Sources (all free, no API key):
  - Yahoo Finance v8/v10  → quotes + financials
  - Wikipedia REST API    → descriptions
  - Wikidata              → ISIN, LEI, website
  - Google News RSS       → headlines

Run:
  pip install requests feedparser
  python scripts/fetch_data.py
"""

import json, re, time, sys, os, traceback
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
    import feedparser
except ImportError:
    os.system("pip install requests feedparser -q")
    import requests
    import feedparser

# ── Config ────────────────────────────────────────────────────
ROOT      = Path(__file__).parent.parent
DATA_DIR  = ROOT / "data"
OUT_FILE  = DATA_DIR / "market_data.json"
LOG_FILE  = DATA_DIR / "fetch_log.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CompanyProfiles/2.0; +https://github.com)",
    "Accept": "application/json, text/html, */*",
}
TIMEOUT = 12
RATE_DELAY = 0.4     # seconds between Yahoo requests
WIKI_DELAY = 0.3

# ── Load company list from JS ──────────────────────────────────
def load_companies():
    src = (DATA_DIR / "companies.js").read_text(encoding="utf-8")
    # Extract the COMPANIES array JSON-style
    match = re.search(r"const COMPANIES\s*=\s*(\[.*?\]);", src, re.DOTALL)
    if not match:
        raise RuntimeError("Could not parse COMPANIES array from companies.js")
    raw = match.group(1)
    # JS → JSON: remove trailing commas, convert single quotes (minimal)
    raw = re.sub(r",\s*([}\]])", r"\1", raw)       # trailing commas
    raw = re.sub(r"//[^\n]*", "", raw)             # strip comments
    # Replace JS true/false → JSON
    raw = re.sub(r"\btrue\b", "true", raw)
    raw = re.sub(r"\bfalse\b", "false", raw)
    # JS object keys without quotes → add quotes
    raw = re.sub(r'(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', raw)
    try:
        companies = json.loads(raw)
    except json.JSONDecodeError as e:
        # Fallback: try to eval via ast
        print(f"JSON parse failed ({e}), trying ast fallback...")
        import ast
        companies = ast.literal_eval(raw.replace("true","True").replace("false","False").replace("null","None"))
    return companies

# ── Yahoo Finance Quote ────────────────────────────────────────
def fetch_quote(ticker: str) -> dict | None:
    if not ticker or ticker == "-":
        return None
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if not r.ok:
            return None
        d = r.json()
        meta = d.get("chart", {}).get("result", [{}])[0].get("meta", {})
        if not meta:
            return None
        price = meta.get("regularMarketPrice")
        prev  = meta.get("chartPreviousClose") or meta.get("previousClose")
        if not price:
            return None
        chg     = price - prev if prev else 0
        chg_pct = chg / prev * 100 if prev else 0
        return {
            "price":     round(price, 4),
            "prevClose": round(prev, 4) if prev else None,
            "change":    round(chg, 4),
            "changePct": round(chg_pct, 4),
            "currency":  meta.get("currency", ""),
            "high52":    meta.get("fiftyTwoWeekHigh"),
            "low52":     meta.get("fiftyTwoWeekLow"),
            "exchange":  meta.get("exchangeName", ""),
            "marketState": meta.get("marketState", ""),
            "updatedTs": meta.get("regularMarketTime"),
        }
    except Exception as e:
        print(f"  [quote] {ticker}: {e}")
        return None

# ── Yahoo Finance Financials ───────────────────────────────────
def fetch_financials(ticker: str) -> dict | None:
    if not ticker or ticker == "-":
        return None
    mods = "financialData,defaultKeyStatistics,summaryDetail,incomeStatementHistory,incomeStatementHistoryQuarterly"
    url  = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules={mods}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if not r.ok:
            return None
        res = r.json().get("quoteSummary", {}).get("result", [None])[0]
        if not res:
            return None

        fd = res.get("financialData", {})
        ks = res.get("defaultKeyStatistics", {})
        sd = res.get("summaryDetail", {})
        is_ann = res.get("incomeStatementHistory", {}).get("incomeStatementHistory", [])
        is_q   = res.get("incomeStatementHistoryQuarterly", {}).get("incomeStatementHistory", [])

        def r_(obj, key):
            v = obj.get(key, {})
            return v.get("raw") if isinstance(v, dict) else v

        # Annual IS (last 4)
        annual = []
        for y in is_ann:
            rev  = r_(y, "totalRevenue")
            gp   = r_(y, "grossProfit")
            ni   = r_(y, "netIncome")
            ebit = r_(y, "ebit")
            rd   = r_(y, "researchDevelopment")
            tax  = r_(y, "incomeTaxExpense")
            pbt  = r_(y, "pretaxIncome")
            annual.append({
                "date":       r_(y, "endDate") if isinstance(y.get("endDate"), str) else y.get("endDate", {}).get("fmt"),
                "revenue":    rev,
                "grossProfit":gp,
                "grossMargin":round(gp/rev,4) if gp and rev else None,
                "ebit":       ebit,
                "ebitMargin": round(ebit/rev,4) if ebit and rev else None,
                "netIncome":  ni,
                "netMargin":  round(ni/rev,4) if ni and rev else None,
                "rd":         rd,
                "tax":        tax,
                "taxRate":    round(abs(tax)/abs(pbt),4) if tax and pbt else None,
            })

        # Quarterly NI (last 8)
        quarterly = []
        for q in is_q[:8]:
            quarterly.append({
                "date":      q.get("endDate", {}).get("fmt") if isinstance(q.get("endDate"), dict) else q.get("endDate"),
                "revenue":   r_(q, "totalRevenue"),
                "netIncome": r_(q, "netIncome"),
                "ebit":      r_(q, "ebit"),
                "grossProfit": r_(q, "grossProfit"),
            })

        # Effective tax rate from most recent year
        tax_rate = None
        if annual:
            tax_rate = annual[0].get("taxRate")

        return {
            "revenue":        r_(fd, "totalRevenue"),
            "revenueGrowth":  r_(fd, "revenueGrowth"),
            "grossMargin":    r_(fd, "grossMargins"),
            "ebitda":         r_(fd, "ebitda"),
            "ebitdaMargin":   r_(fd, "ebitdaMargins"),
            "operatingMargin":r_(fd, "operatingMargins"),
            "netIncome":      r_(fd, "netIncomeToCommon"),
            "netMargin":      r_(fd, "profitMargins"),
            "eps":            r_(fd, "trailingEps"),
            "epsForward":     r_(ks, "forwardEps"),
            "peRatio":        r_(sd, "trailingPE"),
            "peForward":      r_(sd, "forwardPE"),
            "pbRatio":        r_(ks, "priceToBook"),
            "psRatio":        r_(ks, "priceToSalesTrailing12Months"),
            "evRevenue":      r_(ks, "enterpriseToRevenue"),
            "evEbitda":       r_(ks, "enterpriseToEbitda"),
            "marketCap":      r_(ks, "marketCap") or r_(sd, "marketCap"),
            "enterpriseValue":r_(ks, "enterpriseValue"),
            "roe":            r_(fd, "returnOnEquity"),
            "roa":            r_(fd, "returnOnAssets"),
            "freeCashFlow":   r_(fd, "freeCashflow"),
            "operatingCashFlow":r_(fd,"operatingCashflow"),
            "debtToEquity":   r_(fd, "debtToEquity"),
            "currentRatio":   r_(fd, "currentRatio"),
            "quickRatio":     r_(fd, "quickRatio"),
            "dividendYield":  r_(sd, "dividendYield"),
            "dividendRate":   r_(sd, "dividendRate"),
            "payoutRatio":    r_(sd, "payoutRatio"),
            "beta":           r_(ks, "beta"),
            "sharesOutstanding":r_(ks,"sharesOutstanding"),
            "shortFloat":     r_(ks, "shortPercentOfFloat"),
            "analystRating":  fd.get("recommendationKey"),
            "analystMean":    r_(fd, "recommendationMean"),
            "targetPrice":    r_(fd, "targetMeanPrice"),
            "targetHigh":     r_(fd, "targetHighPrice"),
            "targetLow":      r_(fd, "targetLowPrice"),
            "numAnalysts":    r_(fd, "numberOfAnalystOpinions"),
            "taxRate":        tax_rate,
            "rdInvestment":   annual[0].get("rd") if annual else None,
            "annualIS":       annual,
            "quarterlyNI":    quarterly,
            "grossProfit":    annual[0].get("grossProfit") if annual else None,
        }
    except Exception as e:
        print(f"  [fin] {ticker}: {e}")
        return None

# ── Yahoo Finance Ownership ────────────────────────────────────
def fetch_ownership(ticker: str) -> dict | None:
    if not ticker or ticker == "-":
        return None
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules=majorHoldersBreakdown,institutionOwnership"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if not r.ok:
            return None
        res = r.json().get("quoteSummary", {}).get("result", [None])[0]
        if not res:
            return None

        mh   = res.get("majorHoldersBreakdown", {})
        inst = res.get("institutionOwnership", {}).get("ownershipList", [])

        def rv(obj, k):
            v = obj.get(k, {})
            return v.get("raw") if isinstance(v, dict) else v

        return {
            "insiderPct":      rv(mh, "insidersPercentHeld"),
            "institutionPct":  rv(mh, "institutionsPercentHeld"),
            "floatPct":        rv(mh, "institutionsFloatPercentHeld"),
            "institutionCount":rv(mh, "institutionsCount"),
            "topInstitutions": [
                {
                    "name":   i.get("organization"),
                    "pct":    rv(i, "pctHeld"),
                    "shares": rv(i, "position"),
                    "value":  rv(i, "value"),
                    "change": rv(i, "pctChange"),
                } for i in inst[:8]
            ],
        }
    except Exception as e:
        print(f"  [own] {ticker}: {e}")
        return None

# ── Yahoo Finance Management ───────────────────────────────────
def fetch_management(ticker: str) -> dict | None:
    if not ticker or ticker == "-":
        return None
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules=assetProfile"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if not r.ok:
            return None
        res = r.json().get("quoteSummary", {}).get("result", [None])[0]
        if not res:
            return None
        ap = res.get("assetProfile", {})
        return {
            "description":     ap.get("longBusinessSummary", ""),
            "industry":        ap.get("industry", ""),
            "website":         ap.get("website", ""),
            "fullTimeEmployees":ap.get("fullTimeEmployees"),
            "country":         ap.get("country", ""),
            "city":            ap.get("city", ""),
            "officers": [
                {
                    "name":  o.get("name",""),
                    "title": o.get("title",""),
                    "age":   o.get("age"),
                    "pay":   o.get("totalPay",{}).get("raw") if isinstance(o.get("totalPay"),dict) else None,
                } for o in ap.get("companyOfficers",[])[:6]
            ],
        }
    except Exception as e:
        print(f"  [mgmt] {ticker}: {e}")
        return None

# ── Yahoo Finance 12-month price history ──────────────────────
def fetch_price_history(ticker: str) -> dict | None:
    if not ticker or ticker == "-":
        return None
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1wk&range=1y"
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if not r.ok:
            return None
        result = r.json().get("chart", {}).get("result", [None])[0]
        if not result:
            return None
        ts      = result.get("timestamp", [])
        q       = result.get("indicators", {}).get("quote", [{}])[0]
        closes  = q.get("close", [])
        volumes = q.get("volume", [])
        highs   = q.get("high", [])
        lows    = q.get("low", [])
        return {
            "dates":    [datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d") for t in ts],
            "closes":   [round(v, 2) if v else None for v in closes],
            "volumes":  volumes,
            "highs":    [round(v, 2) if v else None for v in highs],
            "lows":     [round(v, 2) if v else None for v in lows],
            "currency": result.get("meta", {}).get("currency", ""),
        }
    except Exception as e:
        print(f"  [hist] {ticker}: {e}")
        return None

# ── Wikipedia Summary ──────────────────────────────────────────
def fetch_wikipedia(title: str, lang: str = "en") -> dict | None:
    if not title:
        return None
    for l in ([lang, "en"] if lang != "en" else ["en", "de"]):
        try:
            url = f"https://{l}.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}"
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            if not r.ok:
                continue
            d = r.json()
            return {
                "extract":     d.get("extract", ""),
                "thumbnail":   d.get("thumbnail", {}).get("source"),
                "url":         d.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "lang":        l,
                "description": d.get("description", ""),
            }
        except Exception:
            pass
    return None

# ── Wikidata ───────────────────────────────────────────────────
def fetch_wikidata(qid: str) -> dict | None:
    if not qid:
        return None
    try:
        url = f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if not r.ok:
            return None
        entity = r.json().get("entities", {}).get(qid, {})
        claims = entity.get("claims", {})

        def get(pid):
            c = claims.get(pid, [{}])
            return c[0].get("mainsnak", {}).get("datavalue", {}).get("value") if c else None

        isin = get("P946")
        founded_raw = get("P571")
        founded = founded_raw.get("time", "")[:5].lstrip("+") if isinstance(founded_raw, dict) else None
        emp_raw = get("P1128")
        return {
            "isin":    isin,
            "lei":     get("P1278"),
            "website": get("P856"),
            "founded": founded,
            "employees_wikidata": str(round(float(emp_raw.get("amount","0")))) if isinstance(emp_raw, dict) else None,
        }
    except Exception as e:
        print(f"  [wikidata] {qid}: {e}")
        return None

# ── News RSS ───────────────────────────────────────────────────
def fetch_news(company: dict, lang: str = "de") -> list:
    name = company.get("name", "")
    ticker = company.get("ticker", "-")
    results = []

    urls = []
    if lang == "de":
        urls.append(f"https://news.google.com/rss/search?q={requests.utils.quote(name)}&hl=de&gl=DE&ceid=DE:de")
    else:
        urls.append(f"https://news.google.com/rss/search?q={requests.utils.quote(name)}+stock&hl=en-US&gl=US&ceid=US:en")
    if ticker and ticker != "-":
        urls.append(f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=DE&lang=de-DE")

    seen = set()
    for url in urls:
        try:
            feed = feedparser.parse(url)
            for e in feed.entries[:8]:
                title = e.get("title", "").strip()
                if not title or title in seen:
                    continue
                seen.add(title)
                pub = e.get("published", "")
                try:
                    from email.utils import parsedate_to_datetime
                    pub = parsedate_to_datetime(pub).strftime("%d.%m.%Y")
                except Exception:
                    pass
                results.append({
                    "title":  title,
                    "link":   e.get("link", ""),
                    "date":   pub,
                    "source": e.get("source", {}).get("title", "") if isinstance(e.get("source"), dict) else "",
                    "desc":   re.sub("<[^>]+>", "", e.get("summary", ""))[:240],
                })
                if len(results) >= 10:
                    break
        except Exception as ex:
            print(f"  [news] {name}: {ex}")
        if len(results) >= 10:
            break
    return results

# ── Main ──────────────────────────────────────────────────────
def main():
    print(f"\n{'='*60}")
    print(f"  Company Profiles – Data Fetch")
    print(f"  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*60}\n")

    companies = load_companies()
    # Deduplicate by id
    seen_ids = set()
    unique = []
    for c in companies:
        if c["id"] not in seen_ids:
            seen_ids.add(c["id"])
            unique.append(c)
    companies = unique
    print(f"Loaded {len(companies)} companies.\n")

    # Load existing data to preserve what we can't re-fetch
    existing = {}
    if OUT_FILE.exists():
        try:
            existing = json.loads(OUT_FILE.read_text())
        except Exception:
            pass

    output   = {}   # id → data bundle
    log      = { "fetchedAt": datetime.now(timezone.utc).isoformat(), "companies": {} }
    ok_count = 0
    err_count = 0

    for i, company in enumerate(companies):
        cid    = company["id"]
        ticker = company.get("ticker", "-")
        unlisted = company.get("unlisted", False)
        wikipedia = company.get("wikipedia", "")
        wikidata  = company.get("wikidata", "")

        print(f"[{i+1:3d}/{len(companies)}] {company['name']:40s} ({ticker})")
        bundle = {"company": company, "fetchedAt": datetime.now(timezone.utc).isoformat()}
        status = {}

        # ── Quote (skip if unlisted) ───────────────────────────
        if not unlisted and ticker != "-":
            q = fetch_quote(ticker)
            bundle["quote"] = q
            status["quote"] = "ok" if q else "err"
            if q:
                ok_count += 1
            else:
                err_count += 1
            time.sleep(RATE_DELAY)

            # ── Financials ─────────────────────────────────────
            fin = fetch_financials(ticker)
            bundle["financials"] = fin
            status["fin"] = "ok" if fin else "err"
            time.sleep(RATE_DELAY)

            # ── Management ─────────────────────────────────────
            mgmt = fetch_management(ticker)
            bundle["management"] = mgmt
            status["mgmt"] = "ok" if mgmt else "err"
            time.sleep(RATE_DELAY)

            # ── Ownership (every 3rd company to save rate limit)
            if i % 3 == 0:
                own = fetch_ownership(ticker)
                bundle["ownership"] = own
                status["own"] = "ok" if own else "skip"
                time.sleep(RATE_DELAY)
            else:
                # Carry over from last run
                bundle["ownership"] = existing.get(cid, {}).get("ownership")

            # ── Price history (every 2nd to reduce requests) ───
            if i % 2 == 0:
                hist = fetch_price_history(ticker)
                bundle["priceHistory"] = hist
                status["hist"] = "ok" if hist else "err"
                time.sleep(RATE_DELAY)
            else:
                bundle["priceHistory"] = existing.get(cid, {}).get("priceHistory")
        else:
            bundle["quote"]        = None
            bundle["financials"]   = None
            bundle["management"]   = None
            bundle["ownership"]    = None
            bundle["priceHistory"] = None

        # ── Wikipedia (every 3rd to stay gentle) ──────────────
        if wikipedia and i % 3 == 0:
            wiki = fetch_wikipedia(wikipedia, "en")
            bundle["wikipedia"] = wiki
            status["wiki"] = "ok" if wiki else "err"
            time.sleep(WIKI_DELAY)
        else:
            bundle["wikipedia"] = existing.get(cid, {}).get("wikipedia")

        # ── Wikidata (every 5th) ───────────────────────────────
        if wikidata and i % 5 == 0:
            wd = fetch_wikidata(wikidata)
            bundle["wikidata"] = wd
            status["wd"] = "ok" if wd else "err"
            time.sleep(WIKI_DELAY)
        else:
            bundle["wikidata"] = existing.get(cid, {}).get("wikidata")

        # ── News (every 3rd to keep run fast) ─────────────────
        if i % 3 == 0:
            news = fetch_news(company, "de")
            bundle["newsDE"] = news
            status["news"] = f"{len(news)} items"
            time.sleep(WIKI_DELAY)
        else:
            bundle["newsDE"] = existing.get(cid, {}).get("newsDE", [])

        output[cid] = bundle
        log["companies"][cid] = status
        print(f"         {status}")

    # ── Write output ───────────────────────────────────────────
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    final = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "companyCount": len(output),
        "data": output,
    }
    OUT_FILE.write_text(json.dumps(final, ensure_ascii=False, separators=(",", ":")))
    LOG_FILE.write_text(json.dumps(log, indent=2, ensure_ascii=False))

    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"\n{'='*60}")
    print(f"  ✅ Written: {OUT_FILE}  ({size_kb:.0f} KB)")
    print(f"  ✅ Log:     {LOG_FILE}")
    print(f"  Companies processed: {len(output)}")
    print(f"  Quotes OK: {ok_count}  Errors: {err_count}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
