export function formatTravoValue(value: string | number, decimals: number): string {
  const raw = String(value).trim();
  const match = /^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))(.*)$/.exec(raw);
  if (!match) return raw;

  const numeric = Number(match[1]!.replace(",", "."));
  if (!Number.isFinite(numeric)) return raw;

  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numeric);
  return `${formatted}${match[2]}`;
}

export function parseTravoNumber(value: string | number): number | null {
  const match = /^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))/.exec(String(value).trim());
  if (!match) return null;
  const parsed = Number(match[1]!.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isTravoReadingStale(timestamp: string, now = Date.now(), maxAgeMs = 30_000): boolean {
  const updatedAt = Date.parse(timestamp);
  return !Number.isFinite(updatedAt) || now - updatedAt > maxAgeMs;
}

export function formatTravoTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "waktu tidak diketahui";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}
