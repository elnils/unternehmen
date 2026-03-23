// Cache – localStorage with TTL
const CACHE_TTL_SHORT = 15 * 60 * 1000;   // 15 min (quotes)
const CACHE_TTL_MED   = 6  * 60 * 60 * 1000; // 6h (financials, wiki)
const CACHE_TTL_LONG  = 24 * 60 * 60 * 1000; // 24h (static data)

const Cache = {
  set(key, data, ttl = CACHE_TTL_MED) {
    try { localStorage.setItem("cp2_" + key, JSON.stringify({ ts: Date.now(), ttl, data })); }
    catch(e) { /* quota */ }
  },
  get(key) {
    try {
      const raw = localStorage.getItem("cp2_" + key);
      if (!raw) return null;
      const { ts, ttl, data } = JSON.parse(raw);
      if (Date.now() - ts > ttl) { localStorage.removeItem("cp2_" + key); return null; }
      return data;
    } catch(e) { return null; }
  },
  age(key) {
    try {
      const raw = localStorage.getItem("cp2_" + key);
      if (!raw) return null;
      const { ts } = JSON.parse(raw);
      const s = Math.round((Date.now() - ts) / 1000);
      if (s < 60) return `${s}s`;
      if (s < 3600) return `${Math.round(s/60)}min`;
      return `${Math.round(s/3600)}h`;
    } catch(e) { return null; }
  },
  clear(prefix = "") {
    Object.keys(localStorage).filter(k => k.startsWith("cp2_" + prefix)).forEach(k => localStorage.removeItem(k));
  }
};
