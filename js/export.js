// Export module – Markdown (clipboard), PDF (print window), DOCX (docx.js)

const Exporter = {

  buildText(company, wiki, quote, fin, mgmt, notes, lang) {
    const L = lang === "de";
    const cur = quote?.currency || "";
    const flag = FLAGS[company.country] || "";
    const sign = v => (v >= 0 ? "+" : "");

    let out = "";
    out += `${"=".repeat(60)}\n`;
    out += `${flag} ${company.name.toUpperCase()}\n`;
    out += `${L?"Unternehmenssteckbrief":"Company Profile"} | ${new Date().toLocaleDateString("de-DE")}\n`;
    out += `${"=".repeat(60)}\n\n`;

    // Master data
    out += `## ${L?"Stammdaten":"Master Data"}\n`;
    const md = [
      [L?"Ticker":"Ticker", `${company.ticker} (${company.exchange})`],
      [L?"Hauptsitz":"Headquarters", company.hq || company.country],
      [L?"Land":"Country", `${flag} ${company.country}`],
      [L?"Branche":"Sector", company.sector],
      [L?"Index":"Index", (company.index||[]).join(", ")],
      [L?"Gegründet":"Founded", company.founded || "–"],
      [L?"Mitarbeiter":"Employees", (mgmt?.fullTimeEmployees || company.employees || "–").toLocaleString ? Number(mgmt?.fullTimeEmployees || company.employees || 0).toLocaleString("de-DE") : "–"],
      [L?"Handelszonen":"Trade Regions", (company.tradeRegions||[]).join(", ")],
      ["Website", mgmt?.website || "–"],
      ["Wikipedia", company.wikipedia ? `https://en.wikipedia.org/wiki/${company.wikipedia}` : "–"],
    ];
    md.forEach(([l,v]) => { out += `  ${l.padEnd(22)} ${v}\n`; });

    // Officers
    if (mgmt?.officers?.length) {
      out += `\n## ${L?"Management":"Management"}\n`;
      mgmt.officers.forEach(o => {
        out += `  ${o.title?.padEnd(24) || ""} ${o.name || ""}\n`;
      });
    }

    // Competitors
    if (company.competitors?.length) {
      const compNames = company.competitors.map(id => COMPANY_MAP[id]?.name || id).join(", ");
      out += `\n## ${L?"Wettbewerber":"Competitors"}\n  ${compNames}\n`;
    }

    // Quote
    if (quote) {
      out += `\n## ${L?"Aktienkurs":"Share Price"}\n`;
      [
        [L?"Kurs":"Price", `${quote.price?.toFixed(2)} ${cur}`],
        [L?"Veränderung":"Change", `${sign(quote.change)}${quote.change?.toFixed(2)} (${sign(quote.changePct)}${quote.changePct?.toFixed(2)}%)`],
        [L?"52W Hoch":"52W High", `${quote.high52} ${cur}`],
        [L?"52W Tief":"52W Low", `${quote.low52} ${cur}`],
        [L?"Marktkapitalisierung":"Market Cap", fin?.marketCap ? fmtNum(fin.marketCap, cur) : "–"],
      ].forEach(([l,v]) => { out += `  ${l.padEnd(22)} ${v}\n`; });
    }

    // Financials
    if (fin) {
      out += `\n## ${L?"Kennzahlen":"Key Metrics"}\n`;
      [
        [L?"Umsatz":"Revenue", fmtNum(fin.revenue, cur)],
        [L?"Rohertrag":"Gross Profit", fmtNum(fin.grossProfit, cur)],
        [L?"Rohmarge":"Gross Margin", fmtPct(fin.grossMargin)],
        ["EBIT Marge", fmtPct(fin.operatingMargin)],
        [L?"Nettogewinn":"Net Income", fmtNum(fin.netIncome, cur)],
        [L?"Nettomarge":"Net Margin", fmtPct(fin.netMargin)],
        [L?"EPS":"EPS", fin.eps ? `${fin.eps.toFixed(2)} ${cur}` : "–"],
        [L?"KGV (trailing)":"P/E (trailing)", fmtX(fin.peRatio)],
        [L?"KGV (forward)":"P/E (forward)", fmtX(fin.peForward)],
        [L?"KBV":"P/B", fmtX(fin.pbRatio)],
        [L?"EK-Rendite":"ROE", fmtPct(fin.roe)],
        [L?"Dividendenrendite":"Dividend Yield", fmtPct(fin.dividendYield)],
        [L?"Free Cashflow":"Free Cash Flow", fmtNum(fin.freeCashFlow, cur)],
        [L?"Fremdkapitalquote":"Debt/Equity", fin.debtToEquity ? fin.debtToEquity.toFixed(2) : "–"],
        [L?"Steuerquote":"Tax Rate", fmtPct(fin.taxRate)],
        [L?"F&E Investitionen":"R&D Spending", fmtNum(fin.rdInvestment, cur)],
        [L?"Analysten-Urteil":"Analyst Rating", fin.analystRating || "–"],
        [L?"Kursziel (Ø)":"Avg. Price Target", fin.targetPrice ? `${fin.targetPrice.toFixed(2)} ${cur}` : "–"],
      ].forEach(([l,v]) => { out += `  ${l.padEnd(26)} ${v}\n`; });
    }

    // Wikipedia
    if (wiki?.extract) {
      out += `\n## ${L?"Über das Unternehmen":"About the Company"}\n${wiki.extract}\nQuelle: ${wiki.url}\n`;
    }

    // Notes
    if (notes?.trim()) {
      out += `\n## ${L?"Meine Notizen":"My Notes"}\n${notes.trim()}\n`;
    }

    out += `\n${"–".repeat(60)}\n${L?"Erstellt am":"Generated"}: ${new Date().toLocaleString("de-DE")}\n`;
    return out;
  },

  async copyMarkdown(company, wiki, quote, fin, mgmt, notes, lang) {
    const txt = this.buildText(company, wiki, quote, fin, mgmt, notes, lang);
    await navigator.clipboard.writeText(txt);
  },

  printPDF(company, wiki, quote, fin, mgmt, notes, lang) {
    const txt = this.buildText(company, wiki, quote, fin, mgmt, notes, lang);
    const w = window.open("", "_blank");
    const flag = FLAGS[company.country] || "";
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${company.name}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap');
      body{font-family:'DM Sans',sans-serif;max-width:800px;margin:40px auto;color:#1a1915;font-size:13px;line-height:1.7}
      h1{font-size:20px;margin-bottom:4px} h2{font-size:13px;font-weight:700;color:#4361ee;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.5px}
      pre{font-family:inherit;white-space:pre-wrap;word-break:break-word}
      hr{border:none;border-top:1px solid #e6e4df;margin:16px 0}
      @media print{body{margin:20px}}
    </style></head><body>
    <h1>${flag} ${company.name}</h1>
    <hr>
    <pre>${txt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  },

  async exportDOCX(company, wiki, quote, fin, mgmt, notes, lang) {
    if (typeof docx === "undefined") {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.umd.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, AlignmentType } = docx;
    const cur = quote?.currency || "";
    const flag = FLAGS[company.country] || "";

    const mkRow = (label, value) => new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(value ?? "–"), size: 20 })] })], width: { size: 60, type: WidthType.PERCENTAGE } }),
    ]});

    const rows = [];
    const add = (l, v) => { if (v && v !== "–") rows.push(mkRow(l, v)); };

    add("Ticker", `${company.ticker} (${company.exchange})`);
    add("Hauptsitz", company.hq);
    add("Land", `${flag} ${company.country}`);
    add("Branche", company.sector);
    add("Index", (company.index||[]).join(", "));
    add("Gegründet", company.founded);
    add("Mitarbeiter", Number(mgmt?.fullTimeEmployees || company.employees || 0).toLocaleString("de-DE"));
    add("Handelszonen", (company.tradeRegions||[]).join(", "));
    if (quote) {
      add("Aktienkurs", `${quote.price?.toFixed(2)} ${cur}`);
      add("52W Hoch/Tief", `${quote.high52} / ${quote.low52} ${cur}`);
    }
    if (fin) {
      add("Umsatz", fmtNum(fin.revenue, cur));
      add("Rohmarge", fmtPct(fin.grossMargin));
      add("EBIT Marge", fmtPct(fin.operatingMargin));
      add("Nettogewinn", fmtNum(fin.netIncome, cur));
      add("EPS", fin.eps ? `${fin.eps.toFixed(2)} ${cur}` : null);
      add("KGV", fmtX(fin.peRatio));
      add("Eigenkapitalrendite", fmtPct(fin.roe));
      add("Dividendenrendite", fmtPct(fin.dividendYield));
      add("Free Cashflow", fmtNum(fin.freeCashFlow, cur));
      add("Fremdkapitalquote", fin.debtToEquity?.toFixed(2));
      add("Steuerquote", fmtPct(fin.taxRate));
      add("F&E Investitionen", fmtNum(fin.rdInvestment, cur));
    }
    if (mgmt?.officers?.length) {
      mgmt.officers.forEach(o => add(o.title || "Manager", o.name));
    }

    const children = [
      new Paragraph({ text: `${flag} ${company.name}`, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "Unternehmenssteckbrief", heading: HeadingLevel.HEADING_2 }),
      new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    ];
    if (wiki?.extract) {
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ text: "Über das Unternehmen", heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ children: [new TextRun({ text: wiki.extract, size: 20 })] }));
    }
    if (notes?.trim()) {
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ text: "Meine Notizen", heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ children: [new TextRun({ text: notes.trim(), size: 20 })] }));
    }
    children.push(new Paragraph({ children: [new TextRun({ text: `Erstellt am: ${new Date().toLocaleString("de-DE")}`, size: 16, color: "888888", italics: true })] }));

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${company.id}_steckbrief.docx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }
};
