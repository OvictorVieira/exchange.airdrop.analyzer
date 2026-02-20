import type { ExchangeParseResult, FileParseResult, SupportedExchange } from '../models';

export interface ExchangeAdapter {
  id: SupportedExchange;
  label: string;
  parseFiles(files: File[]): Promise<ExchangeParseResult>;
}

export interface ParseCsvTextResult {
  result: FileParseResult;
  rawHeaders: string[];
}
