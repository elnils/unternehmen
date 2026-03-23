// Export module – Clipboard (Markdown), PDF (via print), DOCX (via docx.js)

const Exporter = {

  // ── Build text profile from loaded data ──────────────────────
  buildMarkdown(company, wiki, quote, fin, lang) {
    const t = lang === "de" ? {
      profile: "Unternehmensprofil",
      country: "Land", sector: "Branche", exchange: "Börse",
      ticker: "Ticker", index: "Index",
      price: "Aktienkurs", change: "Veränderung", mktcap: "Marktkapitalisierung",
      high52: "52W-Hoch", low52: "52W-Tief",
      revenue: "Umsatz", netincome: "Nettogewinn", ebit: "Operatives Ergebnis",
      eps: "Gewinn je Aktie", pe: "KGV", pb: "KBV",
      margin: "Op. Marge", roe: "Eigenkapitalrendite", div: "Dividendenrendite",
      fcf: "Free Cashflow", debt: "Verschuldungsgrad (D/E)",
      analysts: "Analystenurteil", target: "Kursziel",
      about: "Über das Unternehmen",
      generatedAt: "Erstellt am",
    } : {
      profile: "Company Profile",
      country: "Country", sector: "Sector", exchange: "Exchange",
      ticker: "Ticker", index: "Index",
      price: "Share Price", change: "Change", mktcap: "Market Cap",
      high52: "52W High", low52: "52W Low",
      revenue: "Revenue", netincome: "Net Income", ebit: "Operating Income",
      eps: "EPS", pe: "P/E", pb: "P/B",
      margin: "Op. Margin", roe: "Return on Equity", div: "Dividend Yield",
      fcf: "Free Cash Flow", debt: "Debt/Equity",
      analysts: "Analyst Rating", target: "Price Target",
      about: "About the Company",
      generatedAt: "Generated at",
    };

    const flag = FLAGS[company.country] || "";
    const cur = quote?.currency || "";
    const sign = quote?.change >= 0 ? "+" : "";

    let md = `# ${flag} ${company.name} – ${t.profile}\n\n`;
    md += `| | |\n|---|---|\n`;
    md += `| **${t.ticker}** | ${company.ticker} (${company.exchange}) |\n`;
    md += `| **${t.country}** | ${flag} ${company.country} |\n`;
    md += `| **${t.sector}** | ${SECTOR_ICONS[company.sector]||""} ${company.sector} |\n`;
    md += `| **${t.index}** | ${(company.index||[]).join(", ")} |\n`;

    if (quote) {
      md += `\n## 📊 ${t.price}\n`;
      md += `| | |\n|---|---|\n`;
      md += `| **${t.price}** | ${quote.price} ${cur} |\n`;
      md += `| **${t.change}** | ${sign}${quote.change?.toFixed(2)} (${sign}${quote.changePct}%) |\n`;
      if (quote.marketCap) md += `| **${t.mktcap}** | ${formatNum(quote.marketCap, cur)} |\n`;
      md += `| **${t.high52}** | ${quote.high52} ${cur} |\n`;
      md += `| **${t.low52}** | ${quote.low52} ${cur} |\n`;
    }

    if (fin) {
      md += `\n## 💼 ${lang === "de" ? "Kennzahlen" : "Key Metrics"}\n`;
      md += `| | |\n|---|---|\n`;
      if (fin.revenue) md += `| **${t.revenue}** | ${formatNum(fin.revenue, cur)} |\n`;
      if (fin.netIncome) md += `| **${t.netincome}** | ${formatNum(fin.netIncome, cur)} |\n`;
      if (fin.operatingMargin) md += `| **${t.margin}** | ${formatPct(fin.operatingMargin)} |\n`;
      if (fin.eps) md += `| **${t.eps}** | ${fin.eps?.toFixed(2)} ${cur} |\n`;
      if (fin.peRatio) md += `| **${t.pe}** | ${fin.peRatio?.toFixed(1)} |\n`;
      if (fin.pbRatio) md += `| **${t.pb}** | ${fin.pbRatio?.toFixed(2)} |\n`;
      if (fin.roe) md += `| **${t.roe}** | ${formatPct(fin.roe)} |\n`;
      if (fin.dividendYield) md += `| **${t.div}** | ${formatPct(fin.dividendYield)} |\n`;
      if (fin.freeCashFlow) md += `| **${t.fcf}** | ${formatNum(fin.freeCashFlow, cur)} |\n`;
      if (fin.debtToEquity) md += `| **${t.debt}** | ${fin.debtToEquity?.toFixed(2)} |\n`;
      if (fin.analystRating) md += `| **${t.analysts}** | ${fin.analystRating} |\n`;
      if (fin.targetPrice) md += `| **${t.target}** | ${fin.targetPrice?.toFixed(2)} ${cur} |\n`;
    }

    if (wiki?.extract) {
      md += `\n## 📖 ${t.about}\n${wiki.extract}\n`;
      md += `\n*${lang==="de"?"Quelle":"Source"}: ${wiki.url}*\n`;
    }

    md += `\n---\n*${t.generatedAt}: ${new Date().toLocaleString("de-DE")} | company-profiles*\n`;
    return md;
  },

  // ── Copy Markdown to clipboard ───────────────────────────────
  async copyMarkdown(company, wiki, quote, fin, lang) {
    const md = this.buildMarkdown(company, wiki, quote, fin, lang);
    await navigator.clipboard.writeText(md);
    return true;
  },

  // ── Print-to-PDF ─────────────────────────────────────────────
  printPDF(company, wiki, quote, fin, lang) {
    const md = this.buildMarkdown(company, wiki, quote, fin, lang);
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${company.name} – Profil</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; font-size: 14px; line-height: 1.6; }
        h1 { font-size: 22px; border-bottom: 3px solid #4361ee; padding-bottom: 8px; }
        h2 { font-size: 16px; color: #4361ee; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        td { padding: 6px 10px; border: 1px solid #e0e0e0; }
        td:first-child { font-weight: 600; width: 40%; background: #f8f9ff; }
        p { margin: 8px 0; }
        em { color: #888; font-size: 11px; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      ${mdToHTML(md)}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  },

  // ── DOCX export (via docx.js CDN) ────────────────────────────
  async exportDOCX(company, wiki, quote, fin, lang) {
    if (typeof docx === "undefined") {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.umd.min.js");
    }
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, AlignmentType, BorderStyle } = docx;

    const rows = [];
    const addRow = (label, value) => {
      if (!value || value === "–") return;
      rows.push(new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(value), size: 20 })] })], width: { size: 60, type: WidthType.PERCENTAGE } }),
      ]}));
    };

    const cur = quote?.currency || "";
    const flag = FLAGS[company.country] || "";
    const sign = quote?.change >= 0 ? "+" : "";

    addRow("Ticker", `${company.ticker} (${company.exchange})`);
    addRow("Land", `${flag} ${company.country}`);
    addRow("Branche", company.sector);
    addRow("Index", (company.index||[]).join(", "));
    if (quote) {
      addRow("Kurs", `${quote.price} ${cur}`);
      addRow("Veränderung", `${sign}${quote.change?.toFixed(2)} (${sign}${quote.changePct}%)`);
      if (quote.marketCap) addRow("Marktkapitalisierung", formatNum(quote.marketCap, cur));
      addRow("52W Hoch / Tief", `${quote.high52} / ${quote.low52} ${cur}`);
    }
    if (fin) {
      if (fin.revenue) addRow("Umsatz", formatNum(fin.revenue, cur));
      if (fin.netIncome) addRow("Nettogewinn", formatNum(fin.netIncome, cur));
      if (fin.operatingMargin) addRow("Op. Marge", formatPct(fin.operatingMargin));
      if (fin.eps) addRow("EPS", `${fin.eps?.toFixed(2)} ${cur}`);
      if (fin.peRatio) addRow("KGV", fin.peRatio?.toFixed(1));
      if (fin.roe) addRow("Eigenkapitalrendite", formatPct(fin.roe));
      if (fin.dividendYield) addRow("Dividendenrendite", formatPct(fin.dividendYield));
    }

    const doc = new Document({ sections: [{ properties: {}, children: [
      new Paragraph({ text: `${flag} ${company.name}`, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "Unternehmenssteckbrief", heading: HeadingLevel.HEADING_2 }),
      new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      new Paragraph({ text: "" }),
      ...(wiki?.extract ? [
        new Paragraph({ text: "Über das Unternehmen", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: wiki.extract, size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: `Quelle: ${wiki.url}`, size: 16, color: "888888", italics: true })] }),
      ] : []),
      new Paragraph({ children: [new TextRun({ text: `Erstellt am: ${new Date().toLocaleString("de-DE")} | company-profiles`, size: 16, color: "888888", italics: true })] }),
    ]}]});

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${company.id}_profil.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  }
};

// ── Utility ───────────────────────────────────────────────────
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function downloadBlob(blob, filename, type) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function mdToHTML(md) {
  return md
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^\| \*\*(.+?)\*\* \| (.+?) \|$/gm, "<tr><td>$1</td><td>$2</td></tr>")
    .replace(/^\|.*\|.*\|$/gm, "") // remove table separators
    .replace(/<tr>/g, () => { /* group into table */ return "<tr>"; })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^---$/gm, "<hr>")
    .replace(/(<tr>.*<\/tr>\n?)+/gs, m => `<table>${m}</table>`)
    .replace(/^(?!<)/gm, "<p>")
    .replace(/(?<!>)$/gm, "</p>");
}
