import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { buildQuoteDocDefinition, type QuotePdfData } from './pdf';

// vfs_fonts (pdfmake 0.2.x atual) exporta o mapa de fontes diretamente;
// versões antigas expunham .vfs ou .pdfMake.vfs — cobrimos as três formas.
const fonts = pdfFonts as unknown as {
  vfs?: Record<string, string>;
  pdfMake?: { vfs: Record<string, string> };
  default?: Record<string, string>;
};
pdfMake.vfs = fonts.vfs ?? fonts.pdfMake?.vfs ?? fonts.default ?? (pdfFonts as unknown as Record<string, string>);

export async function fetchImageAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export function openQuotePdf(data: QuotePdfData): void {
  pdfMake.createPdf(buildQuoteDocDefinition(data)).open();
}

export function downloadQuotePdf(data: QuotePdfData): void {
  pdfMake.createPdf(buildQuoteDocDefinition(data)).download(`orcamento-${data.quote.number}.pdf`);
}

export function quotePdfBlob(data: QuotePdfData): Promise<Blob> {
  return new Promise((resolve) => pdfMake.createPdf(buildQuoteDocDefinition(data)).getBlob(resolve));
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  const probe = new File([''], 'probe.pdf', { type: 'application/pdf' });
  return navigator.canShare({ files: [probe] });
}

export async function shareQuotePdf(data: QuotePdfData): Promise<void> {
  const blob = await quotePdfBlob(data);
  const file = new File([blob], `orcamento-${data.quote.number}.pdf`, { type: 'application/pdf' });
  try {
    await navigator.share({ files: [file], title: `Orçamento nº ${data.quote.number}` });
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return; // usuário cancelou
    throw err;
  }
}
