import Papa from 'papaparse';
import type { ExchangeParseResult, FileParseResult, NormalizedPositionRow } from '../models';
import { parseLocaleNumber } from './number';
import type { ExchangeAdapter, ParseCsvTextResult } from './types';

const REQUIRED_COLUMNS = ['time', 'symbol', 'trade_value', 'fee', 'realized_pnl'] as const;

const PACIFICA_TRADE_HISTORY_COLUMNS = [
  'time',
  'symbol',
  'side',
  'type',
  'size',
  'price',
  'trade_value',
  'fee',
  'realized_pnl'
] as const;

const HEADER_ALIASES: Record<string, string> = {
  time: 'time',
  symbol: 'symbol',
  side: 'side',
  type: 'type',
  size: 'size',
  price: 'price',
  trade_value: 'trade_value',
  tradevalue: 'trade_value',
  fee: 'fee',
  realized_pnl: 'realized_pnl',
  realizedpnl: 'realized_pnl'
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

function normalizeTime(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  // Pacifica exports "YYYY-MM-DD HH:mm:ss"; normalize for consistent Date parsing.
  return value.includes(' ') ? value.replace(' ', 'T') : value;
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
  timeValue: string | null
): { minOpenedAt: string | null; maxClosedAt: string | null } {
  let minOpenedAt = currentMin;
  let maxClosedAt = currentMax;

  if (timeValue && isIsoDate(timeValue)) {
    if (!minOpenedAt || Date.parse(timeValue) < Date.parse(minOpenedAt)) {
      minOpenedAt = timeValue;
    }

    if (!maxClosedAt || Date.parse(timeValue) > Date.parse(maxClosedAt)) {
      maxClosedAt = timeValue;
    }
  }

  return { minOpenedAt, maxClosedAt };
}

function parseMonetaryValue(rawValue: unknown): number | null {
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : null;
  }

  if (typeof rawValue !== 'string') {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed.replace(/\s+/g, '').replace(/\$/g, '').replace(/[^\d.,+-]/g, '');
  if (!cleaned) {
    return null;
  }

  const sign = cleaned.startsWith('-') || cleaned.includes('-') ? '-' : '';
  const unsigned = cleaned.replace(/[+-]/g, '');
  if (!unsigned) {
    return null;
  }

  return parseLocaleNumber(`${sign}${unsigned}`);
}

function validatePacificaHeader(headers: string[]): string[] {
  const errors: string[] = [];

  if (headers.length !== PACIFICA_TRADE_HISTORY_COLUMNS.length) {
    errors.push(
      `Quantidade de colunas invalida: esperado ${PACIFICA_TRADE_HISTORY_COLUMNS.length}, recebido ${headers.length}`
    );
    return errors;
  }

  const isExpectedOrder = PACIFICA_TRADE_HISTORY_COLUMNS.every(
    (column, index) => headers[index] === column
  );

  if (!isExpectedOrder) {
    errors.push('Sequencia de colunas invalida para trade_history da Pacifica.');
    errors.push(`Esperado: ${PACIFICA_TRADE_HISTORY_COLUMNS.join(',')}`);
    errors.push(`Recebido: ${headers.join(',')}`);
  }

  return errors;
}

function parsePacificaCsvText(csvText: string, sourceFile: string): ParseCsvTextResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: canonicalizeHeader
  });

  const headers = (parsed.meta.fields ?? []).map((field) => canonicalizeHeader(field));
  const headerErrors = validatePacificaHeader(headers);
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
          'Arquivo nao parece ser trade_history da Pacifica.',
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
    const marketSymbol = String(rawRow.symbol ?? '').trim();
    const netExposureNotional = parseMonetaryValue(rawRow.trade_value);
    const cumulativePnlRealized = parseMonetaryValue(rawRow.realized_pnl);
    const totalTradingFees = parseMonetaryValue(rawRow.fee);
    const eventTime = normalizeTime(String(rawRow.time ?? ''));

    if (
      !marketSymbol ||
      netExposureNotional === null ||
      cumulativePnlRealized === null ||
      totalTradingFees === null
    ) {
      rowsInvalid += 1;
      continue;
    }

    const row: NormalizedPositionRow = {
      sourceFile,
      marketSymbol,
      netExposureNotional,
      cumulativePnlRealized,
      totalTradingFees,
      openedAt: eventTime,
      closedAt: eventTime,
      positionId: null
    };

    rows.push(row);

    const range = updateDateRange(minOpenedAt, maxClosedAt, eventTime);
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

async function parsePacificaFiles(files: File[]): Promise<ExchangeParseResult> {
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
    const parsed = parsePacificaCsvText(text, sourceFile);
    fileResults.push(parsed.result);

    if (parsed.result.status === 'ok') {
      allRows.push(...parsed.result.rows);
    }
  }

  return {
    exchangeId: 'pacifica',
    files: fileResults,
    rows: allRows
  };
}

export const pacificaExchangeAdapter: ExchangeAdapter = {
  id: 'pacifica',
  label: 'Pacifica',
  parseFiles: parsePacificaFiles
};

export { parsePacificaCsvText };
