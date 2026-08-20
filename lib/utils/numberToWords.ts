// Utility to convert numbers to Indian Rupees in words

const UNITS = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += UNITS[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += UNITS[n] + " ";
  }
  return str.trim();
}

export function numberToWordsRupees(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "Rupees Zero Only";
  }

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return "Rupees Zero Only";
  }

  let result = "";

  if (rupees > 0) {
    let num = rupees;

    // Crores (1,00,00,000)
    const crores = Math.floor(num / 10000000);
    if (crores > 0) {
      result += convertBelowThousand(crores) + " Crore ";
      num %= 10000000;
    }

    // Lakhs (1,00,000)
    const lakhs = Math.floor(num / 100000);
    if (lakhs > 0) {
      result += convertBelowThousand(lakhs) + " Lakh ";
      num %= 100000;
    }

    // Thousands (1,000)
    const thousands = Math.floor(num / 1000);
    if (thousands > 0) {
      result += convertBelowThousand(thousands) + " Thousand ";
      num %= 1000;
    }

    // Hundreds & Tens
    if (num > 0) {
      result += convertBelowThousand(num) + " ";
    }

    result = "Rupees " + result.trim();
  } else {
    result = "Rupees Zero";
  }

  if (paise > 0) {
    result += " and " + convertBelowThousand(paise) + " Paise";
  }

  return result + " Only";
}
