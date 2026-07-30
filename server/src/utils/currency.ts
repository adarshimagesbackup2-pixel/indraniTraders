/**
 * Indian lakh/crore currency formatting + rounding utilities.
 * All monetary totals round to the nearest ₹1 (standard rounding, 0.5 rounds up)
 * per §0.7 / §6.2 of the spec. This is configurable in Settings in principle,
 * but the base rule implemented here is the documented default.
 */

/** Round to nearest ₹1, with .5 rounding up (standard rounding, not banker's rounding). */
export function roundToRupee(amount: number): number {
  return Math.floor(amount + 0.5);
}

/** Formats a number as ₹1,23,456.00 using Indian digit grouping. */
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${TENS[tens]}${ones ? " " + ONES[ones] : ""}`;
}

function threeDigitsToWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let result = "";
  if (hundred) result += `${ONES[hundred]} Hundred`;
  if (rest) result += `${result ? " " : ""}${twoDigitsToWords(rest)}`;
  return result;
}

/**
 * Converts a rupee amount to Indian-numbering words, e.g.
 * 123456 -> "One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees Only"
 * Used on the printable challan per §8.5.
 */
export function amountToIndianWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  let n = rupees;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundredPart = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundredPart) parts.push(threeDigitsToWords(hundredPart));

  let words = parts.join(" ") || "Zero";
  words += " Rupees";
  if (paise > 0) {
    words += ` and ${twoDigitsToWords(paise)} Paise`;
  }
  words += " Only";
  return words;
}
