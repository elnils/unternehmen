// ============================================================
//  API MODULE
//  Sources: Wikipedia, Wikidata, Yahoo Finance (unofficial),
//           Google News RSS, Yahoo Finance RSS
//  All free, no API key required
// ============================================================

const API = {

  // ── Wikipedia Summary ─────────────────────────────────────
  async getWikipedia(title, lang = "de") {
    const key = `wiki_${lang}_${title}`;
    const cached = Cache.get(key);
    if (cached) return cached;
    for (const l of lang === "de" ? ["de","en"] : ["en","de"]) {
      try {
        const r = await fetch(`https://${l}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!r.ok) continue;
        const d = await r.json();
        const res = {
          extract: d.extract || "",
          thumbnail: d.thumbnail?.source || null,
          url: d.content_urls?.desktop?.page || `https://${l}.wikipedia.org/wiki/${title}`,
          lang: l, title: d.title || title, description: d.description || ""
        };
        Cache.set(key, res, CACHE_TTL_LONG);
        return res;
      } catch(e) {}
    }
    return null;
  },

  // ── Wikidata Structured Facts ──────────────────────────────
  async getWikidata(qid) {
    if (!qid) return null;
    const key = `wikidata_${qid}`;
    const cached = Cache.get(key);
    if (cached) return cached;
    try {
      const r = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
      if (!r.ok) return null;
      const d = await r.json();
      const entity = d.entities[qid];
      const claims = entity?.claims || {};
      const get = pid => claims[pid]?.[0]?.mainsnak?.datavalue?.value ?? null;
      const getLabel = pid => {
        const v = claims[pid]?.[0]?.mainsnak?.datavalue?.value;
        if (!v) return null;
        return v.id || null; // wikidata entity ID
      };
      const res = {
        isin: get("P946"),
        founded: get("P571")?.time?.substring(1, 5),
        employees: get("P1128")?.amount ? Math.round(Number(get("P1128").amount)).toLocaleString("de-DE") : null,
        website: get("P856"),
        lei: get("P1278"),
        ceo: getLabel("P169"),
        hqEntity: getLabel("P159"),
        stockSymbol: get("P249"),
        revenue: get("P2139"),
        netIncome: get("P2295"),
        totalAssets: get("P2403"),
        equityOwner: getLabel("P127"),
      };
      Cache.set(key, res, CACHE_TTL_LONG);
      return res;
    } catch(e) { return null; }
  },

  // ── Yahoo Finance – Current Quote ─────────────────────────
  async getQuote(ticker) {
    if (!ticker || ticker === "-") return null;
    const key = `quote_${ticker}`;
    const cached = Cache.get(key);
    if (cached) return { ...cached, _cached: true };
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      const meta = d.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const res = {
        price: meta.regularMarketPrice,
        prevClose: meta.chartPreviousClose,
        change: meta.regularMarketPrice - meta.chartPreviousClose,
        changePct: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100),
        currency: meta.currency,
        high52: meta.fiftyTwoWeekHigh,
        low52: meta.fiftyTwoWeekLow,
        exchange: meta.exchangeName,
        marketState: meta.marketState,
        updatedTs: meta.regularMarketTime * 1000
      };
      Cache.set(key, res, CACHE_TTL_SHORT);
      return res;
    } catch(e) { return null; }
  },

  // ── Yahoo Finance – Full Financials ───────────────────────
  async getFinancials(ticker) {
    if (!ticker || ticker === "-") return null;
    const key = `fin_${ticker}`;
    const cached = Cache.get(key);
    if (cached) return cached;
    try {
      const mods = "financialData,defaultKeyStatistics,summaryDetail,incomeStatementHistory,incomeStatementHistoryQuarterly,earningsHistory,earningsTrend";
      const r = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${mods}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) return null;
      const d = await r.json();
      const res = d.quoteSummary?.result?.[0];
      if (!res) return null;
      const fd = res.financialData || {};
      const ks = res.defaultKeyStatistics || {};
      const sd = res.summaryDetail || {};
      const is = res.incomeStatementHistory?.incomeStatementHistory || [];
      const isq = res.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
      const et = res.earningsTrend?.trend || [];

      // Annual income statement (last 4 years)
      const annualIS = is.map(y => ({
        date: y.endDate?.fmt,
        revenue: y.totalRevenue?.raw,
        grossProfit: y.grossProfit?.raw,
        ebit: y.ebit?.raw,
        netIncome: y.netIncome?.raw,
        rd: y.researchDevelopment?.raw,
        tax: y.incomeTaxExpense?.raw,
        totalExpenses: y.totalOperatingExpenses?.raw,
        incomeBeforeTax: y.incomeBeforeExpensesTax?.raw || y.pretaxIncome?.raw,
      }));

      // Quarterly net income (last 8Q)
      const quarterlyNI = isq.map(q => ({
        date: q.endDate?.fmt,
        revenue: q.totalRevenue?.raw,
        netIncome: q.netIncome?.raw,
        ebit: q.ebit?.raw,
        grossProfit: q.grossProfit?.raw,
      }));

      const fin = {
        // Current
        revenue: fd.totalRevenue?.raw,
        revenueGrowth: fd.revenueGrowth?.raw,
        grossProfit: null, // from IS
        grossMargin: fd.grossMargins?.raw,
        ebitda: fd.ebitda?.raw,
        ebitdaMargin: fd.ebitdaMargins?.raw,
        operatingMargin: fd.operatingMargins?.raw,
        netIncome: fd.netIncomeToCommon?.raw,
        netMargin: fd.profitMargins?.raw,
        eps: fd.trailingEps?.raw,
        epsForward: ks.forwardEps?.raw,
        peRatio: sd.trailingPE?.raw,
        peForward: sd.forwardPE?.raw,
        pbRatio: ks.priceToBook?.raw,
        psRatio: ks.priceToSalesTrailing12Months?.raw,
        evRevenue: ks.enterpriseToRevenue?.raw,
        evEbitda: ks.enterpriseToEbitda?.raw,
        marketCap: ks.marketCap?.raw || sd.marketCap?.raw,
        enterpriseValue: ks.enterpriseValue?.raw,
        roe: fd.returnOnEquity?.raw,
        roa: fd.returnOnAssets?.raw,
        roic: null,
        freeCashFlow: fd.freeCashflow?.raw,
        operatingCashFlow: fd.operatingCashflow?.raw,
        debtToEquity: fd.debtToEquity?.raw,
        currentRatio: fd.currentRatio?.raw,
        quickRatio: fd.quickRatio?.raw,
        dividendYield: sd.dividendYield?.raw,
        dividendRate: sd.dividendRate?.raw,
        payoutRatio: sd.payoutRatio?.raw,
        beta: ks.beta?.raw,
        sharesOutstanding: ks.sharesOutstanding?.raw,
        shortFloat: ks.shortPercentOfFloat?.raw,
        analystRating: fd.recommendationKey,
        analystMean: fd.recommendationMean?.raw,
        targetPrice: fd.targetMeanPrice?.raw,
        targetHigh: fd.targetHighPrice?.raw,
        targetLow: fd.targetLowPrice?.raw,
        numAnalysts: fd.numberOfAnalystOpinions?.raw,
        taxRate: null, // computed from IS
        // Historical
        annualIS,
        quarterlyNI,
        earningsTrend: et,
      };

      // Compute gross margin from IS if available
      if (annualIS.length > 0 && annualIS[0].revenue && annualIS[0].grossProfit) {
        fin.grossProfit = annualIS[0].grossProfit;
      }
      // Effective tax rate
      if (annualIS.length > 0) {
        const y = annualIS[0];
        if (y.incomeBeforeTax && y.tax) {
          fin.taxRate = Math.abs(y.tax) / Math.abs(y.incomeBeforeTax);
        }
        fin.rdInvestment = y.rd;
      }

      Cache.set(key, fin, CACHE_TTL_MED);
      return fin;
    } catch(e) { return null; }
  },

  // ── Yahoo Finance – 12-month Price History ─────────────────
  async getPriceHistory(ticker) {
    if (!ticker || ticker === "-") return null;
    const key = `hist_${ticker}`;
    const cached = Cache.get(key);
    if (cached) return cached;
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1wk&range=1y`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) return null;
      const d = await r.json();
      const result = d.chart?.result?.[0];
      if (!result) return null;
      const ts = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      const volumes = result.indicators?.quote?.[0]?.volume || [];
      const highs = result.indicators?.quote?.[0]?.high || [];
      const lows = result.indicators?.quote?.[0]?.low || [];
      const res = {
        dates: ts.map(t => new Date(t * 1000).toISOString().substring(0, 10)),
        closes: closes.map(v => v ? parseFloat(v.toFixed(2)) : null),
        volumes: volumes,
        highs: highs.map(v => v ? parseFloat(v.toFixed(2)) : null),
        lows: lows.map(v => v ? parseFloat(v.toFixed(2)) : null),
        currency: result.meta?.currency
      };
      Cache.set(key, res, CACHE_TTL_MED);
      return res;
    } catch(e) { return null; }
  },

  // ── Yahoo Finance – Ownership / Holders ────────────────────
  async getOwnership(ticker) {
    if (!ticker || ticker === "-") return null;
    const key = `own_${ticker}`;
    const cached = Cache.get(key);
    if (cached) return cached;
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=majorHoldersBreakdown,institutionOwnership,insiderHolders`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) return null;
      const d = await r.json();
      const res2 = d.quoteSummary?.result?.[0];
      if (!res2) return null;
      const mh = res2.majorHoldersBreakdown || {};
      const inst = res2.institutionOwnership?.ownershipList || [];
      const res = {
        insiderPct: mh.insidersPercentHeld?.raw,
        institutionPct: mh.institutionsPercentHeld?.raw,
        floatPct: mh.institutionsFloatPercentHeld?.raw,
        institutionCount: mh.institutionsCount?.raw,
        topInstitutions: inst.slice(0, 8).map(i => ({
          name: i.organization,
          pct: i.pctHeld?.raw,
          shares: i.position?.raw,
          value: i.value?.raw,
          change: i.pctChange?.raw
        }))
      };
      Cache.set(key, res, CACHE_TTL_MED);
      return res;
    } catch(e) { return null; }
  },

  // ── Yahoo Finance – Management / Officers ──────────────────
  async getManagement(ticker) {
    if (!ticker || ticker === "-") return null;
    const key = `mgmt_${ticker}`;
    const cached = Cache.get(key);
    if (cached) return cached;
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=assetProfile`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!r.ok) return null;
      const d = await r.json();
      const ap = d.quoteSummary?.result?.[0]?.assetProfile || {};
      const res = {
        industry: ap.industry,
        sector: ap.sector,
        description: ap.longBusinessSummary,
        website: ap.website,
        fullTimeEmployees: ap.fullTimeEmployees,
        country: ap.country,
        city: ap.city,
        officers: (ap.companyOfficers || []).slice(0, 6).map(o => ({
          name: o.name,
          title: o.title,
          age: o.age,
          pay: o.totalPay?.raw
        }))
      };
      Cache.set(key, res, CACHE_TTL_MED);
      return res;
    } catch(e) { return null; }
  },

  // ── News via RSS ───────────────────────────────────────────
  async getNews(company, lang = "de") {
    const key = `news_${company.id}_${lang}`;
    const cached = Cache.get(key);
    if (cached) return cached;
    const name = encodeURIComponent(company.name);
    const ticker = company.ticker !== "-" ? company.ticker : "";
    const sources = lang === "de" ? [
      `https://corsproxy.io/?${encodeURIComponent(`https://news.google.com/rss/search?q=${name}&hl=de&gl=DE&ceid=DE:de`)}`,
      ticker ? `https://corsproxy.io/?${encodeURIComponent(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=DE&lang=de-DE`)}` : null,
    ] : [
      `https://corsproxy.io/?${encodeURIComponent(`https://news.google.com/rss/search?q=${name}+stock&hl=en-US&gl=US&ceid=US:en`)}`,
      ticker ? `https://corsproxy.io/?${encodeURIComponent(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`)}` : null,
    ];
    let arts = [];
    for (const src of sources.filter(Boolean)) {
      try {
        const r = await fetch(src, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) continue;
        arts.push(...parseRSS(await r.text()));
        if (arts.length >= 12) break;
      } catch(e) {}
    }
    const seen = new Set();
    arts = arts.filter(a => { if (seen.has(a.title)) return false; seen.add(a.title); return true; }).slice(0, 12);
    Cache.set(key, arts, CACHE_TTL_SHORT);
    return arts;
  },

  // ── IR Links builder ──────────────────────────────────────
  getIRLinks(company) {
    const links = [];
    const yr = new Date().getFullYear() - 1;
    if (company.country === "US") {
      links.push({ label: "SEC EDGAR (10-K, 10-Q)", url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(company.name)}&action=getcompany&type=10-K&dateb=&owner=include&count=10`, icon: "📄" });
      links.push({ label: "SEC EDGAR (alle Einreichungen)", url: `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(company.name)}%22&dateRange=custom&startdt=${yr-1}-01-01&enddt=${yr+1}-12-31&forms=10-K,10-Q`, icon: "📋" });
    }
    if (company.country === "DE") {
      links.push({ label: "Bundesanzeiger", url: `https://www.bundesanzeiger.de/pub/de/search?fulltext=${encodeURIComponent(company.name)}`, icon: "🏛️" });
      links.push({ label: "DGAP / EQS Meldungen", url: `https://dgap.de/dgap/Public/search/?q=${encodeURIComponent(company.name)}`, icon: "📡" });
    }
    if (["DE","FR","NL","ES","IT","BE","SE","FI","DK"].includes(company.country)) {
      links.push({ label: "BaFin Datenbank", url: `https://portal.mvp.bafin.de/database/ProspectSearch/prospect.do;jsessionid=?execution=e1s1`, icon: "🇪🇺" });
    }
    links.push({ label: `Geschäftsbericht ${yr} (Google)`, url: `https://www.google.com/search?q=${encodeURIComponent(company.name)}+Geschäftsbericht+${yr}+PDF`, icon: "🔍" });
    links.push({ label: "Annual Report (Google)", url: `https://www.google.com/search?q=${encodeURIComponent(company.name)}+annual+report+${yr}+PDF`, icon: "🔍" });
    links.push({ label: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${company.ticker !== "-" ? company.ticker : encodeURIComponent(company.name)}`, icon: "📈" });
    if (company.wikipedia) {
      links.push({ label: "Wikipedia", url: `https://en.wikipedia.org/wiki/${company.wikipedia}`, icon: "📖" });
    }
    return links;
  }
};

// ── RSS parser ─────────────────────────────────────────────
function parseRSS(xml) {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    return Array.from(doc.querySelectorAll("item")).map(item => ({
      title: item.querySelector("title")?.textContent?.trim().replace(/&amp;/g,"&") || "",
      link: item.querySelector("link")?.textContent?.trim() || "",
      date: (() => { try { return new Date(item.querySelector("pubDate")?.textContent).toLocaleDateString("de-DE"); } catch(e) { return ""; } })(),
      source: item.querySelector("source")?.textContent?.trim() || "",
      desc: (item.querySelector("description")?.textContent || "").replace(/<[^>]*>/g,"").trim().substring(0, 240)
    })).filter(a => a.title && a.link);
  } catch(e) { return []; }
}

// ── Number formatters ──────────────────────────────────────
function fmtNum(n, cur = "", compact = true) {
  if (n === null || n === undefined || isNaN(n)) return "–";
  n = Number(n);
  let s;
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e12) s = (n/1e12).toFixed(2) + " Bio.";
    else if (abs >= 1e9) s = (n/1e9).toFixed(2) + " Mrd.";
    else if (abs >= 1e6) s = (n/1e6).toFixed(2) + " Mio.";
    else s = n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
  } else {
    s = n.toLocaleString("de-DE");
  }
  return cur ? `${s} ${cur}` : s;
}

function fmtPct(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return "–";
  return (Number(n) * 100).toFixed(digits) + "%";
}

function fmtX(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return "–";
  return Number(n).toFixed(digits) + "x";
}
