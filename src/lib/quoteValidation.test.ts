import { describe, expect, it } from 'vitest';
import type { QuotePayload } from './types';
import { quoteValidationErrors } from './quoteValidation';

const valid: QuotePayload = {
  customerName: 'Maria',
  customerPhone: null,
  vehicleModel: null,
  vehiclePlate: null,
  vehicleKm: null,
  discountCents: 500,
  paymentTerms: { methods: ['pix'], installments: 1, notes: '' },
  notes: null,
  totalCents: 9500,
  items: [{ description: 'Serviço', quantity: 1, unitPriceCents: 10000 }],
};

describe('quoteValidationErrors', () => {
  it('aceita um orçamento consistente', () => {
    expect(quoteValidationErrors(valid)).toEqual([]);
  });

  it('rejeita desconto maior que o subtotal', () => {
    const errors = quoteValidationErrors({ ...valid, discountCents: 11000, totalCents: 0 });
    expect(errors).toContain('O desconto não pode ser maior que o subtotal.');
  });

  it('rejeita itens e valores inválidos', () => {
    const errors = quoteValidationErrors({
      ...valid,
      customerName: ' ',
      vehicleKm: -1,
      totalCents: 100,
      items: [{ description: '', quantity: 0, unitPriceCents: -1 }],
    });
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });
});
