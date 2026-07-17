import { buildQuoteDocDefinition, type QuotePdfData } from './pdf';

async function createPdfMake() {
  const [{ default: pdfMake }, pdfFonts] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const fonts = pdfFonts as unknown as {
    vfs?: Record<string, string>;
    pdfMake?: { vfs: Record<string, string> };
    default?: Record<string, string>;
  };
  pdfMake.vfs = fonts.vfs ?? fonts.pdfMake?.vfs ?? fonts.default ?? (pdfFonts as unknown as Record<string, string>);
  return pdfMake;
}

let pdfMakePromise: ReturnType<typeof createPdfMake> | null = null;

function loadPdfMake() {
  pdfMakePromise ??= createPdfMake();
  return pdfMakePromise;
}

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

export async function downloadQuotePdf(data: QuotePdfData): Promise<void> {
  const pdfMake = await loadPdfMake();
  pdfMake.createPdf(buildQuoteDocDefinition(data)).download(`orcamento-${data.quote.number}.pdf`);
}

export async function quotePdfBlob(data: QuotePdfData): Promise<Blob> {
  const pdfMake = await loadPdfMake();
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
