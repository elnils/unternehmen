// Chart module – renders price history (line + volume) and financial bar charts
// Requires Chart.js loaded via CDN

const Charts = {

  // ── 12-month price + volume chart ─────────────────────────
  renderPriceChart(canvasId, histData, quote) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !histData) return;
    const { dates, closes, volumes } = histData;
    const cur = histData.currency || quote?.currency || "";

    // Destroy existing
    if (canvas._chart) { canvas._chart.destroy(); }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const textColor = isDark ? "#8a8880" : "#6b6860";
    const startPrice = closes.find(v => v !== null);
    const lastPrice = closes.filter(v => v !== null).at(-1);
    const positive = lastPrice >= startPrice;
    const lineColor = positive ? "#0d7a4e" : "#c0392b";
    const fillColor = positive ? "rgba(13,122,78,0.10)" : "rgba(192,57,43,0.10)";

    // Normalize volumes
    const maxVol = Math.max(...volumes.filter(Boolean));

    canvas._chart = new Chart(canvas, {
      data: {
        labels: dates.map(d => {
          const dt = new Date(d);
          return dt.toLocaleDateString("de-DE", { month: "short", day: "numeric" });
        }),
        datasets: [
          {
            type: "line",
            label: "Kurs",
            data: closes,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.3,
            yAxisID: "yPrice",
            order: 1
          },
          {
            type: "bar",
            label: "Volumen",
            data: volumes.map(v => v || 0),
            backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
            borderRadius: 2,
            yAxisID: "yVol",
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "#1c1c20" : "#fff",
            borderColor: isDark ? "#2e2e34" : "#e6e4df",
            borderWidth: 1,
            titleColor: isDark ? "#f0ede8" : "#1a1915",
            bodyColor: isDark ? "#8a8880" : "#6b6860",
            padding: 10,
            callbacks: {
              label: ctx => {
                if (ctx.dataset.type === "line") return ` Kurs: ${ctx.parsed.y?.toFixed(2)} ${cur}`;
                return ` Volumen: ${fmtNum(ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor, maxTicksLimit: 8, maxRotation: 0,
              font: { size: 11, family: "'DM Sans', sans-serif" }
            },
            border: { display: false }
          },
          yPrice: {
            position: "right",
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11, family: "'DM Sans', sans-serif" },
              callback: v => `${v?.toFixed(0)} ${cur}`
            },
            border: { display: false }
          },
          yVol: {
            position: "left",
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { size: 10, family: "'DM Sans', sans-serif" },
              callback: v => fmtNum(v)
            },
            max: maxVol * 6, // push vol bars to bottom
            border: { display: false }
          }
        }
      }
    });
  },

  // ── 5-year Annual Revenue/NetIncome bar chart ─────────────
  renderAnnualChart(canvasId, annualIS, currency) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !annualIS?.length) return;
    if (canvas._chart) canvas._chart.destroy();

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const textColor = isDark ? "#8a8880" : "#6b6860";
    const data = [...annualIS].reverse();

    canvas._chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: data.map(d => d.date?.substring(0,4) || ""),
        datasets: [
          {
            label: "Umsatz",
            data: data.map(d => d.revenue ? d.revenue / 1e9 : null),
            backgroundColor: "rgba(67,97,238,0.75)",
            borderRadius: 4, order: 1
          },
          {
            label: "EBIT",
            data: data.map(d => d.ebit ? d.ebit / 1e9 : null),
            backgroundColor: "rgba(13,122,78,0.75)",
            borderRadius: 4, order: 1
          },
          {
            label: "Nettogewinn",
            data: data.map(d => d.netIncome ? d.netIncome / 1e9 : null),
            backgroundColor: "rgba(99,130,255,0.6)",
            borderRadius: 4, order: 1
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: textColor, font: { size: 11, family: "'DM Sans', sans-serif" }, boxWidth: 12, padding: 16 }
          },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2)} Mrd. ${currency||""}` }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor }, border: { display: false } },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, callback: v => `${v} Mrd.` },
            border: { display: false }
          }
        }
      }
    });
  },

  // ── Quarterly Net Income chart ─────────────────────────────
  renderQuarterlyChart(canvasId, quarterlyData, currency) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !quarterlyData?.length) return;
    if (canvas._chart) canvas._chart.destroy();

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const textColor = isDark ? "#8a8880" : "#6b6860";
    const data = [...quarterlyData].reverse().slice(-8);

    canvas._chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: data.map(d => d.date || ""),
        datasets: [
          {
            label: "Nettogewinn (Quartal)",
            data: data.map(d => d.netIncome ? d.netIncome / 1e9 : null),
            backgroundColor: data.map(d => (d.netIncome ?? 0) >= 0 ? "rgba(13,122,78,0.75)" : "rgba(192,57,43,0.75)"),
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` Nettogewinn: ${ctx.parsed.y?.toFixed(2)} Mrd. ${currency||""}` }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, border: { display: false } },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, callback: v => `${v} Mrd.` },
            border: { display: false }
          }
        }
      }
    });
  },

  // ── Ownership Doughnut ─────────────────────────────────────
  renderOwnershipChart(canvasId, ownership) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !ownership) return;
    if (canvas._chart) canvas._chart.destroy();

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#f0ede8" : "#1a1915";
    const inst = Math.round((ownership.institutionPct || 0) * 100);
    const insider = Math.round((ownership.insiderPct || 0) * 100);
    const retail = Math.max(0, 100 - inst - insider);

    canvas._chart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Institutionell", "Insider", "Streubesitz"],
        datasets: [{ data: [inst, insider, retail], backgroundColor: ["#4361ee","#0d7a4e","#e0e4f8"], borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: textColor, font: { size: 11, family: "'DM Sans', sans-serif" }, padding: 12, boxWidth: 12 }
          },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
        }
      }
    });
  }
};
