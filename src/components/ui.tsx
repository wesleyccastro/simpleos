import type { ReactNode } from 'react';
import { STATUSES } from '../lib/constants';
import type { QuoteStatus } from '../lib/types';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function centsToInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function inputToCents(value: string): number {
  return parseInt(value.replace(/\D/g, '') || '0', 10);
}

export function MoneyInput({
  valueCents,
  onChange,
  id,
}: {
  valueCents: number;
  onChange: (cents: number) => void;
  id?: string;
}) {
  return (
    <input
      id={id}
      inputMode="numeric"
      value={centsToInput(valueCents)}
      onChange={(e) => onChange(inputToCents(e.target.value))}
    />
  );
}

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const s = STATUSES[status];
  return (
    <span className="badge" style={{ background: s.color }}>
      {s.label}
    </span>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Carregando" />;
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {hint && <div className="small mt">{hint}</div>}
    </div>
  );
}
