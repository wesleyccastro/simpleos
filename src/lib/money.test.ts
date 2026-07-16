import { describe, expect, it } from 'vitest';
import { calcSubtotal, calcTotal, formatBRL, fromCents, installments, lineSubtotal, toCents } from './money';

// Intl usa espaço não separável (U+00A0) entre R$ e o valor
const noNbsp = (s: string) => s.replace(/ /g, ' ');

describe('toCents/fromCents', () => {
  it('converte reais para centavos com arredondamento', () => {
    expect(toCents(19.9)).toBe(1990);
    expect(toCents(0.1 + 0.2)).toBe(30); // sem erro de ponto flutuante
    expect(fromCents(1990)).toBe(19.9);
  });
});

describe('formatBRL', () => {
  it('formata em pt-BR', () => {
    expect(noNbsp(formatBRL(1000))).toBe('R$ 10,00');
    expect(noNbsp(formatBRL(199050))).toBe('R$ 1.990,50');
    expect(noNbsp(formatBRL(0))).toBe('R$ 0,00');
  });
});

describe('subtotais e total', () => {
  it('calcula subtotal de linha com quantidade fracionada', () => {
    expect(lineSubtotal({ quantity: 1.5, unitPriceCents: 1990 })).toBe(2985);
  });
  it('soma os itens', () => {
    expect(
      calcSubtotal([
        { quantity: 2, unitPriceCents: 5000 },
        { quantity: 1, unitPriceCents: 2550 },
      ]),
    ).toBe(12550);
  });
  it('aplica desconto (positivo) e acréscimo (negativo)', () => {
    expect(calcTotal(10000, 1000)).toBe(9000);
    expect(calcTotal(10000, -500)).toBe(10500);
  });
});

describe('installments', () => {
  it('divide igualmente quando exato', () => {
    expect(installments(9000, 3)).toEqual([3000, 3000, 3000]);
  });
  it('ajusta os centavos na última parcela', () => {
    expect(installments(10000, 3)).toEqual([3333, 3333, 3334]);
    expect(installments(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000);
  });
  it('1 parcela devolve o total', () => {
    expect(installments(10000, 1)).toEqual([10000]);
  });
  it('rejeita contagem inválida', () => {
    expect(() => installments(10000, 0)).toThrow();
  });
});
