export type SupportedExchange = 'backpack';

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface AnalyzerInputs {
  pointsOwn: number;
  pointsFree: number;
  pointToToken: number;
  tokenPrice: number;
  riskProfile: RiskProfile;
}

export interface NormalizedPositionRow {
  sourceFile: string;
  marketSymbol: string;
  netExposureNotional: number;
  cumulativePnlRealized: number;
  totalTradingFees: number;
  openedAt: string | null;
  closedAt: string | null;
  positionId: string | null;
}

export interface FileParseResult {
  sourceFile: string;
  rowsTotal: number;
  rowsValid: number;
  rowsInvalid: number;
  minOpenedAt: string | null;
  maxClosedAt: string | null;
  status: 'ok' | 'error';
  errors: string[];
  rows: NormalizedPositionRow[];
}

export interface ExchangeParseResult {
  exchangeId: SupportedExchange;
  files: FileParseResult[];
  rows: NormalizedPositionRow[];
}

export interface TradingBreakdown {
  key: string;
  volumeUsd: number;
  pnlUsd: number;
  feesUsd: number;
  rowsCount: number;
}

export interface TradingTotals {
  volumeTotalUsd: number;
  pnlTotalUsd: number;
  feesTotalUsd: number;
  byFile: TradingBreakdown[];
  byMarket: TradingBreakdown[];
}

export interface TokenEstimates {
  pointsTotal: number;
  tokensTotal: number;
  tokensFree: number;
  tokensPaid: number;
}

export interface AnalyzerMetrics {
  costUsd: number;
  valueUsd: number;
  netProfitUsd: number;
  roi: number | null;
  costPerTokenTotal: number | null;
  costPerTokenPaid: number | null;
  breakEvenPrice: number | null;
  pointsPer1mVolume: number | null;
}

export interface ScenarioProjection {
  scenarioKey: 'bear' | 'base' | 'bull';
  scenarioPrice: number;
  futureValueHold: number;
  futureTotalValue: number;
  futureNetProfit: number;
}

export interface SellPlan {
  profile: RiskProfile;
  sellPct: number;
  holdPct: number;
  tokensSell: number;
  tokensHold: number;
  valueSellNow: number;
  costAllocatedToSell: number;
  lockedProfit: number;
  scenarios: ScenarioProjection[];
}

export interface AnalyzerOutput {
  trading: TradingTotals;
  tokens: TokenEstimates;
  metrics: AnalyzerMetrics;
  sellPlans: SellPlan[];
}
