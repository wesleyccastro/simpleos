import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/toast';
import { Field, MoneyInput, Spinner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PAYMENT_METHOD_LABELS } from '../lib/constants';
import { createQuote, getQuote, listCatalog, updateQuote, type QuotePayload } from '../lib/db';
import { calcSubtotal, calcTotal, formatBRL, formatInstallments } from '../lib/money';
import { formatPlate } from '../lib/plate';
import type { CatalogItem } from '../lib/types';

interface DraftItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

const STEP_TITLES = ['Cliente e veículo', 'Itens do orçamento', 'Pagamento', 'Revisão'];

export default function QuoteWizard() {
  const { id } = useParams(); // presente apenas no modo edição
  const { company } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(Boolean(id));

  // Passo 1 — cliente e veículo
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleKm, setVehicleKm] = useState('');

  // Passo 2 — itens
  const [items, setItems] = useState<DraftItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [tab, setTab] = useState<'catalogo' | 'livre'>('catalogo');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [freeDesc, setFreeDesc] = useState('');
  const [freePriceCents, setFreePriceCents] = useState(0);
  const catalogSearchRef = useRef<HTMLInputElement>(null);

  // Passo 3 — pagamento
  const [methods, setMethods] = useState<string[]>([]);
  const [parcelas, setParcelas] = useState(1);
  const [discountKind, setDiscountKind] = useState<'desconto' | 'acrescimo'>('desconto');
  const [discountValueCents, setDiscountValueCents] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!company) return;
    listCatalog(company.id)
      .then(setCatalog)
      .catch(() => toast.error('Não foi possível carregar o catálogo.'));
  }, [company, toast]);

  useEffect(() => {
    if (!id) return;
    getQuote(id)
      .then((q) => {
        setCustomerName(q.customerName);
        setCustomerPhone(q.customerPhone ?? '');
        setVehicleModel(q.vehicleModel ?? '');
        setVehiclePlate(q.vehiclePlate ?? '');
        setVehicleKm(q.vehicleKm != null ? String(q.vehicleKm) : '');
        setItems(q.items.map(({ description, quantity, unitPriceCents }) => ({ description, quantity, unitPriceCents })));
        setMethods(q.paymentTerms.methods);
        setParcelas(q.paymentTerms.installments);
        setNotes(q.notes ?? '');
        setDiscountKind(q.discountCents >= 0 ? 'desconto' : 'acrescimo');
        setDiscountValueCents(Math.abs(q.discountCents));
        setLoadingQuote(false);
      })
      .catch(() => {
        toast.error('Orçamento não encontrado.');
        navigate('/');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!itemModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => catalogSearchRef.current?.focus(), 50);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setItemModalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [itemModalOpen]);

  const subtotalCents = useMemo(() => calcSubtotal(items), [items]);
  const discountCents = discountKind === 'desconto' ? discountValueCents : -discountValueCents;
  const rawTotalCents = subtotalCents - discountCents;
  const totalCents = calcTotal(subtotalCents, discountCents);

  const canContinue =
    step === 0
      ? customerName.trim().length > 0
      : step === 1
        ? items.length > 0
        : step === 2
          ? rawTotalCents >= 0
          : true;

  function addCatalogItem(c: CatalogItem) {
    setItems((prev) => [...prev, { description: c.description, quantity: 1, unitPriceCents: c.defaultPriceCents }]);
    setItemModalOpen(false);
    setCatalogSearch('');
    toast.success('Item adicionado.');
  }

  function addFreeItem() {
    if (!freeDesc.trim()) return;
    setItems((prev) => [...prev, { description: freeDesc.trim(), quantity: 1, unitPriceCents: freePriceCents }]);
    setFreeDesc('');
    setFreePriceCents(0);
    setItemModalOpen(false);
    toast.success('Item adicionado.');
  }

  function openItemModal(nextTab: 'catalogo' | 'livre' = 'catalogo') {
    setTab(nextTab);
    setItemModalOpen(true);
  }

  function patchItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    if (!company) return;
    setSaving(true);
    const payload: QuotePayload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      vehicleModel: vehicleModel.trim() || null,
      vehiclePlate: formatPlate(vehiclePlate) || null,
      vehicleKm: vehicleKm ? parseInt(vehicleKm, 10) : null,
      discountCents,
      paymentTerms: { methods, installments: methods.includes('credito') ? parcelas : 1, notes: '' },
      notes: notes.trim() || null,
      totalCents,
      items,
    };
    try {
      if (id) {
        await updateQuote(id, company.id, payload);
        navigate(`/orcamento/${id}`);
      } else {
        const quote = await createQuote(company.id, payload);
        navigate(`/orcamento/${quote.id}?novo=1`);
      }
    } catch {
      toast.error('Não foi possível salvar. Verifique a conexão e tente novamente.');
      setSaving(false);
    }
  }

  if (!company || loadingQuote) return <Spinner />;

  const term = catalogSearch.trim().toLowerCase();
  const filteredCatalog = catalog.filter((c) => !term || c.description.toLowerCase().includes(term));
  const availableMethods = company.paymentMethods.filter((m) => PAYMENT_METHOD_LABELS[m]);

  return (
    <>
      <h1>{id ? `Editar orçamento` : 'Novo orçamento'}</h1>
      <div className="steps">
        {STEP_TITLES.map((_, i) => (
          <span key={i} className={i <= step ? 'done' : ''} />
        ))}
      </div>
      <h2 style={{ marginTop: 0 }}>{STEP_TITLES[step]}</h2>

      {step === 0 && (
        <div className="card">
          <Field label="Nome do cliente *">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </Field>
          <Field label="WhatsApp do cliente">
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" placeholder="(11) 98888-7777" />
          </Field>
          <Field label="Veículo (modelo)">
            <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Ex.: Gol 1.6 2019" />
          </Field>
          <div className="row">
            <Field label="Placa">
              <input value={vehiclePlate} onChange={(e) => setVehiclePlate(formatPlate(e.target.value))} placeholder="ABC1D23" />
            </Field>
            <Field label="Km">
              <input value={vehicleKm} onChange={(e) => setVehicleKm(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          {items.length === 0 && (
            <div className="item-empty">
              <div className="item-empty-icon" aria-hidden="true">+</div>
              <strong>Comece adicionando um item</strong>
              <p>Busque um produto ou serviço do catálogo, ou escreva um item personalizado.</p>
              <button className="btn" onClick={() => openItemModal()}>
                <span aria-hidden="true">＋</span> Adicionar primeiro item
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div className="item-list-heading">
              <span>{items.length} {items.length === 1 ? 'item adicionado' : 'itens adicionados'}</span>
              <strong>{formatBRL(subtotalCents)}</strong>
            </div>
          )}

          {items.map((it, i) => (
            <div key={i} className="card quote-item-card">
              <div className="quote-item-heading">
                <span className="item-index">{i + 1}</span>
                <strong>{it.description}</strong>
                <button className="item-remove" aria-label={`Remover ${it.description}`} onClick={() => removeItem(i)}>
                  ×
                </button>
              </div>
              <div className="row quote-item-fields">
                <div>
                  <span className="small muted">Quantidade</span>
                  <div className="qty">
                    <button aria-label="Diminuir quantidade" onClick={() => patchItem(i, { quantity: Math.max(0.5, it.quantity - 1) })}>−</button>
                    <input
                      aria-label={`Quantidade de ${it.description}`}
                      inputMode="decimal"
                      value={String(it.quantity)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'));
                        patchItem(i, { quantity: Number.isFinite(v) && v > 0 ? v : it.quantity });
                      }}
                    />
                    <button aria-label="Aumentar quantidade" onClick={() => patchItem(i, { quantity: it.quantity + 1 })}>+</button>
                  </div>
                </div>
                <div>
                  <span className="small muted">Preço unitário</span>
                  <MoneyInput valueCents={it.unitPriceCents} onChange={(c) => patchItem(i, { unitPriceCents: c })} />
                </div>
                <div className="item-line-total">
                  <span className="small muted">Total</span>
                  <strong>{formatBRL(Math.round(it.quantity * it.unitPriceCents))}</strong>
                </div>
              </div>
            </div>
          ))}

          {items.length > 0 && (
            <button className="btn add-item-button" onClick={() => openItemModal()}>
              <span aria-hidden="true">＋</span> Adicionar outro item
            </button>
          )}

          {itemModalOpen && (
            <div className="modal-backdrop" role="presentation" onMouseDown={(e) => {
              if (e.target === e.currentTarget) setItemModalOpen(false);
            }}>
              <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
                <div className="modal-handle" aria-hidden="true" />
                <header className="modal-header">
                  <div>
                    <h3 id="item-modal-title">Adicionar item</h3>
                    <p>Escolha de onde vem o item do orçamento.</p>
                  </div>
                  <button className="modal-close" aria-label="Fechar" onClick={() => setItemModalOpen(false)}>×</button>
                </header>

                <div className="item-tabs" role="tablist" aria-label="Tipo de item">
                  <button
                    role="tab"
                    aria-selected={tab === 'catalogo'}
                    className={tab === 'catalogo' ? 'active' : ''}
                    onClick={() => setTab('catalogo')}
                  >
                    Do catálogo
                    <small>Produtos e serviços salvos</small>
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === 'livre'}
                    className={tab === 'livre' ? 'active' : ''}
                    onClick={() => setTab('livre')}
                  >
                    Item personalizado
                    <small>Descrição e preço livres</small>
                  </button>
                </div>

                <div className="modal-content">
                  {tab === 'catalogo' && (
                    <div role="tabpanel">
                      <div className="catalog-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                          ref={catalogSearchRef}
                          type="search"
                          placeholder="Buscar produto ou serviço…"
                          aria-label="Buscar no catálogo"
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                        />
                      </div>
                      <div className="catalog-results">
                        {filteredCatalog.length === 0 && (
                          <div className="modal-empty">
                            <strong>{catalogSearch ? 'Nenhum item encontrado' : 'Seu catálogo está vazio'}</strong>
                            <span>Você ainda pode adicionar um item personalizado.</span>
                            <button className="btn secondary small" onClick={() => setTab('livre')}>Criar item personalizado</button>
                          </div>
                        )}
                        {filteredCatalog.map((c) => (
                          <button key={c.id} className="catalog-option" onClick={() => addCatalogItem(c)}>
                            <span className={`catalog-kind ${c.kind}`}>{c.kind === 'servico' ? 'S' : 'P'}</span>
                            <span className="catalog-option-copy">
                              <strong>{c.description}</strong>
                              <small>{c.kind === 'servico' ? 'Serviço' : 'Produto'}</small>
                            </span>
                            <strong>{formatBRL(c.defaultPriceCents)}</strong>
                            <span className="catalog-add" aria-hidden="true">＋</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === 'livre' && (
                    <div role="tabpanel" className="free-item-form">
                      <Field label="Descrição do item *">
                        <input
                          autoFocus
                          value={freeDesc}
                          onChange={(e) => setFreeDesc(e.target.value)}
                          placeholder="Ex.: Solda no escapamento"
                        />
                      </Field>
                      <Field label="Preço unitário (R$)">
                        <MoneyInput valueCents={freePriceCents} onChange={setFreePriceCents} />
                      </Field>
                      <button className="btn" onClick={addFreeItem} disabled={!freeDesc.trim()}>
                        Adicionar ao orçamento
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <div className="card">
          <span className="small muted">Formas de pagamento:</span>
          {availableMethods.length === 0 && (
            <p className="muted small">Nenhuma forma configurada. Ajuste em Ajustes → Pagamento.</p>
          )}
          {availableMethods.map((m) => (
            <label key={m} className="check">
              <input
                type="checkbox"
                checked={methods.includes(m)}
                onChange={() =>
                  setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
                }
              />
              {PAYMENT_METHOD_LABELS[m]}
            </label>
          ))}

          {methods.includes('credito') && (
            <Field label="Parcelas no cartão">
              <select value={parcelas} onChange={(e) => setParcelas(parseInt(e.target.value, 10))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {formatInstallments(totalCents, n)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="row mt">
            <Field label="Ajuste no total">
              <select value={discountKind} onChange={(e) => setDiscountKind(e.target.value as 'desconto' | 'acrescimo')}>
                <option value="desconto">Desconto</option>
                <option value="acrescimo">Acréscimo</option>
              </select>
            </Field>
            <Field label="Valor (R$)">
              <MoneyInput valueCents={discountValueCents} onChange={setDiscountValueCents} />
            </Field>
          </div>
          {rawTotalCents < 0 && <p className="small" style={{ color: 'var(--danger)' }}>O desconto não pode ser maior que o subtotal.</p>}

          <Field label="Observações (saem no PDF)">
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: Garantia de 90 dias nas peças." />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>
            {customerName} {vehicleModel && <span className="muted small">· {vehicleModel}</span>}
          </h2>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>
                {it.quantity}x {it.description}
              </span>
              <strong>{formatBRL(Math.round(it.quantity * it.unitPriceCents))}</strong>
            </div>
          ))}
          {discountCents !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>{discountCents > 0 ? 'Desconto' : 'Acréscimo'}</span>
              <strong>{formatBRL(Math.abs(discountCents))}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.1rem' }}>
            <strong>Total</strong>
            <strong>{formatBRL(totalCents)}</strong>
          </div>
          {methods.length > 0 && (
            <p className="small muted">
              Pagamento: {methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(', ')}
              {methods.includes('credito') && parcelas > 1 ? ` · ${formatInstallments(totalCents, parcelas)}` : ''}
            </p>
          )}
          {notes && <p className="small muted">Obs.: {notes}</p>}
        </div>
      )}

      <div className="row mt" style={{ marginBottom: 70 }}>
        {step > 0 && (
          <button className="btn secondary" onClick={() => setStep(step - 1)} disabled={saving}>
            Voltar
          </button>
        )}
        {step < 3 ? (
          <button className="btn" onClick={() => setStep(step + 1)} disabled={!canContinue}>
            Continuar
          </button>
        ) : (
          <button className="btn accent" onClick={() => void save()} disabled={saving}>
            {saving ? 'Salvando…' : id ? 'Salvar alterações' : 'Gerar orçamento'}
          </button>
        )}
      </div>

      <div className="total-bar">
        <span>Total</span>
        <span>{formatBRL(Math.max(totalCents, 0))}</span>
      </div>
    </>
  );
}
