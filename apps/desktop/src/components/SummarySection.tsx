import type { AnalyzerOutput, FarmHealth, FileParseResult } from '../core';
import { evaluateFarmHealth } from '../core';
import {
  formatNumber,
  formatNumberSmart,
  formatPercent,
  formatPeriod,
  formatUsd,
  formatUsdSmart
} from '../utils/format';

interface SummarySectionProps {
  summaryTitle: string;
  technicalTitle: string;
  exportPdfLabel: string;
  exportingPdfLabel: string;
  isExportingPdf: boolean;
  onExportPdf: () => void | Promise<void>;
  labels: {
    volumeUsd: string;
    pnlUsd: string;
    feesUsd: string;
    pointsTotal: string;
    tokensEstimated: string;
    estimatedValueUsd: string;
    costPerToken: string;
    costPerTokenPaid: string;
    breakEvenPrice: string;
    estimatedNetProfit: string;
    roi: string;
    roiZeroCost: string;
    pointsPer1m: string;
    byFile: string;
    byMarket: string;
    rows: string;
    period: string;
    market: string;
    farmDiagnosisTitle: string;
    farmStatusStrong: string;
    farmStatusOk: string;
    farmStatusAttention: string;
    farmStatusCritical: string;
    farmStatusUnknown: string;
    farmMessageStrong: string;
    farmMessageOk: string;
    farmMessageAttention: string;
    farmMessageCritical: string;
    farmMessageUnknown: string;
    farmPriceVsCost: string;
    farmNoData: string;
    farmAboveZero: string;
    farmBelowZero: string;
  };
  output: AnalyzerOutput;
  fileResults: FileParseResult[];
}

interface MetricCardProps {
  title: string;
  value: string;
  fullValue?: string;
  valueClassName?: string;
}

function MetricCard({ title, value, fullValue, valueClassName }: MetricCardProps) {
  return (
    <article className="metric-card">
      <h3>{title}</h3>
      <p title={fullValue} className={valueClassName}>
        {value}
      </p>
    </article>
  );
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

function formatSignedPercent(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 2,
    signDisplay: 'always'
  }).format(value);
}

export function SummarySection({
  summaryTitle,
  technicalTitle,
  exportPdfLabel,
  exportingPdfLabel,
  isExportingPdf,
  onExportPdf,
  labels,
  output,
  fileResults
}: SummarySectionProps) {
  const farmEvaluation = evaluateFarmHealth(output);

  const farmStatusLabelByHealth: Record<FarmHealth, string> = {
    strong: labels.farmStatusStrong,
    ok: labels.farmStatusOk,
    attention: labels.farmStatusAttention,
    critical: labels.farmStatusCritical,
    unknown: labels.farmStatusUnknown
  };

  const farmMessageByHealth: Record<FarmHealth, string> = {
    strong: labels.farmMessageStrong,
    ok: labels.farmMessageOk,
    attention: labels.farmMessageAttention,
    critical: labels.farmMessageCritical,
    unknown: labels.farmMessageUnknown
  };

  const priceVsCostLabel =
    farmEvaluation.gapToZero === null ? labels.farmNoData : formatSignedPercent(farmEvaluation.gapToZero);

  const priceVsCostClassName =
    farmEvaluation.gapToZero === null
      ? 'neutral'
      : farmEvaluation.gapToZero >= 0
        ? 'positive'
        : 'negative';

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{summaryTitle}</h2>
        <div className="panel-actions">
          <button type="button" className="ghost" onClick={onExportPdf} disabled={isExportingPdf}>
            {isExportingPdf ? exportingPdfLabel : exportPdfLabel}
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title={labels.volumeUsd}
          value={formatUsdSmart(output.trading.volumeTotalUsd)}
          fullValue={formatUsd(output.trading.volumeTotalUsd)}
        />
        <MetricCard
          title={labels.pnlUsd}
          value={formatUsdSmart(output.trading.pnlTotalUsd)}
          fullValue={formatUsd(output.trading.pnlTotalUsd)}
          valueClassName={pnlValueClass(output.trading.pnlTotalUsd)}
        />
        <MetricCard
          title={labels.feesUsd}
          value={formatUsdSmart(output.trading.feesTotalUsd)}
          fullValue={formatUsd(output.trading.feesTotalUsd)}
        />
        <MetricCard
          title={labels.pointsTotal}
          value={formatNumberSmart(output.tokens.pointsTotal)}
          fullValue={formatNumber(output.tokens.pointsTotal)}
        />
        <MetricCard
          title={labels.tokensEstimated}
          value={formatNumberSmart(output.tokens.tokensTotal)}
          fullValue={formatNumber(output.tokens.tokensTotal)}
        />
        <MetricCard
          title={labels.estimatedValueUsd}
          value={formatUsdSmart(output.metrics.valueUsd)}
          fullValue={formatUsd(output.metrics.valueUsd)}
        />
        <MetricCard
          title={labels.costPerToken}
          value={formatUsdSmart(output.metrics.costPerTokenTotal)}
          fullValue={formatUsd(output.metrics.costPerTokenTotal)}
        />
        <MetricCard
          title={labels.costPerTokenPaid}
          value={formatUsdSmart(output.metrics.costPerTokenPaid)}
          fullValue={formatUsd(output.metrics.costPerTokenPaid)}
        />
        <MetricCard
          title={labels.breakEvenPrice}
          value={formatUsdSmart(output.metrics.breakEvenPrice)}
          fullValue={formatUsd(output.metrics.breakEvenPrice)}
        />
        <MetricCard
          title={labels.estimatedNetProfit}
          value={formatUsdSmart(output.metrics.netProfitUsd)}
          fullValue={formatUsd(output.metrics.netProfitUsd)}
          valueClassName={pnlValueClass(output.metrics.netProfitUsd)}
        />
        <MetricCard
          title={labels.roi}
          value={output.metrics.roi === null ? labels.roiZeroCost : formatPercent(output.metrics.roi)}
        />
        <MetricCard
          title={labels.pointsPer1m}
          value={formatNumberSmart(output.metrics.pointsPer1mVolume)}
          fullValue={formatNumber(output.metrics.pointsPer1mVolume)}
        />
      </div>

      <section className={`farm-diagnosis ${farmEvaluation.health}`}>
        <div className="farm-diagnosis-header">
          <h3>{labels.farmDiagnosisTitle}</h3>
          <span className={`farm-badge ${farmEvaluation.health}`}>
            {farmStatusLabelByHealth[farmEvaluation.health]}
          </span>
        </div>
        <p className="farm-diagnosis-message">{farmMessageByHealth[farmEvaluation.health]}</p>
        <div className="farm-diagnosis-grid">
          <p className="farm-diagnosis-row">
            <span>{labels.farmPriceVsCost}</span>
            <strong className={priceVsCostClassName}>{priceVsCostLabel}</strong>
          </p>
          <p className="farm-diagnosis-row">
            <span>{labels.roi}</span>
            <strong>{output.metrics.roi === null ? labels.roiZeroCost : formatPercent(output.metrics.roi)}</strong>
          </p>
          <p className="farm-diagnosis-row">
            <span>{labels.pointsPer1m}</span>
            <strong>{formatNumber(output.metrics.pointsPer1mVolume)}</strong>
          </p>
        </div>
      </section>

      <details className="technical-details" open>
        <summary>{technicalTitle}</summary>

        <h3>{labels.byFile}</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{labels.byFile}</th>
                <th>{labels.rows}</th>
                <th>{labels.period}</th>
                <th>{labels.volumeUsd}</th>
                <th>{labels.pnlUsd}</th>
                <th>{labels.feesUsd}</th>
              </tr>
            </thead>
            <tbody>
              {output.trading.byFile.map((entry) => {
                const fileMeta = fileResults.find((file) => file.sourceFile === entry.key);
                return (
                  <tr key={entry.key}>
                    <td>{entry.key}</td>
                    <td>{fileMeta?.rowsValid ?? entry.rowsCount}</td>
                    <td>{formatPeriod(fileMeta?.minOpenedAt ?? null, fileMeta?.maxClosedAt ?? null)}</td>
                    <td>{formatUsd(entry.volumeUsd)}</td>
                    <td className={pnlValueClass(entry.pnlUsd)}>{formatUsd(entry.pnlUsd)}</td>
                    <td>{formatUsd(entry.feesUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3>{labels.byMarket}</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{labels.market}</th>
                <th>{labels.rows}</th>
                <th>{labels.volumeUsd}</th>
                <th>{labels.pnlUsd}</th>
                <th>{labels.feesUsd}</th>
              </tr>
            </thead>
            <tbody>
              {output.trading.byMarket.map((entry) => (
                <tr key={entry.key}>
                  <td>{entry.key}</td>
                  <td>{entry.rowsCount}</td>
                  <td>{formatUsd(entry.volumeUsd)}</td>
                  <td className={pnlValueClass(entry.pnlUsd)}>{formatUsd(entry.pnlUsd)}</td>
                  <td>{formatUsd(entry.feesUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
