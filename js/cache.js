// Cache module – stores data in localStorage with 6h TTL
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms

const Cache = {
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch(e) { /* storage full – ignore */ }
  },
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
      return data;
    } catch(e) { return null; }
  },
  clear(prefix) {
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  },
  age(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { ts } = JSON.parse(raw);
      const mins = Math.round((Date.now() - ts) / 60000);
      if (mins < 60) return `vor ${mins} Min.`;
      const hrs = Math.round(mins / 60);
      return `vor ${hrs} Std.`;
    } catch(e) { return null; }
  }
};
