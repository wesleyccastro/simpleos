import { describe, expect, it } from 'vitest';
import { buildQuoteDocDefinition } from './pdf';
import type { PublicCompany, Quote } from './types';

const company: PublicCompany = {
  name: 'Oficina Teste',
  document: '12.345.678/0001-00',
  phone: '(11) 3333-4444',
  address: 'Rua A, 123',
  logoUrl: null,
  printPrimaryColor: '#123456',
  printAccentColor: '#654321',
  quoteValidityDays: 15,
};

const quote: Quote = {
  id: 'q1',
  number: 42,
  status: 'pendente',
  customerName: 'Maria Silva',
  customerPhone: '(11) 98888-7777',
  vehicleModel: 'Gol 1.6',
  vehiclePlate: 'ABC1D23',
  vehicleKm: 85000,
  discountCents: 1000,
  paymentTerms: { methods: ['pix', 'credito'], installments: 3, notes: '' },
  notes: 'Peças com garantia de 90 dias',
  totalCents: 149000,
  shareToken: 'tok',
  createdAt: '2026-07-16T12:00:00Z',
  items: [
    { description: 'Troca de óleo', quantity: 1, unitPriceCents: 15000 },
    { description: 'Pastilha de freio', quantity: 2, unitPriceCents: 67500 },
  ],
};

describe('buildQuoteDocDefinition', () => {
  const def = buildQuoteDocDefinition({ quote, company });
  const json = JSON.stringify(def);

  it('inclui empresa, número e cliente', () => {
    expect(json).toContain('Oficina Teste');
    expect(json).toContain('ORÇAMENTO Nº 42');
    expect(json).toContain('Maria Silva');
  });
  it('inclui itens e veículo', () => {
    expect(json).toContain('Troca de óleo');
    expect(json).toContain('Pastilha de freio');
    expect(json).toContain('ABC1D23');
  });
  it('usa as cores configuradas da empresa', () => {
    expect(json).toContain('#123456');
    expect(json).toContain('#654321');
  });
  it('mostra desconto, total e parcelas', () => {
    expect(json).toContain('Desconto');
    expect(json.replace(/ /g, ' ')).toContain('R$ 1.490,00');
    expect(json).toContain('3x de');
  });
  it('mostra validade e observações', () => {
    expect(json).toContain('válido por 15 dias');
    expect(json).toContain('Peças com garantia de 90 dias');
  });
  it('não inclui imagem quando não há logo', () => {
    expect(json).not.toContain('"image"');
  });
});
