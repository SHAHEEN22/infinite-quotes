/**
 * Parse a DDMMYYYY string into components.
 * Returns null if the string is invalid.
 */
export function parseDDMMYYYY(input: string): { day: number; month: number; year: number; dateKey: string } | null {
  if (!/^\d{8}$/.test(input)) return null;
  const day = parseInt(input.slice(0, 2), 10);
  const month = parseInt(input.slice(2, 4), 10);
  const year = parseInt(input.slice(4, 8), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
  return { day, month, year, dateKey: `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}` };
}

/**
 * Convert a Date (UTC) into a DDMMYYYY string.
 */
export function toDDMMYYYY(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getUTCFullYear());
  return `${dd}${mm}${yyyy}`;
}

/**
 * Build the full day page URL for a given date.
 */
export function dayPageUrl(date: Date, base = "https://onestrangething.net"): string {
  return `${base}/day/${toDDMMYYYY(date)}`;
}
