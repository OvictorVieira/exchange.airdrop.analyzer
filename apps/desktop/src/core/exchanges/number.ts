const SPACES_REGEX = /\s+/g;

function normalizeNumericString(value: string): string {
  return value.replace(SPACES_REGEX, '');
}

function parseSingleSeparator(value: string, separator: ',' | '.'): number | null {
  const occurrences = value.split(separator).length - 1;
  if (occurrences === 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (occurrences > 1) {
    const collapsed = value.replace(new RegExp(`\\${separator}`, 'g'), '');
    const parsed = Number(collapsed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const [left = '', right = ''] = value.split(separator);
  const leftDigits = left.replace(/^[+-]/, '');
  const normalizedLeftDigits = leftDigits.replace(/^0+(?=\d)/, '') || '0';
  const isLikelyThousands =
    right.length === 3 &&
    leftDigits.length > 0 &&
    leftDigits.length <= 3 &&
    normalizedLeftDigits !== '0';

  if (isLikelyThousands) {
    const collapsed = value.replace(separator, '');
    const parsed = Number(collapsed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const replaced = separator === ',' ? value.replace(',', '.') : value;
  const parsed = Number(replaced);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseLocaleNumber(rawValue: unknown): number | null {
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : null;
  }

  if (typeof rawValue !== 'string') {
    return null;
  }

  const value = normalizeNumericString(rawValue.trim());
  if (!value) {
    return null;
  }

  const hasComma = value.includes(',');
  const hasDot = value.includes('.');

  if (hasComma && hasDot) {
    const lastComma = value.lastIndexOf(',');
    const lastDot = value.lastIndexOf('.');

    if (lastComma > lastDot) {
      const normalized = value.replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const normalized = value.replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (hasComma) {
    return parseSingleSeparator(value, ',');
  }

  if (hasDot) {
    return parseSingleSeparator(value, '.');
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
