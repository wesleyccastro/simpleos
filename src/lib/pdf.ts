import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PAYMENT_METHOD_LABELS } from './constants';
import { calcSubtotal, formatBRL, formatInstallments } from './money';
import type { PublicCompany, Quote, QuoteItem } from './types';

export interface QuotePdfData {
  quote: Quote;
  company: PublicCompany;
  logoDataUrl?: string;
}

export function buildQuoteDocDefinition({ quote, company, logoDataUrl }: QuotePdfData): TDocumentDefinitions {
  const subtotalCents = calcSubtotal(quote.items);
  const primary = company.printPrimaryColor;
  const accent = company.printAccentColor;

  const headerColumns: Content[] = [];
  if (logoDataUrl) headerColumns.push({ image: logoDataUrl, fit: [64, 64], margin: [0, 0, 12, 0] });
  headerColumns.push({
    stack: [
      { text: company.name, fontSize: 16, bold: true, color: '#ffffff' },
      {
        text: [company.document, company.phone, company.address].filter(Boolean).join('  •  '),
        fontSize: 9,
        color: '#ffffff',
        margin: [0, 4, 0, 0],
      },
    ],
    margin: [0, 6, 0, 0],
  });

  const th = (text: string, alignment: 'left' | 'center' | 'right' = 'left'): Content => ({
    text,
    bold: true,
    fontSize: 9,
    color: '#ffffff',
    fillColor: primary,
    alignment,
  });

  const toRows = (items: QuoteItem[]): Content[][] =>
    items.map((it) => [
      { text: it.description, fontSize: 10 },
      { text: String(it.quantity), alignment: 'center', fontSize: 10 },
      { text: formatBRL(it.unitPriceCents), alignment: 'right', fontSize: 10 },
      { text: formatBRL(Math.round(it.quantity * it.unitPriceCents)), alignment: 'right', fontSize: 10 },
    ]);

  const itemsTable = (items: QuoteItem[]): Content => ({
    table: {
      headerRows: 1,
      widths: ['*', 40, 75, 85],
      body: [[th('Descrição'), th('Qtd', 'center'), th('Unitário', 'right'), th('Subtotal', 'right')], ...toRows(items)],
    },
    layout: 'lightHorizontalLines',
  });

  // Produtos primeiro, depois serviços — nessa ordem na impressão.
  const products = quote.items.filter((it) => it.kind === 'produto');
  const services = quote.items.filter((it) => it.kind === 'servico');
  const hasBothKinds = products.length > 0 && services.length > 0;
  const groupTitle = (text: string): Content => ({ text, fontSize: 10, bold: true, color: primary, margin: [0, 8, 0, 4] });

  const itemsContent: Content[] = [];
  if (products.length) {
    if (hasBothKinds) itemsContent.push(groupTitle('Produtos'));
    itemsContent.push(itemsTable(products));
  }
  if (services.length) {
    if (hasBothKinds) itemsContent.push(groupTitle('Serviços'));
    itemsContent.push(itemsTable(services));
  }

  const totalRows: Content[] = [];
  if (quote.discountCents !== 0) {
    totalRows.push({
      columns: [
        { text: 'Subtotal', alignment: 'right', fontSize: 10 },
        { text: formatBRL(subtotalCents), alignment: 'right', width: 110, fontSize: 10 },
      ],
    });
    totalRows.push({
      columns: [
        { text: quote.discountCents > 0 ? 'Desconto' : 'Acréscimo', alignment: 'right', fontSize: 10 },
        { text: formatBRL(Math.abs(quote.discountCents)), alignment: 'right', width: 110, fontSize: 10 },
      ],
      margin: [0, 2, 0, 0],
    });
  }
  totalRows.push({
    columns: [
      { text: 'TOTAL', alignment: 'right', bold: true, fontSize: 13, color: accent },
      { text: formatBRL(quote.totalCents), alignment: 'right', width: 110, bold: true, fontSize: 13, color: accent },
    ],
    margin: [0, 4, 0, 0],
  });

  const methods = quote.paymentTerms.methods.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ');
  const paymentLines: string[] = [];
  if (methods) paymentLines.push(`Formas de pagamento: ${methods}`);
  if (quote.paymentTerms.installments > 1) {
    paymentLines.push(`Parcelamento: ${formatInstallments(quote.totalCents, quote.paymentTerms.installments)}`);
  }
  if (quote.paymentTerms.notes) paymentLines.push(quote.paymentTerms.notes);

  const vehicle = [quote.vehicleModel, quote.vehiclePlate, quote.vehicleKm != null ? `${quote.vehicleKm} km` : null]
    .filter(Boolean)
    .join('  •  ');

  const sectionTitle = (text: string): Content => ({ text, fontSize: 11, bold: true, color: accent, margin: [0, 14, 0, 4] });

  const content: Content[] = [
    {
      table: {
        widths: ['*'],
        body: [[{ columns: headerColumns, fillColor: primary, margin: [12, 10, 12, 10] }]],
      },
      layout: 'noBorders',
    },
    {
      columns: [
        { text: `ORÇAMENTO Nº ${quote.number}`, fontSize: 14, bold: true, color: primary },
        { text: `Data: ${new Date(quote.createdAt).toLocaleDateString('pt-BR')}`, alignment: 'right', fontSize: 10 },
      ],
      margin: [0, 14, 0, 0],
    },
    sectionTitle('Cliente'),
    { text: quote.customerName, fontSize: 10 },
    ...(quote.customerPhone ? [{ text: `WhatsApp: ${quote.customerPhone}`, fontSize: 10 } as Content] : []),
    ...(vehicle ? [sectionTitle('Veículo'), { text: vehicle, fontSize: 10 } as Content] : []),
    sectionTitle('Itens'),
    ...itemsContent,
    { stack: totalRows, margin: [0, 10, 0, 0] },
    ...(paymentLines.length ? [sectionTitle('Pagamento'), { text: paymentLines.join('\n'), fontSize: 10 } as Content] : []),
    ...(quote.notes ? [sectionTitle('Observações'), { text: quote.notes, fontSize: 10 } as Content] : []),
    {
      text: `Orçamento válido por ${company.quoteValidityDays} dias.`,
      fontSize: 9,
      italics: true,
      color: '#666666',
      margin: [0, 20, 0, 0],
    },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [32, 28, 32, 32],
    content,
    defaultStyle: { fontSize: 10 },
    info: { title: `Orçamento ${quote.number} - ${company.name}` },
  };
}
