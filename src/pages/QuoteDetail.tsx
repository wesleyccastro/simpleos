import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/toast';
import { Spinner, StatusBadge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PAYMENT_METHOD_LABELS, STATUSES, STATUS_ORDER } from '../lib/constants';
import { duplicateQuote, getQuote, setQuoteStatus } from '../lib/db';
import { calcSubtotal, formatBRL, installments as splitInstallments } from '../lib/money';
import { canShareFiles, fetchImageAsDataUrl, openQuotePdf, shareQuotePdf } from '../lib/pdfActions';
import type { QuotePdfData } from '../lib/pdf';
import { toPublicCompany, type Quote, type QuoteStatus } from '../lib/types';
import { buildQuoteMessage, buildWaMeUrl } from '../lib/whatsapp';

export default function QuoteDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('novo') === '1';
  const { company } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    setQuote(null);
    getQuote(id)
      .then(setQuote)
      .catch(() => {
        toast.error('Orçamento não encontrado.');
        navigate('/');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!company || !quote) return <Spinner />;

  const publicUrl = `${window.location.origin}/o/${quote.shareToken}`;
  const subtotalCents = calcSubtotal(quote.items);

  async function buildPdfData(): Promise<QuotePdfData> {
    const logoDataUrl = company!.logoUrl ? await fetchImageAsDataUrl(company!.logoUrl) : undefined;
    return { quote: quote!, company: toPublicCompany(company!), logoDataUrl };
  }

  async function viewPdf() {
    setBusy(true);
    try {
      openQuotePdf(await buildPdfData());
    } catch {
      toast.error('Não foi possível gerar o PDF.');
    } finally {
      setBusy(false);
    }
  }

  function sendWhatsApp() {
    const message = buildQuoteMessage({
      companyName: company!.name,
      number: quote!.number,
      totalCents: quote!.totalCents,
      publicUrl,
      customerName: quote!.customerName,
    });
    window.open(buildWaMeUrl(quote!.customerPhone, message), '_blank');
  }

  async function sharePdf() {
    setBusy(true);
    try {
      await shareQuotePdf(await buildPdfData());
    } catch {
      toast.error('Não foi possível compartilhar o PDF.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: QuoteStatus) {
    try {
      await setQuoteStatus(quote!.id, status);
      setQuote({ ...quote!, status });
      toast.success(`Status alterado para ${STATUSES[status].label}.`);
    } catch {
      toast.error('Não foi possível mudar o status.');
    }
  }

  async function duplicate() {
    setBusy(true);
    try {
      const copy = await duplicateQuote(company!.id, quote!.id);
      toast.success(`Orçamento nº ${copy.number} criado.`);
      navigate(`/orcamento/${copy.id}?novo=1`);
    } catch {
      toast.error('Não foi possível duplicar.');
    } finally {
      setBusy(false);
    }
  }

  const { paymentTerms } = quote;
  const parts = paymentTerms.installments > 1 ? splitInstallments(quote.totalCents, paymentTerms.installments) : null;

  return (
    <>
      {isNew && (
        <div className="card" style={{ background: '#ecfdf5', borderColor: '#15803d' }}>
          <strong>✅ Orçamento gerado!</strong>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            Agora é só ver o PDF ou enviar para o cliente no WhatsApp.
          </p>
        </div>
      )}

      <h1>
        Orçamento nº {quote.number} <StatusBadge status={quote.status} />
      </h1>
      <p className="muted small" style={{ marginTop: -8 }}>
        Criado em {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
      </p>

      <button className="btn" onClick={() => void viewPdf()} disabled={busy}>
        📄 Ver PDF
      </button>
      <button className="btn accent mt" onClick={sendWhatsApp}>
        💬 Enviar link no WhatsApp
      </button>
      {canShareFiles() && (
        <button className="btn secondary mt" onClick={() => void sharePdf()} disabled={busy}>
          📎 Compartilhar PDF
        </button>
      )}

      <h2>Status</h2>
      <div className="chips">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            className={`chip ${quote.status === s ? 'active' : ''}`}
            style={quote.status === s ? { background: STATUSES[s].color, borderColor: STATUSES[s].color } : undefined}
            onClick={() => void changeStatus(s)}
          >
            {STATUSES[s].label}
          </button>
        ))}
      </div>

      <h2>Cliente</h2>
      <div className="card">
        <strong>{quote.customerName}</strong>
        {quote.customerPhone && <div className="small muted">WhatsApp: {quote.customerPhone}</div>}
        {(quote.vehicleModel || quote.vehiclePlate || quote.vehicleKm != null) && (
          <div className="small muted">
            {[quote.vehicleModel, quote.vehiclePlate, quote.vehicleKm != null ? `${quote.vehicleKm} km` : null]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
      </div>

      <h2>Itens</h2>
      <div className="card">
        {quote.items.map((it, i) => (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: '1.1rem' }}>
          <strong>Total</strong>
          <strong>{formatBRL(quote.totalCents)}</strong>
        </div>
      </div>

      {(paymentTerms.methods.length > 0 || quote.notes) && (
        <>
          <h2>Pagamento e observações</h2>
          <div className="card">
            {paymentTerms.methods.length > 0 && (
              <div className="small">
                {paymentTerms.methods.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ')}
                {parts && ` · ${paymentTerms.installments}x de ${formatBRL(parts[0])}`}
              </div>
            )}
            {quote.notes && <div className="small muted mt">{quote.notes}</div>}
          </div>
        </>
      )}

      <div className="row mt" style={{ marginBottom: 24 }}>
        <button className="btn secondary" onClick={() => navigate(`/orcamento/${quote.id}/editar`)}>
          ✏️ Editar
        </button>
        <button className="btn secondary" onClick={() => void duplicate()} disabled={busy}>
          📋 Duplicar
        </button>
      </div>
    </>
  );
}
