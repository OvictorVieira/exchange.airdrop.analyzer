import type {
  AnalyzerInputs,
  AnalyzerMetrics,
  TokenEstimates,
  TradingBreakdown,
  TradingTotals,
  NormalizedPositionRow
} from './models';

function toSortedBreakdownEntries(entries: Map<string, TradingBreakdown>): TradingBreakdown[] {
  return [...entries.values()].sort((a, b) => b.volumeUsd - a.volumeUsd);
}

export function computeTradingTotals(rows: NormalizedPositionRow[]): TradingTotals {
  let volumeTotalUsd = 0;
  let pnlTotalUsd = 0;
  let feesTotalUsd = 0;

  const byFileMap = new Map<string, TradingBreakdown>();
  const byMarketMap = new Map<string, TradingBreakdown>();

  for (const row of rows) {
    const volumeContribution = Math.abs(row.netExposureNotional);
    volumeTotalUsd += volumeContribution;
    pnlTotalUsd += row.cumulativePnlRealized;
    feesTotalUsd += row.totalTradingFees;

    const fileKey = row.sourceFile;
    const marketKey = row.marketSymbol;

    const fileCurrent = byFileMap.get(fileKey) ?? {
      key: fileKey,
      volumeUsd: 0,
      pnlUsd: 0,
      feesUsd: 0,
      rowsCount: 0
    };
    fileCurrent.volumeUsd += volumeContribution;
    fileCurrent.pnlUsd += row.cumulativePnlRealized;
    fileCurrent.feesUsd += row.totalTradingFees;
    fileCurrent.rowsCount += 1;
    byFileMap.set(fileKey, fileCurrent);

    const marketCurrent = byMarketMap.get(marketKey) ?? {
      key: marketKey,
      volumeUsd: 0,
      pnlUsd: 0,
      feesUsd: 0,
      rowsCount: 0
    };
    marketCurrent.volumeUsd += volumeContribution;
    marketCurrent.pnlUsd += row.cumulativePnlRealized;
    marketCurrent.feesUsd += row.totalTradingFees;
    marketCurrent.rowsCount += 1;
    byMarketMap.set(marketKey, marketCurrent);
  }

  return {
    volumeTotalUsd,
    pnlTotalUsd,
    feesTotalUsd,
    byFile: toSortedBreakdownEntries(byFileMap),
    byMarket: toSortedBreakdownEntries(byMarketMap)
  };
}

export function computeTokenEstimates(inputs: AnalyzerInputs): TokenEstimates {
  const pointsTotal = inputs.pointsOwn + inputs.pointsFree;
  const tokensTotal = pointsTotal * inputs.pointToToken;
  const tokensFree = inputs.pointsFree * inputs.pointToToken;
  const tokensPaid = Math.max(tokensTotal - tokensFree, 0);

  return {
    pointsTotal,
    tokensTotal,
    tokensFree,
    tokensPaid
  };
}

export function computeMetrics(
  trading: TradingTotals,
  tokenEstimates: TokenEstimates,
  tokenPrice: number
): AnalyzerMetrics {
  const costUsd = Math.max(-trading.pnlTotalUsd, 0);
  const valueUsd = tokenEstimates.tokensTotal * tokenPrice;
  const netProfitUsd = valueUsd - costUsd;
  const roi = costUsd > 0 ? netProfitUsd / costUsd : null;

  const costPerTokenTotal =
    tokenEstimates.tokensTotal > 0 ? costUsd / tokenEstimates.tokensTotal : null;
  const costPerTokenPaid = tokenEstimates.tokensPaid > 0 ? costUsd / tokenEstimates.tokensPaid : null;

  const pointsPer1mVolume =
    trading.volumeTotalUsd > 0 ? (tokenEstimates.pointsTotal / trading.volumeTotalUsd) * 1_000_000 : null;

  return {
    costUsd,
    valueUsd,
    netProfitUsd,
    roi,
    costPerTokenTotal,
    costPerTokenPaid,
    breakEvenPrice: costPerTokenTotal,
    pointsPer1mVolume
  };
}

export function validateInputs(inputs: AnalyzerInputs): string[] {
  const errors: string[] = [];

  if (inputs.pointsOwn < 0) {
    errors.push('points_own deve ser >= 0');
  }

  if (inputs.pointsFree < 0) {
    errors.push('points_free deve ser >= 0');
  }

  if (inputs.pointToToken <= 0) {
    errors.push('point_to_token deve ser > 0');
  }

  if (inputs.tokenPrice <= 0) {
    errors.push('token_price deve ser > 0');
  }

  return errors;
}
