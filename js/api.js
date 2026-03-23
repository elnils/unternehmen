// API module – fetches from Wikipedia, Yahoo Finance (unofficial), RSS
// All calls are CORS-safe and free (no API key needed)

const CORS_PROXY = "https://corsproxy.io/?"; // free CORS proxy for RSS

const API = {

  // ── Wikipedia ────────────────────────────────────────────────
  async getWikipedia(wikiTitle, lang = "de") {
    const cacheKey = `wiki_${lang}_${wikiTitle}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;

    // Try requested language; fall back to EN
    const langs = lang === "de" ? ["de","en"] : ["en","de"];
    for (const l of langs) {
      try {
        const url = `https://${l}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
        const r = await fetch(url);
        if (!r.ok) continue;
        const d = await r.json();
        const result = {
          extract: d.extract || "",
          thumbnail: d.thumbnail?.source || null,
          url: d.content_urls?.desktop?.page || `https://${l}.wikipedia.org/wiki/${wikiTitle}`,
          lang: l,
          title: d.title || wikiTitle,
          description: d.description || ""
        };
        Cache.set(cacheKey, result);
        return result;
      } catch(e) {}
    }
    return null;
  },

  // ── Wikidata (structured facts) ───────────────────────────────
  async getWikidata(qid) {
    const cacheKey = `wikidata_${qid}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;
    try {
      const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const d = await r.json();
      const entity = d.entities[qid];
      const claims = entity.claims || {};
      const get = (pid) => {
        const c = claims[pid];
        if (!c || !c[0]) return null;
        const v = c[0].mainsnak?.datavalue?.value;
        return v;
      };
      const result = {
        isin: get("P946"),
        founded: get("P571")?.time?.substring(1,5),
        employees: get("P1128")?.amount,
        ceo: null, // too complex to extract cleanly
        website: get("P856"),
        revenue: get("P2139")?.amount,
        hq: get("P159"),
        lei: get("P1278"),
      };
      Cache.set(cacheKey, result);
      return result;
    } catch(e) { return null; }
  },

  // ── Yahoo Finance (unofficial, no key needed) ─────────────────
  async getQuote(ticker) {
    const cacheKey = `quote_${ticker}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;
    try {
      // Yahoo Finance v8 – works from browser via CORS
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Yahoo failed");
      const d = await r.json();
      const meta = d.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const result = {
        price: meta.regularMarketPrice,
        currency: meta.currency,
        change: meta.regularMarketPrice - meta.chartPreviousClose,
        changePct: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100).toFixed(2),
        high52: meta.fiftyTwoWeekHigh,
        low52: meta.fiftyTwoWeekLow,
        marketCap: null, // not in v8
        exchange: meta.exchangeName,
        updated: new Date(meta.regularMarketTime * 1000).toLocaleString("de-DE")
      };
      Cache.set(cacheKey, result);
      return result;
    } catch(e) {
      // Fallback: Yahoo Finance v7 quote endpoint
      try {
        const url2 = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&fields=regularMarketPrice,regularMarketChangePercent,marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow,currency,regularMarketChange`;
        const r2 = await fetch(url2);
        if (!r2.ok) return null;
        const d2 = await r2.json();
        const q = d2.quoteResponse?.result?.[0];
        if (!q) return null;
        const result = {
          price: q.regularMarketPrice,
          currency: q.currency,
          change: q.regularMarketChange,
          changePct: q.regularMarketChangePercent?.toFixed(2),
          high52: q.fiftyTwoWeekHigh,
          low52: q.fiftyTwoWeekLow,
          marketCap: q.marketCap,
          updated: new Date().toLocaleString("de-DE")
        };
        Cache.set(cacheKey, result);
        return result;
      } catch(e2) { return null; }
    }
  },

  // ── Yahoo Finance – Key Financials (income statement) ─────────
  async getFinancials(ticker) {
    const cacheKey = `fin_${ticker}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;
    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=financialData,defaultKeyStatistics,summaryDetail`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const d = await r.json();
      const fin = d.quoteSummary?.result?.[0];
      if (!fin) return null;
      const fd = fin.financialData || {};
      const ks = fin.defaultKeyStatistics || {};
      const sd = fin.summaryDetail || {};
      const result = {
        revenue: fd.totalRevenue?.raw,
        revenueGrowth: fd.revenueGrowth?.raw,
        grossProfit: fd.grossProfits?.raw,
        operatingMargin: fd.operatingMargins?.raw,
        netIncome: fd.netIncomeToCommon?.raw,
        eps: fd.trailingEps?.raw,
        peRatio: sd.trailingPE?.raw,
        pbRatio: ks.priceToBook?.raw,
        debtToEquity: fd.debtToEquity?.raw,
        roe: fd.returnOnEquity?.raw,
        roa: fd.returnOnAssets?.raw,
        freeCashFlow: fd.freeCashflow?.raw,
        dividendYield: sd.dividendYield?.raw,
        beta: ks.beta?.raw,
        sharesOutstanding: ks.sharesOutstanding?.raw,
        analystRating: fd.recommendationKey,
        targetPrice: fd.targetMeanPrice?.raw,
        numAnalysts: fd.numberOfAnalystOpinions?.raw,
      };
      Cache.set(cacheKey, result);
      return result;
    } catch(e) { return null; }
  },

  // ── RSS News (via corsproxy) ──────────────────────────────────
  async getNews(company, lang = "de") {
    const cacheKey = `news_${company.id}_${lang}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;

    // Multiple RSS sources for news
    const rssSources = lang === "de" ? [
      `https://corsproxy.io/?${encodeURIComponent(`https://news.google.com/rss/search?q=${encodeURIComponent(company.name)}&hl=de&gl=DE&ceid=DE:de`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://www.finanzen.net/rss/news/${company.ticker}`)}`,
    ] : [
      `https://corsproxy.io/?${encodeURIComponent(`https://news.google.com/rss/search?q=${encodeURIComponent(company.name)}+stock&hl=en&gl=US&ceid=US:en`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${company.ticker}&region=US&lang=en-US`)}`,
    ];

    let articles = [];
    for (const rssUrl of rssSources) {
      try {
        const r = await fetch(rssUrl, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) continue;
        const xml = await r.text();
        const parsed = parseRSS(xml);
        articles.push(...parsed);
        if (articles.length >= 8) break;
      } catch(e) {}
    }

    // Deduplicate by title
    const seen = new Set();
    articles = articles.filter(a => {
      if (seen.has(a.title)) return false;
      seen.add(a.title); return true;
    }).slice(0, 10);

    Cache.set(cacheKey, articles);
    return articles;
  },

  // ── Annual Reports / IR Page lookup ──────────────────────────
  getIRLinks(company) {
    // Known IR page patterns; fallback to Google search
    const domain = company.website || null;
    const links = [];
    if (domain) {
      links.push({ label: "Investor Relations", url: domain + "/investors" });
    }
    // SEC EDGAR for US companies
    if (company.country === "US") {
      links.push({
        label: "SEC Filings (EDGAR)",
        url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(company.name)}&action=getcompany&type=10-K&dateb=&owner=include&count=10`
      });
    }
    // Bundesanzeiger for DE
    if (company.country === "DE") {
      links.push({
        label: "Bundesanzeiger",
        url: `https://www.bundesanzeiger.de/pub/de/search?fulltext=${encodeURIComponent(company.name)}`
      });
      links.push({
        label: "DGAP-Meldungen",
        url: `https://dgap.de/dgap/Public/search/?q=${encodeURIComponent(company.name)}`
      });
    }
    // Annual report search fallback
    links.push({
      label: "Geschäftsbericht (Suche)",
      url: `https://www.google.com/search?q=${encodeURIComponent(company.name)}+Geschäftsbericht+${new Date().getFullYear()-1}+PDF`
    });
    links.push({
      label: "Annual Report (Search)",
      url: `https://www.google.com/search?q=${encodeURIComponent(company.name)}+annual+report+${new Date().getFullYear()-1}+PDF`
    });
    return links;
  }
};

// ── RSS XML Parser ────────────────────────────────────────────────
function parseRSS(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const items = doc.querySelectorAll("item");
  const results = [];
  items.forEach(item => {
    const title = item.querySelector("title")?.textContent?.trim() || "";
    const link = item.querySelector("link")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const source = item.querySelector("source")?.textContent?.trim() || "";
    const desc = item.querySelector("description")?.textContent?.replace(/<[^>]*>/g,"").trim().substring(0, 200) || "";
    if (title && link) {
      results.push({
        title: title.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">"),
        link,
        date: pubDate ? new Date(pubDate).toLocaleDateString("de-DE") : "",
        source,
        desc
      });
    }
  });
  return results;
}

// ── Format helpers ─────────────────────────────────────────────
function formatNum(n, currency = "") {
  if (n === null || n === undefined) return "–";
  const abs = Math.abs(n);
  let s;
  if (abs >= 1e12) s = (n/1e12).toFixed(2) + " Bil.";
  else if (abs >= 1e9) s = (n/1e9).toFixed(2) + " Mrd.";
  else if (abs >= 1e6) s = (n/1e6).toFixed(2) + " Mio.";
  else s = n.toLocaleString("de-DE");
  return currency ? `${s} ${currency}` : s;
}

function formatPct(n) {
  if (n === null || n === undefined) return "–";
  return (n * 100).toFixed(1) + "%";
}
