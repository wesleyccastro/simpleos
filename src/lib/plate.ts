export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export function formatPlate(value: string): string {
  const normalized = normalizePlate(value);
  return /^[A-Z]{3}\d{4}$/.test(normalized)
    ? `${normalized.slice(0, 3)}-${normalized.slice(3)}`
    : normalized;
}

export function isValidPlate(value: string): boolean {
  const normalized = normalizePlate(value);
  return /^[A-Z]{3}(?:\d{4}|\d[A-Z]\d{2})$/.test(normalized);
}
