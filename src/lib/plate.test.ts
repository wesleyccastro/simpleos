import { describe, expect, it } from 'vitest';
import { formatPlate, isValidPlate, normalizePlate } from './plate';

describe('placas brasileiras', () => {
  it('normaliza letras, espaços e pontuação', () => {
    expect(normalizePlate(' abc-1d23 ')).toBe('ABC1D23');
  });

  it('formata placa do padrão antigo com hífen', () => {
    expect(formatPlate('abc1234')).toBe('ABC-1234');
  });

  it('mantém placa Mercosul sem hífen', () => {
    expect(formatPlate('abc1d23')).toBe('ABC1D23');
  });

  it('valida os padrões antigo e Mercosul', () => {
    expect(isValidPlate('ABC-1234')).toBe(true);
    expect(isValidPlate('ABC1D23')).toBe(true);
    expect(isValidPlate('AB123')).toBe(false);
  });
});
