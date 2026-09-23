export const missionIds = [
  'firstDelivery',
  'firstHire',
  'threeShops',
  'firstPromotion',
  'profitTarget',
  'firstOperation',
  'firstAutomation',
  'operationMilestone',
  'operationDiversify',
  'operationSaas',
] as const;
export const missions = [
  { id: 'firstDelivery', target: 1, reward: 50 },
  { id: 'firstHire', target: 1, reward: 300 },
  { id: 'threeShops', target: 3, reward: 1500 },
  { id: 'firstPromotion', target: 1, reward: 5000 },
  { id: 'profitTarget', target: 50, reward: 2500 },
  { id: 'firstOperation', target: 1, reward: 500 },
  { id: 'firstAutomation', target: 1, reward: 2000 },
  { id: 'operationMilestone', target: 25, reward: 15000 },
  { id: 'operationDiversify', target: 3, reward: 200000 },
  { id: 'operationSaas', target: 1, reward: 3000000 },
] as const;
