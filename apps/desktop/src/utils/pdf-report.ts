import jsPDF from 'jspdf';
import type { AnalyzerOutput, FarmHealth } from '../core';
import { evaluateFarmHealth } from '../core';
import { formatNumber, formatPercent, formatUsd } from './format';

interface PdfReportLabels {
  exchange: string;
  generatedAt: string;
  fileCount: string;
  rowCount: string;
  sectionSummary: string;
  sectionDiagnosis: string;
  sectionSellPlans: string;
  diagnosisStatus: string;
  volumeUsd: string;
  pnlUsd: string;
  feesUsd: string;
  pointsTotal: string;
  tokensEstimated: string;
  estimatedValueUsd: string;
  costPerToken: string;
  breakEvenPrice: string;
  estimatedNetProfit: string;
  roi: string;
  roiZeroCost: string;
  pointsPer1m: string;
  farmPriceVsCost: string;
  farmNoData: string;
  sellNow: string;
  hold: string;
  tokensSell: string;
  tokensHold: string;
  lockedProfit: string;
  futureNetProfit: string;
  scenarioBear: string;
  scenarioBase: string;
  scenarioBull: string;
}

interface ExportPdfReportParams {
  appTitle: string;
  summaryTitle: string;
  exchangeLabel: string;
  generatedAtValue: string;
  output: AnalyzerOutput;
  fileCount: number;
  rowCount: number;
  labels: PdfReportLabels;
  planLabelByProfile: Record<'conservative' | 'moderate' | 'aggressive', string>;
  farmStatusByHealth: Record<FarmHealth, string>;
  farmMessageByHealth: Record<FarmHealth, string>;
}

function formatSignedPercent(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 2,
    signDisplay: 'always'
  }).format(value);
}

function fileSafeTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function exportPdfReport(params: ExportPdfReportParams): Promise<boolean> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 42;
  const marginRight = 553;
  let y = 46;

  const ensureSpace = (spaceNeeded: number) => {
    if (y + spaceNeeded <= pageHeight - 36) {
      return;
    }

    doc.addPage();
    y = 46;
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, marginLeft, y);
    y += 18;
  };

  const addKeyValueLine = (label: string, value: string) => {
    ensureSpace(18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(label, marginLeft, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, marginRight, y, { align: 'right' });
    y += 16;
  };

  const diagnosis = evaluateFarmHealth(params.output);
  const priceVsCostText =
    diagnosis.gapToZero === null ? params.labels.farmNoData : formatSignedPercent(diagnosis.gapToZero);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(params.appTitle, marginLeft, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`${params.summaryTitle}`, marginLeft, y);
  y += 16;
  doc.text(`${params.labels.exchange}: ${params.exchangeLabel}`, marginLeft, y);
  y += 16;
  doc.text(`${params.labels.generatedAt}: ${params.generatedAtValue}`, marginLeft, y);
  y += 20;
  doc.text(`${params.labels.fileCount}: ${formatNumber(params.fileCount, 0)}`, marginLeft, y);
  y += 16;
  doc.text(`${params.labels.rowCount}: ${formatNumber(params.rowCount, 0)}`, marginLeft, y);
  y += 22;

  addSectionTitle(params.labels.sectionSummary);
  addKeyValueLine(params.labels.volumeUsd, formatUsd(params.output.trading.volumeTotalUsd));
  addKeyValueLine(params.labels.pnlUsd, formatUsd(params.output.trading.pnlTotalUsd));
  addKeyValueLine(params.labels.feesUsd, formatUsd(params.output.trading.feesTotalUsd));
  addKeyValueLine(params.labels.pointsTotal, formatNumber(params.output.tokens.pointsTotal));
  addKeyValueLine(params.labels.tokensEstimated, formatNumber(params.output.tokens.tokensTotal));
  addKeyValueLine(params.labels.estimatedValueUsd, formatUsd(params.output.metrics.valueUsd));
  addKeyValueLine(params.labels.costPerToken, formatUsd(params.output.metrics.costPerTokenTotal));
  addKeyValueLine(params.labels.breakEvenPrice, formatUsd(params.output.metrics.breakEvenPrice));
  addKeyValueLine(params.labels.estimatedNetProfit, formatUsd(params.output.metrics.netProfitUsd));
  addKeyValueLine(
    params.labels.roi,
    params.output.metrics.roi === null ? params.labels.roiZeroCost : formatPercent(params.output.metrics.roi)
  );
  addKeyValueLine(params.labels.pointsPer1m, formatNumber(params.output.metrics.pointsPer1mVolume));

  y += 8;
  addSectionTitle(params.labels.sectionDiagnosis);
  addKeyValueLine(params.labels.diagnosisStatus, params.farmStatusByHealth[diagnosis.health]);
  ensureSpace(30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const diagnosisMessage = params.farmMessageByHealth[diagnosis.health];
  const diagnosisLines = doc.splitTextToSize(diagnosisMessage, marginRight - marginLeft);
  doc.text(diagnosisLines, marginLeft, y);
  y += diagnosisLines.length * 14 + 4;
  addKeyValueLine(params.labels.farmPriceVsCost, priceVsCostText);
  addKeyValueLine(
    params.labels.roi,
    params.output.metrics.roi === null ? params.labels.roiZeroCost : formatPercent(params.output.metrics.roi)
  );
  addKeyValueLine(params.labels.pointsPer1m, formatNumber(params.output.metrics.pointsPer1mVolume));

  y += 8;
  addSectionTitle(params.labels.sectionSellPlans);

  for (const plan of params.output.sellPlans) {
    ensureSpace(90);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(params.planLabelByProfile[plan.profile], marginLeft, y);
    y += 15;
    addKeyValueLine(params.labels.sellNow, formatPercent(plan.sellPct));
    addKeyValueLine(params.labels.hold, formatPercent(plan.holdPct));
    addKeyValueLine(params.labels.tokensSell, formatNumber(plan.tokensSell));
    addKeyValueLine(params.labels.tokensHold, formatNumber(plan.tokensHold));
    addKeyValueLine(params.labels.lockedProfit, formatUsd(plan.lockedProfit));
    for (const scenario of plan.scenarios) {
      const scenarioLabel =
        scenario.scenarioKey === 'bear'
          ? params.labels.scenarioBear
          : scenario.scenarioKey === 'base'
            ? params.labels.scenarioBase
            : params.labels.scenarioBull;
      addKeyValueLine(`${params.labels.futureNetProfit} (${scenarioLabel})`, formatUsd(scenario.futureNetProfit));
    }
    y += 6;
  }

  const filename = `exchange-airdrop-report-${fileSafeTimestamp()}.pdf`;
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const selectedPath = await save({
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!selectedPath) {
      return false;
    }

    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    await writeFile(selectedPath, bytes);
    return true;
  } catch {
    // Fallback for non-Tauri runtimes.
    doc.save(filename);
    return true;
  }
}
