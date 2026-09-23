export const careerRanks = [
  { id: 'junior', level: 1, multiplier: 1, salaryMultiplier: 1 },
  { id: 'mid', level: 10, multiplier: 1.5, salaryMultiplier: 1.3 },
  { id: 'senior', level: 20, multiplier: 2, salaryMultiplier: 1.69 },
] as const;
export type CareerId = (typeof careerRanks)[number]['id'];

export function careerRank(level: number) {
  return [...careerRanks].reverse().find((rank) => level >= rank.level) ?? careerRanks[0];
}

export function nextRank(level: number) {
  return careerRanks.find((rank) => rank.level > level);
}
