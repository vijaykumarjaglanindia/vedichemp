/**
 * VEDIC HEMP — MONEY
 *
 * Money is ALWAYS integer paise on the server and in the database. This module
 * is the *only* place paise become a human string, and it renders in Indian
 * digit grouping (₹1,23,456.00). Negative amounts render in parentheses.
 *
 * There is no float here and no client-supplied price. A component never does
 * arithmetic on rupees — it formats paise.
 */

export function formatPaise(paise: number, opts: { sign?: boolean } = {}): string {
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const fraction = (abs % 100).toString().padStart(2, "0");
  const grouped = groupIndian(rupees);
  const body = `₹${grouped}.${fraction}`;
  if (negative) return `(${body})`;
  if (opts.sign && paise > 0) return `+${body}`;
  return body;
}

/** Indian grouping: last three digits, then groups of two. 1234567 → 12,34,567 */
export function groupIndian(n: number): string {
  const s = n.toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

export const rupees = (paise: number) => paise / 100;
