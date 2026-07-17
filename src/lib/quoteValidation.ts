import { calcSubtotal, calcTotal } from './money';
import type { QuotePayload } from './types';

export function quoteValidationErrors(payload: QuotePayload): string[] {
  const errors: string[] = [];

  if (!payload.customerName.trim()) errors.push('Informe o nome do cliente.');
  if (payload.items.length === 0) errors.push('Adicione pelo menos um item.');
  if (payload.vehicleKm != null && (!Number.isInteger(payload.vehicleKm) || payload.vehicleKm < 0)) {
    errors.push('Informe uma quilometragem válida.');
  }
  if (!Number.isInteger(payload.discountCents)) errors.push('O ajuste precisa estar em centavos inteiros.');
  if (!Number.isInteger(payload.totalCents) || payload.totalCents < 0) errors.push('O total não pode ser negativo.');
  if (!Number.isInteger(payload.paymentTerms.installments) || payload.paymentTerms.installments < 1) {
    errors.push('Informe uma quantidade válida de parcelas.');
  }

  payload.items.forEach((item, index) => {
    const label = `Item ${index + 1}`;
    if (!item.description.trim()) errors.push(`${label}: informe a descrição.`);
    if (item.kind !== 'produto' && item.kind !== 'servico') errors.push(`${label}: informe se é produto ou serviço.`);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) errors.push(`${label}: a quantidade deve ser maior que zero.`);
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      errors.push(`${label}: o preço não pode ser negativo.`);
    }
  });

  const subtotal = calcSubtotal(payload.items);
  const rawTotal = subtotal - payload.discountCents;
  if (rawTotal < 0) errors.push('O desconto não pode ser maior que o subtotal.');
  if (payload.totalCents !== calcTotal(subtotal, payload.discountCents)) {
    errors.push('O total informado não corresponde aos itens e ao ajuste.');
  }

  return errors;
}

export function assertValidQuotePayload(payload: QuotePayload): void {
  const [error] = quoteValidationErrors(payload);
  if (error) throw new Error(error);
}
