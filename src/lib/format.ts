const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : numberFormatter.format(value);
}

const fixedFormatters = new Map<number, Intl.NumberFormat>();

/** Format id-ID dengan jumlah desimal tetap (1.234,50). */
export function formatFixed(value: number | null | undefined, digits: number): string {
  if (value == null || Number.isNaN(value)) return "–";
  let formatter = fixedFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    fixedFormatters.set(digits, formatter);
  }
  return formatter.format(value);
}

export function formatSigned(value: number, digits: number): string {
  const formatted = formatFixed(Math.abs(value), digits);
  return value > 0 ? `+${formatted}` : value < 0 ? `−${formatted}` : formatted;
}

export function formatUnit(value: number | null | undefined, unit: string): string {
  const formatted = formatNumber(value);
  return formatted === "—" ? formatted : `${formatted}${unit ? ` ${unit}` : ""}`;
}
