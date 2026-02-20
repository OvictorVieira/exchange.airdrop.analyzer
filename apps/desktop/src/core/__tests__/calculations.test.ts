import { describe, expect, it } from 'vitest';
import { computeAnalyzerOutput } from '../engine';
import type { AnalyzerInputs, ExchangeParseResult } from '../models';

const dataset: ExchangeParseResult = {
  exchangeId: 'backpack',
  files: [],
  rows: [
    {
      sourceFile: 'a.csv',
      marketSymbol: 'BTC_USDC_PERP',
      netExposureNotional: -1000,
      cumulativePnlRealized: -100,
      totalTradingFees: 10,
      openedAt: null,
      closedAt: null,
      positionId: null
    },
    {
      sourceFile: 'a.csv',
      marketSymbol: 'ETH_USDC_PERP',
      netExposureNotional: 500,
      cumulativePnlRealized: 50,
      totalTradingFees: 5,
      openedAt: null,
      closedAt: null,
      positionId: null
    }
  ]
};

const inputs: AnalyzerInputs = {
  pointsOwn: 1000,
  pointsFree: 200,
  pointToToken: 0.5,
  tokenPrice: 1.2,
  riskProfile: 'moderate'
};

describe('computeAnalyzerOutput', () => {
  it('computes trading totals and metrics from business rules', () => {
    const output = computeAnalyzerOutput(dataset, inputs);

    expect(output.trading.volumeTotalUsd).toBe(1500);
    expect(output.trading.pnlTotalUsd).toBe(-50);
    expect(output.trading.feesTotalUsd).toBe(15);

    expect(output.tokens.pointsTotal).toBe(1200);
    expect(output.tokens.tokensTotal).toBe(600);
    expect(output.tokens.tokensFree).toBe(100);
    expect(output.tokens.tokensPaid).toBe(500);

    expect(output.metrics.costUsd).toBe(50);
    expect(output.metrics.valueUsd).toBe(720);
    expect(output.metrics.netProfitUsd).toBe(670);
    expect(output.metrics.roi).toBe(13.4);
    expect(output.metrics.costPerTokenTotal).toBeCloseTo(0.0833333, 6);
    expect(output.metrics.costPerTokenPaid).toBe(0.1);
    expect(output.metrics.breakEvenPrice).toBeCloseTo(0.0833333, 6);
    expect(output.metrics.pointsPer1mVolume).toBe(800000);
  });

  it('returns roi null when cost is zero', () => {
    const output = computeAnalyzerOutput(
      {
        ...dataset,
        rows: dataset.rows.map((row) => ({
          ...row,
          cumulativePnlRealized: Math.abs(row.cumulativePnlRealized)
        }))
      },
      inputs
    );

    expect(output.metrics.costUsd).toBe(0);
    expect(output.metrics.roi).toBeNull();
  });

  it('builds the three default sell plans', () => {
    const output = computeAnalyzerOutput(dataset, inputs);

    expect(output.sellPlans).toHaveLength(3);
    expect(output.sellPlans[0]?.profile).toBe('conservative');
    expect(output.sellPlans[1]?.profile).toBe('moderate');
    expect(output.sellPlans[2]?.profile).toBe('aggressive');
    expect(output.sellPlans.every((plan) => plan.scenarios.length === 3)).toBe(true);
  });
});
