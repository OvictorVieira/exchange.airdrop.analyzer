import type { RiskProfile, ScenarioProjection, SellPlan } from './models';

interface PlanDefinition {
  profile: RiskProfile;
  sellPct: number;
  holdPct: number;
}

const PLAN_DEFINITIONS: PlanDefinition[] = [
  { profile: 'conservative', sellPct: 0.7, holdPct: 0.3 },
  { profile: 'moderate', sellPct: 0.6, holdPct: 0.4 },
  { profile: 'aggressive', sellPct: 0.45, holdPct: 0.55 }
];

function buildScenarios(
  tokensHold: number,
  valueSellNow: number,
  tokenPrice: number,
  costUsd: number
): ScenarioProjection[] {
  const scenarios = [
    { scenarioKey: 'bear', scenarioPrice: tokenPrice * 0.35 },
    { scenarioKey: 'base', scenarioPrice: tokenPrice },
    { scenarioKey: 'bull', scenarioPrice: tokenPrice * 2.0 }
  ] as const;

  return scenarios.map((scenario) => {
    const futureValueHold = tokensHold * scenario.scenarioPrice;
    const futureTotalValue = valueSellNow + futureValueHold;
    const futureNetProfit = futureTotalValue - costUsd;

    return {
      scenarioKey: scenario.scenarioKey,
      scenarioPrice: scenario.scenarioPrice,
      futureValueHold,
      futureTotalValue,
      futureNetProfit
    };
  });
}

export function computeSellPlans(tokensTotal: number, tokenPrice: number, costUsd: number): SellPlan[] {
  return PLAN_DEFINITIONS.map((definition) => {
    const tokensSell = tokensTotal * definition.sellPct;
    const tokensHold = tokensTotal - tokensSell;
    const valueSellNow = tokensSell * tokenPrice;

    const costAllocatedToSell = tokensTotal > 0 ? costUsd * (tokensSell / tokensTotal) : 0;
    const lockedProfit = valueSellNow - costAllocatedToSell;

    return {
      profile: definition.profile,
      sellPct: definition.sellPct,
      holdPct: definition.holdPct,
      tokensSell,
      tokensHold,
      valueSellNow,
      costAllocatedToSell,
      lockedProfit,
      scenarios: buildScenarios(tokensHold, valueSellNow, tokenPrice, costUsd)
    };
  });
}
