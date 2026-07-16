import { formatBRL } from './money';

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return null;
}

export function buildQuoteMessage(p: {
  companyName: string;
  number: number;
  totalCents: number;
  publicUrl: string;
  customerName: string;
}): string {
  return [
    `Olá, ${p.customerName}!`,
    `Segue o orçamento nº ${p.number} da ${p.companyName}.`,
    `Total: ${formatBRL(p.totalCents)}`,
    `Veja os detalhes e baixe o PDF aqui: ${p.publicUrl}`,
  ].join('\n');
}

export function buildWaMeUrl(phone: string | null | undefined, message: string): string {
  const text = encodeURIComponent(message);
  const normalized = phone ? normalizePhone(phone) : null;
  return normalized ? `https://wa.me/${normalized}?text=${text}` : `https://wa.me/?text=${text}`;
}
