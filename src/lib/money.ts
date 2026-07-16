export interface MoneyLine {
  quantity: number;
  unitPriceCents: number;
}

export function toCents(reais: number): number {
  return Math.round(reais * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function lineSubtotal(item: MoneyLine): number {
  return Math.round(item.quantity * item.unitPriceCents);
}

export function calcSubtotal(items: MoneyLine[]): number {
  return items.reduce((sum, item) => sum + lineSubtotal(item), 0);
}

export function calcTotal(subtotalCents: number, discountCents: number): number {
  return subtotalCents - discountCents;
}

export function installments(totalCents: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('Número de parcelas deve ser >= 1');
  const base = Math.floor(totalCents / count);
  const parts = new Array<number>(count).fill(base);
  parts[count - 1] = totalCents - base * (count - 1);
  return parts;
}
