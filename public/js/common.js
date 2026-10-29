const DAY_MS = 86_400_000;

export function civilDate(year, month, day = 1) {
  return new Date(Date.UTC(year, month, day));
}

// Civil dates are represented at UTC midnight. Only this boundary reads the clock.
export function kstToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  return civilDate(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

export function dateParam(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  return year >= 1900 && year <= 2199 && month >= 1 && month <= 12 && day >= 1 &&
    dateParam(civilDate(year, month - 1, day)) === value;
}

export function selectableRange(today = kstToday()) {
  const weekday = today.getUTCDay();
  const monday = new Date(today.getTime() - (weekday === 0 ? 6 : weekday - 1) * DAY_MS);
  return {minDate: monday, maxDate: new Date(monday.getTime() + 13 * DAY_MS)};
}

export function parseMealText(text) {
  const raw = String(text);
  const match = raw.match(/\s*(?:\((\d{1,2}(?:\s*\.\s*\d{1,2})*\.?)[ ]*\)|\[(\d{1,2}(?:\s*\.\s*\d{1,2})*\.?)[ ]*\])\s*$/u);
  if (!match) return {label: raw.trim(), allergens: []};
  const numbers = (match[1] || match[2]).replace(/\.$/, "").split(".").map(n => Number(n.trim()));
  if (numbers.some(n => !Number.isInteger(n) || n < 1 || n > 19)) return {label: raw.trim(), allergens: []};
  return {label: raw.slice(0, match.index).trim(), allergens: [...new Set(numbers)].sort((a, b) => a - b)};
}

export function createSafeStorage(getStorage) {
  const memory = new Map();
  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      try { return getStorage().getItem(key); } catch { return null; }
    },
    setItem(key, value) {
      memory.set(key, String(value));
      try { getStorage().setItem(key, String(value)); } catch { /* Keep the session usable. */ }
    }
  };
}

export function createRequestTracker() {
  const channels = new Map();
  return {
    begin(channel, key, ttl = 0, force = false) {
      const previous = channels.get(channel);
      if (!force && previous?.key === key && (previous.pending || Date.now() - previous.loadedAt < ttl)) return null;
      previous?.controller.abort();
      const entry = {key, pending: true, loadedAt: 0, controller: new AbortController()};
      channels.set(channel, entry);
      return {
        signal: entry.controller.signal,
        current: () => channels.get(channel) === entry && !entry.controller.signal.aborted,
        finish(success = false) {
          entry.pending = false;
          if (success) entry.loadedAt = Date.now();
        }
      };
    },
    cancel(channel) { channels.get(channel)?.controller.abort(); channels.delete(channel); }
  };
}
