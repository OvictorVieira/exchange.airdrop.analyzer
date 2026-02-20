import type { SellPlan } from '../core';
import { formatNumber, formatNumberSmart, formatPercent, formatUsd, formatUsdSmart } from '../utils/format';

interface SellPlansSectionProps {
  title: string;
  labels: {
    sellNow: string;
    hold: string;
    tokensSell: string;
    tokensHold: string;
    lockedValue: string;
    lockedProfit: string;
    scenarioBear: string;
    scenarioBase: string;
    scenarioBull: string;
    scenarioPrice: string;
    futureHoldValue: string;
    futureTotalValue: string;
    futureNetProfit: string;
    conservative: string;
    moderate: string;
    aggressive: string;
  };
  plans: SellPlan[];
}

function planLabel(profile: SellPlan['profile'], labels: SellPlansSectionProps['labels']): string {
  if (profile === 'conservative') {
    return labels.conservative;
  }

  if (profile === 'moderate') {
    return labels.moderate;
  }

  return labels.aggressive;
}

function scenarioLabel(
  scenarioKey: 'bear' | 'base' | 'bull',
  labels: SellPlansSectionProps['labels']
): string {
  if (scenarioKey === 'bear') {
    return labels.scenarioBear;
  }

  if (scenarioKey === 'base') {
    return labels.scenarioBase;
  }

  return labels.scenarioBull;
}

function formatScenarioUsd(value: number): string {
  if (Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }

  return formatUsdSmart(value);
}

function pnlValueClass(value: number): string {
  if (value > 0) {
    return 'pnl-positive';
  }

  if (value < 0) {
    return 'pnl-negative';
  }

  return 'pnl-neutral';
}

export function SellPlansSection({ title, labels, plans }: SellPlansSectionProps) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="plans-grid">
        {plans.map((plan) => (
          <article key={plan.profile} className="plan-card">
            <h3>{planLabel(plan.profile, labels)}</h3>
            <p className="plan-row">
              <span>{labels.sellNow}:</span>
              <strong>{formatPercent(plan.sellPct)}</strong>
            </p>
            <p className="plan-row">
              <span>{labels.hold}:</span>
              <strong>{formatPercent(plan.holdPct)}</strong>
            </p>
            <p className="plan-row">
              <span>{labels.tokensSell}:</span>
              <strong title={formatNumber(plan.tokensSell)}>{formatNumberSmart(plan.tokensSell)}</strong>
            </p>
            <p className="plan-row">
              <span>{labels.tokensHold}:</span>
              <strong title={formatNumber(plan.tokensHold)}>{formatNumberSmart(plan.tokensHold)}</strong>
            </p>
            <p className="plan-row">
              <span>{labels.lockedValue}:</span>
              <strong title={formatUsd(plan.valueSellNow)}>{formatUsdSmart(plan.valueSellNow)}</strong>
            </p>
            <p className="plan-row">
              <span>{labels.lockedProfit}:</span>
              <strong className={pnlValueClass(plan.lockedProfit)} title={formatUsd(plan.lockedProfit)}>
                {formatUsdSmart(plan.lockedProfit)}
              </strong>
            </p>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th className="align-right">{labels.scenarioPrice}</th>
                    <th className="align-right">{labels.futureHoldValue}</th>
                    <th className="align-right">{labels.futureNetProfit}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.scenarios.map((scenario) => (
                    <tr key={scenario.scenarioKey}>
                      <td>{scenarioLabel(scenario.scenarioKey, labels)}</td>
                      <td className="align-right" title={formatUsd(scenario.scenarioPrice)}>
                        {formatUsdSmart(scenario.scenarioPrice)}
                      </td>
                      <td className="align-right" title={formatUsd(scenario.futureValueHold)}>
                        {formatScenarioUsd(scenario.futureValueHold)}
                      </td>
                      <td
                        className={`align-right ${pnlValueClass(scenario.futureNetProfit)}`}
                        title={formatUsd(scenario.futureNetProfit)}
                      >
                        {formatScenarioUsd(scenario.futureNetProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
