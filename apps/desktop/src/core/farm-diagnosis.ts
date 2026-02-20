import type { AnalyzerOutput } from './models';

export type FarmHealth = 'strong' | 'ok' | 'attention' | 'critical' | 'unknown';

export interface FarmDiagnosis {
  health: FarmHealth;
  gapToZero: number | null;
}

export function evaluateFarmHealth(output: AnalyzerOutput): FarmDiagnosis {
  if (output.tokens.tokensTotal <= 0) {
    return { health: 'unknown', gapToZero: null };
  }

  const currentTokenPrice = output.metrics.valueUsd / output.tokens.tokensTotal;
  const zeroToZeroPrice = output.metrics.breakEvenPrice;
  if (zeroToZeroPrice === null || zeroToZeroPrice <= 0) {
    return { health: 'unknown', gapToZero: null };
  }

  const gapToZero = currentTokenPrice / zeroToZeroPrice - 1;

  if (gapToZero >= 0.2) {
    return { health: 'strong', gapToZero };
  }

  if (gapToZero >= 0) {
    return { health: 'ok', gapToZero };
  }

  if (gapToZero >= -0.2) {
    return { health: 'attention', gapToZero };
  }

  return { health: 'critical', gapToZero };
}
