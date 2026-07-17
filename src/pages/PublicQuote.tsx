import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState, Spinner } from '../components/ui';
import { useToast } from '../components/toast';
import { PAYMENT_METHOD_LABELS } from '../lib/constants';
import { getPublicQuote, type PublicQuote as PublicQuoteData } from '../lib/db';
import { calcSubtotal, formatBRL, formatInstallments } from '../lib/money';
import { downloadQuotePdf, fetchImageAsDataUrl } from '../lib/pdfActions';
import { sortItemsByKind } from '../lib/types';

export default function PublicQuote() {
  const { token } = useParams();
  const [data, setData] = useState<PublicQuoteData | null | 'erro'>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!token) {
      setData('erro');
      return;
    }
    getPublicQuote(token)
      .then((d) => setData(d ?? 'erro'))
      .catch(() => setData('erro'));
  }, [token]);

  if (data === null) return <Spinner />;
  if (data === 'erro') {
    return (
      <div className="center-page">
        <EmptyState icon="🔍" title="Orçamento não encontrado" hint="Confira o link com a oficina." />
      </div>
    );
  }

  const { quote, company } = data;
  const subtotalCents = calcSubtotal(quote.items);
  const installmentText =
    quote.paymentTerms.installments > 1 ? formatInstallments(quote.totalCents, quote.paymentTerms.installments) : null;

  async function baixarPdf() {
    setBusy(true);
    try {
      const logoDataUrl = company.logoUrl ? await fetchImageAsDataUrl(company.logoUrl) : undefined;
      await downloadQuotePdf({ quote, company, logoDataUrl });
    } catch {
      toast.error('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-main" style={{ paddingBottom: 24 }}>
      <div className="card" style={{ background: company.printPrimaryColor, border: 'none' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {company.logoUrl && (
            <img
              src={company.logoUrl}
              alt="Logo"
              style={{ height: 48, maxWidth: 96, objectFit: 'contain', background: '#fff', borderRadius: 6 }}
            />
          )}
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>{company.name}</div>
            <div style={{ color: '#fff', opacity: 0.85, fontSize: '0.8rem' }}>
              {[company.document, company.phone, company.address].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
      </div>

      <h1 style={{ color: company.printPrimaryColor }}>Orçamento nº {quote.number}</h1>
      <p className="muted small" style={{ marginTop: -8 }}>
        {new Date(quote.createdAt).toLocaleDateString('pt-BR')} · Cliente: {quote.customerName}
        {quote.vehicleModel && ` · ${quote.vehicleModel}`}
        {quote.vehiclePlate && ` · ${quote.vehiclePlate}`}
      </p>

      <div className="card">
        {sortItemsByKind(quote.items).map((it, i) => (
          <div
            key={i}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}
          >
            <span>
              {it.quantity}x {it.description}
            </span>
            <strong>{formatBRL(Math.round(it.quantity * it.unitPriceCents))}</strong>
          </div>
        ))}
        {quote.discountCents !== 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="muted">Subtotal</span>
              <span>{formatBRL(subtotalCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span className="muted">{quote.discountCents > 0 ? 'Desconto' : 'Acréscimo'}</span>
              <span>{formatBRL(Math.abs(quote.discountCents))}</span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: '1.15rem' }}>
          <strong>Total</strong>
          <strong style={{ color: company.printAccentColor }}>{formatBRL(quote.totalCents)}</strong>
        </div>
      </div>

      {(quote.paymentTerms.methods.length > 0 || quote.notes) && (
        <div className="card">
          {quote.paymentTerms.methods.length > 0 && (
            <div className="small">
              <strong>Pagamento: </strong>
              {quote.paymentTerms.methods.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ')}
              {installmentText && ` · ${installmentText}`}
            </div>
          )}
          {quote.notes && <div className="small muted mt">{quote.notes}</div>}
        </div>
      )}

      <button className="btn" onClick={() => void baixarPdf()} disabled={busy}>
        ⬇️ Baixar PDF
      </button>
      <p className="small muted mt" style={{ textAlign: 'center' }}>
        Orçamento válido por {company.quoteValidityDays} dias.
      </p>
    </div>
  );
}
