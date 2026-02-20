import { parseLocaleNumber } from '../core';

export interface InputState {
  pointsOwn: string;
  pointsFree: string;
  pointToToken: string;
  tokenPrice: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

interface InputsSectionProps {
  title: string;
  labels: {
    pointsOwn: string;
    pointsFree: string;
    advancedSettings: string;
    pointsFreeHint: string;
    pointToToken: string;
    tokenPrice: string;
  };
  state: InputState;
  onChange: (state: InputState) => void;
}

function updateField<K extends keyof InputState>(
  state: InputState,
  key: K,
  value: InputState[K],
  onChange: (next: InputState) => void
) {
  onChange({
    ...state,
    [key]: value
  });
}

const MAX_DECIMAL_DIGITS = 12;
const LOCALE_FORMAT_PARTS = new Intl.NumberFormat(undefined).formatToParts(1000.1);
const LOCALE_GROUP_SEPARATOR = LOCALE_FORMAT_PARTS.find((part) => part.type === 'group')?.value ?? ',';
const LOCALE_DECIMAL_SEPARATOR =
  LOCALE_FORMAT_PARTS.find((part) => part.type === 'decimal')?.value ?? '.';

type NumericInputKey = 'pointsOwn' | 'pointsFree' | 'pointToToken' | 'tokenPrice';

const LIVE_FORMAT_FIELDS: ReadonlySet<NumericInputKey> = new Set([
  'pointsOwn',
  'pointsFree',
  'tokenPrice'
]);

const DEFAULT_VALUE_BY_FIELD: Record<NumericInputKey, string> = {
  pointsOwn: '0',
  pointsFree: '0',
  pointToToken: '0.5',
  tokenPrice: '1'
};

function normalizeDecimalInput(rawValue: string): string {
  const cleaned = rawValue.replace(/[^\d.,]/g, '');
  if (!cleaned) {
    return '';
  }

  const separatorIndexes = [...cleaned.matchAll(/[.,]/g)]
    .map((match) => match.index)
    .filter((index): index is number => index !== undefined);

  if (separatorIndexes.length === 0) {
    return cleaned.replace(/^0+(?=\d)/, '');
  }

  const lastSeparatorIndex = separatorIndexes[separatorIndexes.length - 1] ?? -1;
  if (lastSeparatorIndex < 0) {
    return cleaned.replace(/^0+(?=\d)/, '');
  }
  const endsWithSeparator = lastSeparatorIndex === cleaned.length - 1;
  const digitsAtRight = cleaned.slice(lastSeparatorIndex + 1).replace(/\D/g, '');

  const isLikelyGroupingOnly =
    !endsWithSeparator && separatorIndexes.length > 1 && digitsAtRight.length === 3;

  if (isLikelyGroupingOnly) {
    const integerOnly = cleaned.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    return integerOnly || '0';
  }

  const integerDigits =
    cleaned.slice(0, lastSeparatorIndex).replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0';
  const decimalDigits = digitsAtRight.slice(0, MAX_DECIMAL_DIGITS);

  if (endsWithSeparator && decimalDigits.length === 0) {
    return `${integerDigits}.`;
  }

  return decimalDigits.length > 0 ? `${integerDigits}.${decimalDigits}` : integerDigits;
}

function groupIntegerDigits(integerDigits: string): string {
  const normalizedInteger = integerDigits.replace(/^0+(?=\d)/, '') || '0';
  return normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, LOCALE_GROUP_SEPARATOR);
}

function formatNormalizedForLiveDisplay(value: string): string {
  if (!value) {
    return '';
  }

  const hasTrailingDecimal = value.endsWith('.');
  const [integerPart = '0', decimalPart = ''] = value.split('.');
  const formattedInteger = groupIntegerDigits(integerPart);

  if (hasTrailingDecimal) {
    return `${formattedInteger}${LOCALE_DECIMAL_SEPARATOR}`;
  }

  if (value.includes('.')) {
    return `${formattedInteger}${LOCALE_DECIMAL_SEPARATOR}${decimalPart}`;
  }

  return formattedInteger;
}

function formatDecimalOnBlur(value: string): string {
  if (!value) {
    return '';
  }

  const parsed = parseLocaleNumber(value);
  if (parsed === null) {
    return '';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: MAX_DECIMAL_DIGITS
  }).format(parsed);
}

function normalizeForEditing(value: string): string {
  if (!value) {
    return '';
  }

  const parsed = parseLocaleNumber(value);
  if (parsed === null) {
    return '';
  }

  return parsed.toFixed(MAX_DECIMAL_DIGITS).replace(/\.?0+$/, '');
}

export function InputsSection({ title, labels, state, onChange }: InputsSectionProps) {
  function handleNumericChange(key: NumericInputKey, value: string) {
    const normalized = normalizeDecimalInput(value);

    if (LIVE_FORMAT_FIELDS.has(key)) {
      updateField(state, key, formatNormalizedForLiveDisplay(normalized), onChange);
      return;
    }

    updateField(state, key, normalized, onChange);
  }

  function handleNumericBlur(key: NumericInputKey) {
    if (!state[key].trim()) {
      const fallback = DEFAULT_VALUE_BY_FIELD[key];
      if (LIVE_FORMAT_FIELDS.has(key)) {
        updateField(state, key, formatNormalizedForLiveDisplay(fallback), onChange);
        return;
      }

      updateField(state, key, fallback, onChange);
      return;
    }

    updateField(state, key, formatDecimalOnBlur(state[key]), onChange);
  }

  function handleNumericFocus(key: NumericInputKey) {
    if (LIVE_FORMAT_FIELDS.has(key)) {
      return;
    }

    updateField(state, key, normalizeForEditing(state[key]), onChange);
  }

  return (
    <section className="panel">
      <h2>{title}</h2>

      <div className="form-grid">
        <label>
          <span>{labels.pointsOwn}</span>
          <input
            type="text"
            inputMode="decimal"
            value={state.pointsOwn}
            onChange={(event) => handleNumericChange('pointsOwn', event.target.value)}
            onBlur={() => handleNumericBlur('pointsOwn')}
          />
        </label>

        <label>
          <span>{labels.pointToToken}</span>
          <input
            type="text"
            inputMode="decimal"
            value={state.pointToToken}
            onChange={(event) => handleNumericChange('pointToToken', event.target.value)}
            onFocus={() => handleNumericFocus('pointToToken')}
            onBlur={() => handleNumericBlur('pointToToken')}
          />
        </label>

        <label>
          <span>{labels.tokenPrice}</span>
          <input
            type="text"
            inputMode="decimal"
            value={state.tokenPrice}
            onChange={(event) => handleNumericChange('tokenPrice', event.target.value)}
            onBlur={() => handleNumericBlur('tokenPrice')}
          />
        </label>
      </div>

      <details className="advanced-settings">
        <summary>{labels.advancedSettings}</summary>
        <div className="advanced-grid">
          <label>
            <span>{labels.pointsFree}</span>
            <input
              type="text"
              inputMode="decimal"
              value={state.pointsFree}
              onChange={(event) => handleNumericChange('pointsFree', event.target.value)}
              onBlur={() => handleNumericBlur('pointsFree')}
            />
            <small className="field-help">{labels.pointsFreeHint}</small>
          </label>
        </div>
      </details>
    </section>
  );
}
