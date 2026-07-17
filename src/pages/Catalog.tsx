import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../components/toast';
import { EmptyState, Field, MoneyInput, Spinner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { deactivateCatalogItem, listCatalog, saveCatalogItem } from '../lib/db';
import { formatBRL } from '../lib/money';
import type { CatalogItem } from '../lib/types';

interface Draft {
  id?: string;
  kind: 'produto' | 'servico';
  description: string;
  priceCents: number;
}

const emptyDraft: Draft = { kind: 'servico', description: '', priceCents: 0 };

export default function Catalog() {
  const { company } = useAuth();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function reload() {
    if (!company) return;
    setLoadError(false);
    try {
      setItems(await listCatalog(company.id));
    } catch {
      setLoadError(true);
      toast.error('Não foi possível carregar o catálogo.');
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!company || !draft || !draft.description.trim()) return;
    setBusy(true);
    try {
      await saveCatalogItem(company.id, {
        id: draft.id,
        kind: draft.kind,
        description: draft.description.trim(),
        defaultPriceCents: draft.priceCents,
      });
      toast.success(draft.id ? 'Item atualizado.' : 'Item adicionado.');
      setDraft(null);
      await reload();
    } catch {
      toast.error('Não foi possível salvar o item.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CatalogItem) {
    if (!window.confirm(`Excluir "${item.description}" do catálogo?`)) return;
    try {
      await deactivateCatalogItem(item.id);
      toast.success('Item excluído.');
      setDraft(null);
      await reload();
    } catch {
      toast.error('Não foi possível excluir o item.');
    }
  }

  if (!items && loadError) {
    return (
      <div className="card">
        <h1>Não foi possível carregar o catálogo</h1>
        <p className="muted">Confira sua conexão e tente novamente.</p>
        <button className="btn" onClick={() => void reload()}>Tentar novamente</button>
      </div>
    );
  }
  if (!items) return <Spinner />;

  const term = search.trim().toLowerCase();
  const filtered = items.filter((i) => !term || i.description.toLowerCase().includes(term));

  return (
    <>
      <h1>Catálogo</h1>
      {draft === null ? (
        <button className="btn" style={{ marginBottom: 16 }} onClick={() => setDraft(emptyDraft)}>
          + Novo produto ou serviço
        </button>
      ) : (
        <form className="card" onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>{draft.id ? 'Editar item' : 'Novo item'}</h2>
          <Field label="Tipo">
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft['kind'] })}
            >
              <option value="servico">Serviço</option>
              <option value="produto">Produto (peça)</option>
            </select>
          </Field>
          <Field label="Descrição">
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              required
              placeholder="Ex.: Troca de óleo"
            />
          </Field>
          <Field label="Preço padrão (R$)">
            <MoneyInput valueCents={draft.priceCents} onChange={(c) => setDraft({ ...draft, priceCents: c })} />
          </Field>
          <div className="row">
            <button type="button" className="btn secondary" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button className="btn" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
          {draft.id && (
            <button
              type="button"
              className="btn danger mt"
              onClick={() => {
                const item = items.find((i) => i.id === draft.id);
                if (item) void remove(item);
              }}
            >
              Excluir do catálogo
            </button>
          )}
        </form>
      )}
      <input type="search" placeholder="Buscar no catálogo…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt" />
      {filtered.length === 0 ? (
        <EmptyState
          icon="🧰"
          title={items.length === 0 ? 'Catálogo vazio' : 'Nada encontrado'}
          hint={items.length === 0 ? 'Cadastre serviços e peças para agilizar seus orçamentos.' : undefined}
        />
      ) : (
        filtered.map((item) => (
          <div
            key={item.id}
            className="list-row"
            onClick={() =>
              setDraft({ id: item.id, kind: item.kind, description: item.description, priceCents: item.defaultPriceCents })
            }
          >
            <div className="grow">
              <div className="title">{item.description}</div>
              <div className="sub">{item.kind === 'servico' ? 'Serviço' : 'Produto'}</div>
            </div>
            <div className="money">{formatBRL(item.defaultPriceCents)}</div>
          </div>
        ))
      )}
    </>
  );
}
