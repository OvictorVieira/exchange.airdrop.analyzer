import Papa from 'papaparse';
import type { ExchangeParseResult, FileParseResult, NormalizedPositionRow } from '../models';
import { parseLocaleNumber } from './number';
import type { ExchangeAdapter, ParseCsvTextResult } from './types';

const REQUIRED_COLUMNS = [
  'market_symbol',
  'net_exposure_notional',
  'cumulative_pnl_realized',
  'total_trading_fees'
] as const;

const BACKPACK_POSITION_HISTORY_COLUMNS = [
  'position_id',
  'market_symbol',
  'net_quantity',
  'net_exposure_quantity',
  'net_exposure_notional',
  'net_cost',
  'mark_price',
  'entry_price',
  'cumulative_pnl_realized',
  'total_unrealized_pnl',
  'total_funding_quantity',
  'total_interest',
  'total_liquidated',
  'total_trading_fees',
  'last_event_type',
  'max_net_quantity',
  'max_net_quantity_direction',
  'closing_price',
  'account_leverage',
  'opened_at',
  'closed_at'
] as const;

const HEADER_ALIASES: Record<string, string> = {
  marketsymbol: 'market_symbol',
  market_symbol: 'market_symbol',
  marketsymbolperp: 'market_symbol',
  netexposurenotional: 'net_exposure_notional',
  net_exposure_notional: 'net_exposure_notional',
  cumulativepnlrealized: 'cumulative_pnl_realized',
  cumulative_pnl_realized: 'cumulative_pnl_realized',
  totaltradingfees: 'total_trading_fees',
  total_trading_fees: 'total_trading_fees',
  openedat: 'opened_at',
  opened_at: 'opened_at',
  closedat: 'closed_at',
  closed_at: 'closed_at',
  positionid: 'position_id',
  position_id: 'position_id'
};

function compactHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_');
}

function canonicalizeHeader(header: string): string {
  const normalized = compactHeader(header);
  const collapsed = normalized.replace(/_/g, '');
  return HEADER_ALIASES[normalized] ?? HEADER_ALIASES[collapsed] ?? normalized;
}

function isIsoDate(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

function updateDateRange(
  currentMin: string | null,
  currentMax: string | null,
  openedAt: string | null,
  closedAt: string | null
): { minOpenedAt: string | null; maxClosedAt: string | null } {
  let minOpenedAt = currentMin;
  let maxClosedAt = currentMax;

  if (openedAt && isIsoDate(openedAt)) {
    if (!minOpenedAt || Date.parse(openedAt) < Date.parse(minOpenedAt)) {
      minOpenedAt = openedAt;
    }
  }

  if (closedAt && isIsoDate(closedAt)) {
    if (!maxClosedAt || Date.parse(closedAt) > Date.parse(maxClosedAt)) {
      maxClosedAt = closedAt;
    }
  }

  return { minOpenedAt, maxClosedAt };
}

function validateBackpackHeader(headers: string[]): string[] {
  const errors: string[] = [];

  if (headers.length !== BACKPACK_POSITION_HISTORY_COLUMNS.length) {
    errors.push(
      `Quantidade de colunas invalida: esperado ${BACKPACK_POSITION_HISTORY_COLUMNS.length}, recebido ${headers.length}`
    );
    return errors;
  }

  const isExpectedOrder = BACKPACK_POSITION_HISTORY_COLUMNS.every(
    (column, index) => headers[index] === column
  );

  if (!isExpectedOrder) {
    errors.push('Sequencia de colunas invalida para position_history da Backpack.');
    errors.push(`Esperado: ${BACKPACK_POSITION_HISTORY_COLUMNS.join(',')}`);
    errors.push(`Recebido: ${headers.join(',')}`);
  }

  return errors;
}

function parseBackpackCsvText(csvText: string, sourceFile: string): ParseCsvTextResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: canonicalizeHeader
  });

  const headers = (parsed.meta.fields ?? []).map((field) => canonicalizeHeader(field));
  const headerErrors = validateBackpackHeader(headers);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  const baseResult: FileParseResult = {
    sourceFile,
    rowsTotal: parsed.data.length,
    rowsValid: 0,
    rowsInvalid: 0,
    minOpenedAt: null,
    maxClosedAt: null,
    status: 'ok',
    errors: [],
    rows: []
  };

  if (headerErrors.length > 0 || missingColumns.length > 0) {
    return {
      rawHeaders: headers,
      result: {
        ...baseResult,
        status: 'error',
        errors: [
          'Arquivo nao parece ser position_history da Backpack.',
          ...headerErrors,
          ...missingColumns.map((column) => `Coluna obrigatoria ausente: ${column}`)
        ]
      }
    };
  }

  const rows: NormalizedPositionRow[] = [];
  let rowsInvalid = 0;
  let minOpenedAt: string | null = null;
  let maxClosedAt: string | null = null;

  for (const rawRow of parsed.data) {
    const marketSymbol = String(rawRow.market_symbol ?? '').trim();
    const netExposureNotional = parseLocaleNumber(rawRow.net_exposure_notional);
    const cumulativePnlRealized = parseLocaleNumber(rawRow.cumulative_pnl_realized);
    const totalTradingFees = parseLocaleNumber(rawRow.total_trading_fees);
    const openedAtRaw = String(rawRow.opened_at ?? '').trim();
    const closedAtRaw = String(rawRow.closed_at ?? '').trim();
    const positionIdRaw = String(rawRow.position_id ?? '').trim();

    if (
      !marketSymbol ||
      netExposureNotional === null ||
      cumulativePnlRealized === null ||
      totalTradingFees === null
    ) {
      rowsInvalid += 1;
      continue;
    }

    const openedAt = openedAtRaw || null;
    const closedAt = closedAtRaw || null;

    const row: NormalizedPositionRow = {
      sourceFile,
      marketSymbol,
      netExposureNotional,
      cumulativePnlRealized,
      totalTradingFees,
      openedAt,
      closedAt,
      positionId: positionIdRaw || null
    };

    rows.push(row);

    const range = updateDateRange(minOpenedAt, maxClosedAt, openedAt, closedAt);
    minOpenedAt = range.minOpenedAt;
    maxClosedAt = range.maxClosedAt;
  }

  const errors: string[] = [];
  if (parsed.errors.length > 0) {
    errors.push('Erro ao ler CSV. Verifique o formato do arquivo.');
  }

  if (rows.length === 0) {
    errors.push('Nenhuma linha valida encontrada');
  }

  const result: FileParseResult = {
    sourceFile,
    rowsTotal: parsed.data.length,
    rowsValid: rows.length,
    rowsInvalid,
    minOpenedAt,
    maxClosedAt,
    status: errors.length > 0 ? 'error' : 'ok',
    errors,
    rows
  };

  return { result, rawHeaders: headers };
}

async function parseBackpackFiles(files: File[]): Promise<ExchangeParseResult> {
  const fileResults: FileParseResult[] = [];
  const allRows: NormalizedPositionRow[] = [];

  for (const file of files) {
    const sourceFile = file.name;

    if (!sourceFile.toLowerCase().endsWith('.csv')) {
      fileResults.push({
        sourceFile,
        rowsTotal: 0,
        rowsValid: 0,
        rowsInvalid: 0,
        minOpenedAt: null,
        maxClosedAt: null,
        status: 'error',
        errors: ['Apenas arquivos .csv sao aceitos'],
        rows: []
      });
      continue;
    }

    const text = await file.text();
    const parsed = parseBackpackCsvText(text, sourceFile);

    fileResults.push(parsed.result);
    if (parsed.result.status === 'ok') {
      allRows.push(...parsed.result.rows);
    }
  }

  return {
    exchangeId: 'backpack',
    files: fileResults,
    rows: allRows
  };
}

export const backpackExchangeAdapter: ExchangeAdapter = {
  id: 'backpack',
  label: 'Backpack',
  parseFiles: parseBackpackFiles
};

export { parseBackpackCsvText };
