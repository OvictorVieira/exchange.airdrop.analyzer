export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatUsdSmart(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value);
  }

  return formatUsd(value);
}

export function formatNumber(value: number | null, fractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: fractionDigits
  }).format(value);
}

export function formatNumberSmart(value: number | null, fractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  if (Math.abs(value) >= 1_000_000_000) {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value);
  }

  return formatNumber(value, fractionDigits);
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPeriod(minOpenedAt: string | null, maxClosedAt: string | null): string {
  if (!minOpenedAt && !maxClosedAt) {
    return '--';
  }

  const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const formatDateTime = (raw: string | null): string => {
    if (!raw) {
      return '--';
    }

    const parsed = new Date(raw);
    if (!Number.isFinite(parsed.getTime())) {
      return '--';
    }

    return dateTimeFormatter.format(parsed);
  };

  return `${formatDateTime(minOpenedAt)} -> ${formatDateTime(maxClosedAt)}`;
}
