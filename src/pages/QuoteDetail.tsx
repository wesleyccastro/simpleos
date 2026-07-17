import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/toast';
import { Spinner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PAYMENT_METHOD_LABELS, STATUSES, STATUS_ORDER } from '../lib/constants';
import { deleteQuote, duplicateQuote, getQuote, setQuoteStatus } from '../lib/db';
import { calcSubtotal, formatBRL, formatInstallments } from '../lib/money';
import { canShareFiles, fetchImageAsDataUrl, quotePdfBlob, shareQuotePdf } from '../lib/pdfActions';
import type { QuotePdfData } from '../lib/pdf';
import { sortItemsByKind, toPublicCompany, type Quote, type QuoteStatus } from '../lib/types';
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

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

  useEffect(() => {
    if (!confirmDeleteOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) setConfirmDeleteOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmDeleteOpen, deleting]);

  useEffect(() => {
    if (!pdfPreviewUrl) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePdfPreview();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPreviewUrl]);

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
      const blob = await quotePdfBlob(await buildPdfData());
      setPdfPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast.error('Não foi possível gerar o PDF.');
    } finally {
      setBusy(false);
    }
  }

  function closePdfPreview() {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
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

  async function removeQuote() {
    setDeleting(true);
    try {
      await deleteQuote(quote!.id, company!.id);
      toast.success(`Orçamento nº ${quote!.number} excluído.`);
      navigate('/', { replace: true });
    } catch {
      toast.error('Não foi possível excluir o orçamento. Tente novamente.');
      setDeleting(false);
    }
  }

  const { paymentTerms } = quote;
  const installmentText =
    paymentTerms.installments > 1 ? formatInstallments(quote.totalCents, paymentTerms.installments) : null;

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

      <div className="quote-heading">
        <h1>Orçamento nº {quote.number}</h1>
        <p className="muted small">Criado em {new Date(quote.createdAt).toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="quote-toolbar" aria-label="Ações do orçamento">
        <button className="btn quote-tool" onClick={() => void viewPdf()} disabled={busy}>
          <span aria-hidden="true">📄</span>
          <span>Ver PDF</span>
        </button>
        <button className="btn accent quote-tool" onClick={sendWhatsApp}>
          <span aria-hidden="true">💬</span>
          <span>WhatsApp</span>
        </button>
        {canShareFiles() && (
          <button className="btn secondary quote-tool" onClick={() => void sharePdf()} disabled={busy}>
            <span aria-hidden="true">📎</span>
            <span>Compartilhar</span>
          </button>
        )}
      </div>

      <label className="quote-status-field">
        <span>
          <i style={{ background: STATUSES[quote.status].color }} />
          Status
        </span>
        <select
          value={quote.status}
          onChange={(e) => void changeStatus(e.target.value as QuoteStatus)}
          aria-label="Alterar status do orçamento"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUSES[s].label}</option>
          ))}
        </select>
      </label>

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
                {installmentText && ` · ${installmentText}`}
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

      <button className="delete-quote-trigger" onClick={() => setConfirmDeleteOpen(true)}>
        <span aria-hidden="true">🗑️</span> Excluir orçamento
      </button>

      {confirmDeleteOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setConfirmDeleteOpen(false);
          }}
        >
          <section
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-quote-title"
            aria-describedby="delete-quote-description"
          >
            <div className="confirm-modal-icon" aria-hidden="true">🗑️</div>
            <h2 id="delete-quote-title">Excluir este orçamento?</h2>
            <p id="delete-quote-description">
              O orçamento nº {quote.number}, de <strong>{quote.customerName}</strong>, será excluído permanentemente junto com seus itens.
            </p>
            <p className="confirm-warning">Esta ação não pode ser desfeita.</p>
            <div className="confirm-actions">
              <button
                className="btn secondary"
                autoFocus
                disabled={deleting}
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancelar
              </button>
              <button className="btn danger-solid" disabled={deleting} onClick={() => void removeQuote()}>
                {deleting ? 'Excluindo…' : 'Sim, excluir'}
              </button>
            </div>
          </section>
        </div>
      )}

      {pdfPreviewUrl && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePdfPreview();
          }}
        >
          <section className="item-modal pdf-modal" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
            <div className="modal-handle" aria-hidden="true" />
            <header className="modal-header">
              <h3 id="pdf-preview-title">Orçamento nº {quote.number}</h3>
              <button className="modal-close" aria-label="Fechar" onClick={closePdfPreview}>×</button>
            </header>
            <div className="modal-content pdf-modal-content">
              <iframe src={pdfPreviewUrl} title={`Orçamento nº ${quote.number}`} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
