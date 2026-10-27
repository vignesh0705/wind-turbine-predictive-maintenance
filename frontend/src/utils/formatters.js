/**
 * Utilities for formatting values, percentages, power, risk, health, and dates.
 * Explicitly guards against NaN, undefined, and null values.
 */

export function isValidNumber(val) {
  return typeof val === 'number' && !isNaN(val) && isFinite(val);
}

export function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || !isValidNumber(Number(val))) {
    return '0.00';
  }
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(val, decimals = 1) {
  if (val === null || val === undefined || !isValidNumber(Number(val))) {
    return '0.0%';
  }
  return `${Number(val).toFixed(decimals)}%`;
}

export function formatPower(val, unit = 'kW') {
  if (val === null || val === undefined || !isValidNumber(Number(val))) {
    return `0.00 ${unit}`;
  }
  const num = Number(val);
  return `${num.toFixed(2)} ${unit}`;
}

export function formatHealth(val) {
  if (val === null || val === undefined || !isValidNumber(Number(val))) {
    return '0.0';
  }
  return Math.min(100, Math.max(0, Number(val))).toFixed(1);
}

export function formatRisk(val) {
  if (val === null || val === undefined || !isValidNumber(Number(val))) {
    return '0.0';
  }
  return Math.min(100, Math.max(0, Number(val))).toFixed(1);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatFileSize(bytes) {
  if (!isValidNumber(Number(bytes)) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'MB'}`;
}
