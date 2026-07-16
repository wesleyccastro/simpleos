import { describe, expect, it } from 'vitest';
import { buildQuoteMessage, buildWaMeUrl, normalizePhone } from './whatsapp';

describe('normalizePhone', () => {
  it('remove máscara e adiciona DDI 55', () => {
    expect(normalizePhone('(11) 98888-7777')).toBe('5511988887777');
    expect(normalizePhone('11 3333-4444')).toBe('551133334444');
  });
  it('mantém DDI 55 já presente', () => {
    expect(normalizePhone('+55 11 98888-7777')).toBe('5511988887777');
  });
  it('rejeita número curto', () => {
    expect(normalizePhone('9999')).toBeNull();
  });
});

describe('buildQuoteMessage', () => {
  it('inclui cliente, número, total e link', () => {
    const msg = buildQuoteMessage({
      companyName: 'Oficina do Zé',
      number: 42,
      totalCents: 150000,
      publicUrl: 'https://app.exemplo.com/o/abc',
      customerName: 'Maria',
    });
    expect(msg).toContain('Maria');
    expect(msg).toContain('nº 42');
    expect(msg).toContain('Oficina do Zé');
    expect(msg.replace(/ /g, ' ')).toContain('R$ 1.500,00');
    expect(msg).toContain('https://app.exemplo.com/o/abc');
  });
});

describe('buildWaMeUrl', () => {
  it('monta URL com telefone normalizado e texto codificado', () => {
    const url = buildWaMeUrl('(11) 98888-7777', 'Olá, orçamento');
    expect(url).toBe(`https://wa.me/5511988887777?text=${encodeURIComponent('Olá, orçamento')}`);
  });
  it('sem telefone abre seletor de contato', () => {
    expect(buildWaMeUrl(null, 'oi')).toBe('https://wa.me/?text=oi');
    expect(buildWaMeUrl('123', 'oi')).toBe('https://wa.me/?text=oi');
  });
});
