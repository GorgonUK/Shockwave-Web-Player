const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, exp);
  const digits = exp === 0 ? 0 : fractionDigits;
  return `${value.toFixed(digits)} ${UNITS[exp]}`;
}
