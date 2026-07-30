const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

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

/** Converts a rupee amount to Indian-numbering words for the printable challan (§8.5). */
export function amountToWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  if (rupees === 0) return "Zero Rupees Only";

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

  return `${parts.join(" ") || "Zero"} Rupees Only`;
}
