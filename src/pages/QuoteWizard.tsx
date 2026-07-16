import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/toast';
import { Field, MoneyInput, Spinner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PAYMENT_METHOD_LABELS } from '../lib/constants';
import { createQuote, getQuote, listCatalog, updateQuote, type QuotePayload } from '../lib/db';
import { calcSubtotal, calcTotal, formatBRL, installments as splitInstallments } from '../lib/money';
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
  const [catalogSearch, setCatalogSearch] = useState('');
  const [freeDesc, setFreeDesc] = useState('');
  const [freePriceCents, setFreePriceCents] = useState(0);

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

  const subtotalCents = useMemo(() => calcSubtotal(items), [items]);
  const discountCents = discountKind === 'desconto' ? discountValueCents : -discountValueCents;
  const totalCents = calcTotal(subtotalCents, discountCents);

  const canContinue =
    step === 0
      ? customerName.trim().length > 0
      : step === 1
        ? items.length > 0
        : step === 2
          ? totalCents >= 0
          : true;

  function addCatalogItem(c: CatalogItem) {
    setItems((prev) => [...prev, { description: c.description, quantity: 1, unitPriceCents: c.defaultPriceCents }]);
    toast.success('Item adicionado.');
  }

  function addFreeItem() {
    if (!freeDesc.trim()) return;
    setItems((prev) => [...prev, { description: freeDesc.trim(), quantity: 1, unitPriceCents: freePriceCents }]);
    setFreeDesc('');
    setFreePriceCents(0);
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
      vehiclePlate: vehiclePlate.trim().toUpperCase() || null,
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
              <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="ABC1D23" />
            </Field>
            <Field label="Km">
              <input value={vehicleKm} onChange={(e) => setVehicleKm(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <>
          {items.map((it, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>{it.description}</strong>
                <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => removeItem(i)}>
                  Remover
                </button>
              </div>
              <div className="row mt">
                <div>
                  <span className="small muted">Quantidade</span>
                  <div className="qty">
                    <button onClick={() => patchItem(i, { quantity: Math.max(0.5, it.quantity - 1) })}>−</button>
                    <input
                      inputMode="decimal"
                      value={String(it.quantity)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(',', '.'));
                        patchItem(i, { quantity: Number.isFinite(v) && v > 0 ? v : it.quantity });
                      }}
                    />
                    <button onClick={() => patchItem(i, { quantity: it.quantity + 1 })}>+</button>
                  </div>
                </div>
                <div>
                  <span className="small muted">Preço unitário</span>
                  <MoneyInput valueCents={it.unitPriceCents} onChange={(c) => patchItem(i, { unitPriceCents: c })} />
                </div>
              </div>
            </div>
          ))}

          <div className="chips">
            <button className={`chip ${tab === 'catalogo' ? 'active' : ''}`} onClick={() => setTab('catalogo')}>
              Do catálogo
            </button>
            <button className={`chip ${tab === 'livre' ? 'active' : ''}`} onClick={() => setTab('livre')}>
              Texto livre
            </button>
          </div>

          {tab === 'catalogo' && (
            <div className="card">
              <input
                type="search"
                placeholder="Buscar no catálogo…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
              <div className="mt" />
              {filteredCatalog.length === 0 && (
                <p className="muted small">Nenhum item no catálogo. Use a aba "Texto livre" ou cadastre em Catálogo.</p>
              )}
              {filteredCatalog.map((c) => (
                <div key={c.id} className="list-row" onClick={() => addCatalogItem(c)}>
                  <div className="grow">
                    <div className="title">{c.description}</div>
                    <div className="sub">{c.kind === 'servico' ? 'Serviço' : 'Produto'}</div>
                  </div>
                  <div className="money">{formatBRL(c.defaultPriceCents)}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'livre' && (
            <div className="card">
              <Field label="Descrição">
                <input value={freeDesc} onChange={(e) => setFreeDesc(e.target.value)} placeholder="Ex.: Solda no escapamento" />
              </Field>
              <Field label="Preço (R$)">
                <MoneyInput valueCents={freePriceCents} onChange={setFreePriceCents} />
              </Field>
              <button className="btn secondary" onClick={addFreeItem} disabled={!freeDesc.trim()}>
                Adicionar item
              </button>
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
                    {n}x de {formatBRL(splitInstallments(Math.max(totalCents, 0), n)[0])}
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
          {totalCents < 0 && <p className="small" style={{ color: 'var(--danger)' }}>O desconto não pode ser maior que o subtotal.</p>}

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
              {methods.includes('credito') && parcelas > 1 ? ` · ${parcelas}x` : ''}
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
