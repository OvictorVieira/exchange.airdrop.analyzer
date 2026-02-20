import { computeMetrics, computeTokenEstimates, computeTradingTotals } from './calculations';
import type { AnalyzerInputs, AnalyzerOutput, ExchangeParseResult } from './models';
import { computeSellPlans } from './sell-plans';

export function computeAnalyzerOutput(dataset: ExchangeParseResult, inputs: AnalyzerInputs): AnalyzerOutput {
  const trading = computeTradingTotals(dataset.rows);
  const tokens = computeTokenEstimates(inputs);
  const metrics = computeMetrics(trading, tokens, inputs.tokenPrice);
  const sellPlans = computeSellPlans(tokens.tokensTotal, inputs.tokenPrice, metrics.costUsd);

  return {
    trading,
    tokens,
    metrics,
    sellPlans
  };
}
