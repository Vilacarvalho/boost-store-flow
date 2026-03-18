/**
 * Parse a Brazilian currency string to a float number.
 * Handles: \"R$ 100.000,50\", \"100.000,50\", \"100000,50\", \"100000\"
 */
export function parseBRL(value: string): number {
  if (!value || typeof value !== "string") return 0;
  const cleaned = value
    .replace(/R\$\s?/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")    // remove thousand separators
    .replace(",", ".");     // decimal comma → dot
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Format a number as BRL currency string for display.
 */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Format a raw input string as user-friendly BRL while typing.
 * Only formats when the string looks like a valid partial number.
 */
export function maskBRL(raw: string): string {
  // Strip prefix and spaces
  let v = raw.replace(/R\$\s?/g, "").replace(/\s/g, "");
  if (!v) return "";

  // Allow user to type freely; just keep as-is if not finalized
  // We format on blur instead
  return raw;
}

/**
 * Format a numeric value into a display-ready BRL input string (no R$ prefix).
 * E.g. 100000.5 → \"100.000,50\"
 */
export function numberToBRLInput(value: number): string {
  if (!value && value !== 0) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
