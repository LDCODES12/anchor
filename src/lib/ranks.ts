// Rank names for display
export const RANK_NAMES: Record<number, string> = {
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Platinum",
  5: "Diamond",
}

export function getRankName(rank: number): string {
  if (rank <= 5) return RANK_NAMES[rank] ?? "Bronze"
  return `Diamond ${toRoman(rank - 4)}`
}

function toRoman(num: number): string {
  const romanNumerals = [
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ]
  let result = ""
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral
      num -= value
    }
  }
  return result
}
