import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/toast';
import { EmptyState, Spinner, StatusBadge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { STATUSES, STATUS_ORDER } from '../lib/constants';
import { listQuotes, type QuoteListRow } from '../lib/db';
import { formatBRL } from '../lib/money';
import { normalizePlate } from '../lib/plate';
import type { QuoteStatus } from '../lib/types';

export default function Home() {
  const { company } = useAuth();
  const [rows, setRows] = useState<QuoteListRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QuoteStatus | 'todos'>('todos');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!company) return;
    setLoadError(false);
    listQuotes(company.id)
      .then(setRows)
      .catch(() => {
        setLoadError(true);
        toast.error('Não foi possível carregar os orçamentos.');
      });
  }, [company, toast]);

  function retry() {
    if (!company) return;
    setLoadError(false);
    listQuotes(company.id)
      .then(setRows)
      .catch(() => {
        setLoadError(true);
        toast.error('A conexão ainda não respondeu. Tente novamente.');
      });
  }

  const counts = useMemo(() => {
    const c: Partial<Record<QuoteStatus, number>> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const plateTerm = normalizePlate(search);
    return (rows ?? []).filter((r) => {
      if (filter !== 'todos' && r.status !== filter) return false;
      if (!term) return true;
      return (
        r.customerName.toLowerCase().includes(term) ||
        (plateTerm !== '' && normalizePlate(r.vehiclePlate ?? '').includes(plateTerm)) ||
        (r.vehicleModel ?? '').toLowerCase().includes(term) ||
        String(r.number).includes(term)
      );
    });
  }, [rows, search, filter]);

  if (!rows && loadError) {
    return (
      <div className="card">
        <h1>Não foi possível carregar os orçamentos</h1>
        <p className="muted">Confira sua conexão e tente novamente.</p>
        <button className="btn" onClick={retry}>Tentar novamente</button>
      </div>
    );
  }
  if (!rows) return <Spinner />;

  return (
    <>
      <h1>{company?.name}</h1>
      <Link to="/novo" className="btn accent" style={{ marginBottom: 16 }}>
        + Novo orçamento
      </Link>
      <input
        type="search"
        placeholder="Buscar por cliente, placa ou número…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="chips mt">
        <button className={`chip ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
          Todos ({rows.length})
        </button>
        {STATUS_ORDER.map((s) => (
          <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {STATUSES[s].label} ({counts[s] ?? 0})
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={rows.length === 0 ? 'Nenhum orçamento ainda' : 'Nada encontrado'}
          hint={rows.length === 0 ? 'Toque em "Novo orçamento" para criar o primeiro.' : 'Tente outra busca ou filtro.'}
        />
      ) : (
        filtered.map((r) => (
          <div key={r.id} className="list-row" onClick={() => navigate(`/orcamento/${r.id}`)}>
            <div className="grow">
              <div className="title">
                Nº {r.number} · {r.customerName}
              </div>
              <div className="sub">
                {[r.vehicleModel, r.vehiclePlate].filter(Boolean).join(' · ') || 'Sem veículo'} ·{' '}
                {new Date(r.createdAt).toLocaleDateString('pt-BR')}
              </div>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={r.status} />
              </div>
            </div>
            <div className="money">{formatBRL(r.totalCents)}</div>
          </div>
        ))
      )}
    </>
  );
}
