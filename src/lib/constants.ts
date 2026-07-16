import type { QuoteStatus } from './types';

export const STATUSES: Record<QuoteStatus, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: '#b45309' },
  aprovado: { label: 'Aprovado', color: '#15803d' },
  em_andamento: { label: 'Em andamento', color: '#1d4ed8' },
  concluido: { label: 'Concluído', color: '#475569' },
  recusado: { label: 'Recusado', color: '#b91c1c' },
};

export const STATUS_ORDER: QuoteStatus[] = ['pendente', 'aprovado', 'em_andamento', 'concluido', 'recusado'];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
};
