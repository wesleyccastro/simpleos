# SimpleOS — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web mobile-first e multi-tenant para oficinas criarem, imprimirem (PDF) e enviarem orçamentos por WhatsApp, com catálogo de produtos/serviços, numeração por empresa, formas de pagamento e histórico com status.

**Architecture:** SPA React+Vite+TypeScript falando direto com Supabase (Auth, Postgres com RLS por tenant, Storage para logos). PDF gerado no cliente com pdfmake. Link público por `share_token` via função `security definer`. Spec: `docs/superpowers/specs/2026-07-16-simpleos-orcamentos-design.md`.

**Tech Stack:** React 18, Vite 5, TypeScript 5, react-router-dom 6, @supabase/supabase-js 2, pdfmake 0.2, Vitest 2.

## Global Constraints

- Todo texto de UI em **pt-BR**, simples e direto (usuários leigos).
- Mobile-first: barra de navegação inferior fixa, botões grandes, uma ação principal por tela.
- Dinheiro: **centavos como inteiros** em todo o código do cliente (`*Cents`); no banco `numeric(12,2)` em reais. Conversão SÓ em `src/lib/db.ts` (`toCents`/`fromCents`).
- Todo acesso ao Supabase passa por `src/lib/db.ts` (exceto auth em `src/lib/auth.tsx`). Componentes nunca importam `supabaseClient` diretamente.
- Banco em snake_case; TypeScript em camelCase. Mapeamento só em `db.ts`.
- Status válidos: `pendente | aprovado | em_andamento | concluido | recusado`.
- `discountCents` com sinal: positivo = desconto, negativo = acréscimo.
- Node >= 20. Testes com Vitest (`npm test` = `vitest run`).
- Commits frequentes, mensagens em português no padrão `feat:|fix:|test:|docs:|chore:`.

## Pré-requisito manual (usuário)

Antes das Tasks 2 e 9 funcionarem de ponta a ponta, o usuário precisa:
1. Criar um projeto gratuito em https://supabase.com (região São Paulo).
2. Em **Authentication → Sign In / Up → Email**, desativar "Confirm email" (v1 sem confirmação de e-mail).
3. Copiar `Project URL` e `anon public key` (Settings → API) para o arquivo `.env` (Task 1 cria o `.env.example`).
4. Rodar o SQL da Task 2 no **SQL Editor** do painel do Supabase.

Se as chaves ainda não existirem no momento da execução, as tasks de código seguem normalmente (testes unitários não dependem do Supabase); apenas a verificação manual de ponta a ponta fica pendente.

---

### Task 1: Scaffold do projeto (Vite + React + TS + Vitest + estilos)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.env.example`
- Create: `src/main.tsx`, `src/App.tsx` (provisório, substituído na Task 9), `src/styles.css`

**Interfaces:**
- Produces: projeto que roda `npm run dev`, `npm run build` e `npm test`; classes CSS globais usadas por todas as telas (`.card`, `.btn`, `.field`, `.bottom-nav`, `.badge`, `.chip`, `.list-row`, `.total-bar`, `.steps`, `.toast`, `.qty`, `.center-page`, `.empty`, `.spinner`, `.row`, `.muted`, `.small`, `.mt`).

- [ ] **Step 1: Criar arquivos de configuração**

`package.json`:

```json
{
  "name": "simpleos",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "pdfmake": "^0.2.10",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/pdfmake": "^0.2.9",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

`index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1e3a5f" />
    <title>SimpleOS — Orçamentos</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules
dist
.env
*.local
```

`.env.example`:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

- [ ] **Step 2: Criar `src/styles.css`** (design system completo do app)

```css
:root {
  --primary: #1e3a5f;
  --accent: #e8590c;
  --bg: #f4f6f8;
  --card: #ffffff;
  --text: #1c2733;
  --muted: #64748b;
  --border: #e2e8f0;
  --danger: #b91c1c;
  --success: #15803d;
  --radius: 12px;
  --nav-h: 60px;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); }
#root { min-height: 100dvh; }
.app { min-height: 100dvh; display: flex; flex-direction: column; }
.app-main { flex: 1; padding: 16px 16px calc(var(--nav-h) + 24px); max-width: 640px; width: 100%; margin: 0 auto; }
h1 { font-size: 1.35rem; margin: 8px 0 16px; }
h2 { font-size: 1.05rem; margin: 20px 0 8px; }

.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 12px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: var(--radius); padding: 14px 18px; font-size: 1rem; font-weight: 600; cursor: pointer; background: var(--primary); color: #fff; width: 100%; }
.btn:disabled { opacity: 0.6; }
.btn.secondary { background: #fff; color: var(--primary); border: 1.5px solid var(--primary); }
.btn.accent { background: var(--accent); }
.btn.ghost { background: transparent; color: var(--muted); width: auto; padding: 8px 10px; font-weight: 500; }
.btn.small { width: auto; padding: 8px 14px; font-size: 0.9rem; }
.btn.danger { background: #fff; color: var(--danger); border: 1.5px solid var(--danger); }

.field { display: block; margin-bottom: 14px; }
.field > span { display: block; font-size: 0.85rem; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
input, select, textarea { width: 100%; padding: 12px; font-size: 1rem; border: 1.5px solid var(--border); border-radius: 10px; background: #fff; color: var(--text); font-family: inherit; }
input:focus, select:focus, textarea:focus { outline: 2px solid var(--primary); border-color: transparent; }
input[type='color'] { padding: 4px; height: 48px; }
input[type='checkbox'] { width: auto; accent-color: var(--primary); }
label.check { display: flex; align-items: center; gap: 10px; padding: 10px 0; font-size: 1rem; }

.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; height: calc(var(--nav-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: #fff; border-top: 1px solid var(--border); display: flex; z-index: 20; }
.bottom-nav a { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 0.7rem; color: var(--muted); text-decoration: none; font-weight: 600; }
.bottom-nav a.active { color: var(--primary); }
.bottom-nav svg { width: 22px; height: 22px; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; color: #fff; white-space: nowrap; }

.chips { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 8px; }
.chip { flex-shrink: 0; border: 1.5px solid var(--border); background: #fff; border-radius: 999px; padding: 7px 14px; font-size: 0.85rem; font-weight: 600; color: var(--muted); cursor: pointer; }
.chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }

.list-row { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; margin-bottom: 10px; cursor: pointer; }
.list-row .grow { flex: 1; min-width: 0; }
.list-row .title { font-weight: 700; }
.list-row .sub { font-size: 0.82rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-row .money { font-weight: 700; white-space: nowrap; }

.total-bar { position: fixed; bottom: calc(var(--nav-h) + env(safe-area-inset-bottom)); left: 0; right: 0; background: var(--primary); color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; font-weight: 700; z-index: 15; }

.steps { display: flex; gap: 6px; margin-bottom: 16px; }
.steps span { flex: 1; height: 4px; border-radius: 2px; background: var(--border); }
.steps span.done { background: var(--accent); }

.row { display: flex; gap: 10px; }
.row > * { flex: 1; }

.qty { display: flex; align-items: center; gap: 4px; }
.qty button { width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid var(--border); background: #fff; font-size: 1.1rem; font-weight: 700; cursor: pointer; }
.qty input { width: 52px; text-align: center; padding: 6px; }

.toast-wrap { position: fixed; top: 12px; left: 12px; right: 12px; z-index: 100; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.toast { background: var(--text); color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 0.9rem; box-shadow: 0 4px 14px rgba(0,0,0,0.25); max-width: 480px; }
.toast.error { background: var(--danger); }
.toast.success { background: var(--success); }

.empty { text-align: center; color: var(--muted); padding: 40px 16px; }
.empty .big { font-size: 2.4rem; margin-bottom: 8px; }

.center-page { min-height: 100dvh; display: flex; flex-direction: column; justify-content: center; padding: 24px; max-width: 420px; margin: 0 auto; }
.brand { text-align: center; margin-bottom: 24px; }
.brand .logo { font-size: 2rem; font-weight: 800; color: var(--primary); }
.brand .tagline { color: var(--muted); font-size: 0.9rem; }

.muted { color: var(--muted); }
.small { font-size: 0.85rem; }
.mt { margin-top: 16px; }
.spinner { margin: 40px auto; width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (min-width: 640px) { .app-main { padding-top: 24px; } }
```

- [ ] **Step 3: Criar entrada provisória**

`src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx` (provisório — substituído por completo na Task 9):

```tsx
export default function App() {
  return (
    <div className="center-page">
      <div className="brand">
        <div className="logo">SimpleOS</div>
        <div className="tagline">Orçamentos para oficinas</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Instalar e verificar**

Run: `npm install`
Expected: instala sem erros (warnings de peer deps são aceitáveis).

Run: `npm run build`
Expected: `tsc` sem erros e `vite build` gera `dist/`.

Run: `npx vitest run --passWithNoTests`
Expected: exit 0 com `No test files found` (ainda não há testes; eles chegam na Task 3 — a partir dela use `npm test` normalmente).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest com design system"
```

---

### Task 2: Banco de dados Supabase (schema, RLS, funções, storage)

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tabelas `companies`, `catalog_items`, `quotes`, `quote_items`; funções `take_quote_number(p_company_id uuid) returns int` e `get_public_quote(p_token uuid) returns jsonb`; bucket público `logos`. A Task 7 consome exatamente esses nomes via supabase-js.

- [ ] **Step 1: Criar `supabase/migrations/0001_init.sql`**

```sql
-- SimpleOS: schema inicial (multi-tenant por company, RLS por dono)

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  address text,
  logo_url text,
  print_primary_color text not null default '#1e3a5f',
  print_accent_color text not null default '#e8590c',
  payment_methods text[] not null default '{pix,dinheiro,credito,debito}',
  quote_validity_days int not null default 15,
  next_quote_number int not null default 1,
  created_at timestamptz not null default now()
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('produto', 'servico')),
  description text not null,
  default_price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index catalog_items_company_idx on public.catalog_items (company_id, active);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  number int not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'em_andamento', 'concluido', 'recusado')),
  customer_name text not null,
  customer_phone text,
  vehicle_model text,
  vehicle_plate text,
  vehicle_km int,
  discount numeric(12,2) not null default 0,
  payment_terms jsonb not null default '{"methods": [], "installments": 1, "notes": ""}',
  notes text,
  total numeric(12,2) not null default 0,
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, number)
);
create index quotes_company_created_idx on public.quotes (company_id, created_at desc);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  position int not null default 0
);
create index quote_items_quote_idx on public.quote_items (quote_id);

-- updated_at automático em quotes
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- RLS: cada dono só enxerga a própria empresa e seus dados
alter table public.companies enable row level security;
alter table public.catalog_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

create or replace function public.my_company_id()
returns uuid language sql stable as $$
  select id from public.companies where owner_id = auth.uid()
$$;

create policy "dono gerencia empresa" on public.companies
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "dono gerencia catalogo" on public.catalog_items
  for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());

create policy "dono gerencia orcamentos" on public.quotes
  for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());

create policy "dono gerencia itens" on public.quote_items
  for all using (company_id = public.my_company_id()) with check (company_id = public.my_company_id());

-- Numeração sequencial por empresa (atômica; RLS garante que só o dono numere a própria empresa)
create or replace function public.take_quote_number(p_company_id uuid)
returns int language sql volatile as $$
  update public.companies
     set next_quote_number = next_quote_number + 1
   where id = p_company_id
  returning next_quote_number - 1;
$$;

-- Orçamento público por share_token (única porta anônima; não expõe as tabelas)
create or replace function public.get_public_quote(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'quote', to_jsonb(q) - 'company_id',
    'items', (
      select coalesce(jsonb_agg(to_jsonb(i) order by i.position), '[]'::jsonb)
      from public.quote_items i where i.quote_id = q.id
    ),
    'company', jsonb_build_object(
      'name', c.name,
      'document', c.document,
      'phone', c.phone,
      'address', c.address,
      'logo_url', c.logo_url,
      'print_primary_color', c.print_primary_color,
      'print_accent_color', c.print_accent_color,
      'quote_validity_days', c.quote_validity_days
    )
  )
  from public.quotes q
  join public.companies c on c.id = q.company_id
  where q.share_token = p_token;
$$;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;

-- Storage: bucket público de logos; escrita restrita à pasta da própria empresa
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos leitura publica" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos escrita do dono" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.my_company_id()::text);

create policy "logos update do dono" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.my_company_id()::text);

create policy "logos delete do dono" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.my_company_id()::text);
```

- [ ] **Step 2: Aplicar no Supabase**

Abrir o painel do Supabase → SQL Editor → colar o conteúdo do arquivo → Run.
Expected: `Success. No rows returned`.
Se o projeto Supabase ainda não existir, marcar este step como pendente-manual e seguir (os testes unitários não dependem dele).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: schema Supabase com RLS, numeracao e link publico"
```

---

### Task 3: Módulo de dinheiro (`money.ts`) — TDD

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Produces: `toCents(reais: number): number`, `fromCents(cents: number): number`, `formatBRL(cents: number): string`, `lineSubtotal(item: {quantity: number; unitPriceCents: number}): number`, `calcSubtotal(items: {quantity: number; unitPriceCents: number}[]): number`, `calcTotal(subtotalCents: number, discountCents: number): number`, `installments(totalCents: number, count: number): number[]`.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calcSubtotal, calcTotal, formatBRL, fromCents, installments, lineSubtotal, toCents } from './money';

// Intl usa espaço não separável (U+00A0) entre R$ e o valor
const noNbsp = (s: string) => s.replace(/\u00a0/g, ' ');

describe('toCents/fromCents', () => {
  it('converte reais para centavos com arredondamento', () => {
    expect(toCents(19.9)).toBe(1990);
    expect(toCents(0.1 + 0.2)).toBe(30); // sem erro de ponto flutuante
    expect(fromCents(1990)).toBe(19.9);
  });
});

describe('formatBRL', () => {
  it('formata em pt-BR', () => {
    expect(noNbsp(formatBRL(1000))).toBe('R$ 10,00');
    expect(noNbsp(formatBRL(199050))).toBe('R$ 1.990,50');
    expect(noNbsp(formatBRL(0))).toBe('R$ 0,00');
  });
});

describe('subtotais e total', () => {
  it('calcula subtotal de linha com quantidade fracionada', () => {
    expect(lineSubtotal({ quantity: 1.5, unitPriceCents: 1990 })).toBe(2985);
  });
  it('soma os itens', () => {
    expect(
      calcSubtotal([
        { quantity: 2, unitPriceCents: 5000 },
        { quantity: 1, unitPriceCents: 2550 },
      ]),
    ).toBe(12550);
  });
  it('aplica desconto (positivo) e acréscimo (negativo)', () => {
    expect(calcTotal(10000, 1000)).toBe(9000);
    expect(calcTotal(10000, -500)).toBe(10500);
  });
});

describe('installments', () => {
  it('divide igualmente quando exato', () => {
    expect(installments(9000, 3)).toEqual([3000, 3000, 3000]);
  });
  it('ajusta os centavos na última parcela', () => {
    expect(installments(10000, 3)).toEqual([3333, 3333, 3334]);
    expect(installments(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000);
  });
  it('1 parcela devolve o total', () => {
    expect(installments(10000, 1)).toEqual([10000]);
  });
  it('rejeita contagem inválida', () => {
    expect(() => installments(10000, 0)).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/money.test.ts`
Expected: FAIL — `Cannot find module './money'` (ou equivalente).

- [ ] **Step 3: Implementar `src/lib/money.ts`**

```ts
export interface MoneyLine {
  quantity: number;
  unitPriceCents: number;
}

export function toCents(reais: number): number {
  return Math.round(reais * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function lineSubtotal(item: MoneyLine): number {
  return Math.round(item.quantity * item.unitPriceCents);
}

export function calcSubtotal(items: MoneyLine[]): number {
  return items.reduce((sum, item) => sum + lineSubtotal(item), 0);
}

export function calcTotal(subtotalCents: number, discountCents: number): number {
  return subtotalCents - discountCents;
}

export function installments(totalCents: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('Número de parcelas deve ser >= 1');
  const base = Math.floor(totalCents / count);
  const parts = new Array<number>(count).fill(base);
  parts[count - 1] = totalCents - base * (count - 1);
  return parts;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/money.test.ts`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: modulo de dinheiro em centavos com parcelas e formatacao pt-BR"
```

---

### Task 4: Mensagem e URL de WhatsApp (`whatsapp.ts`) — TDD

**Files:**
- Create: `src/lib/whatsapp.ts`
- Test: `src/lib/whatsapp.test.ts`

**Interfaces:**
- Consumes: `formatBRL` de `./money` (Task 3).
- Produces: `normalizePhone(raw: string): string | null`, `buildQuoteMessage(p: {companyName: string; number: number; totalCents: number; publicUrl: string; customerName: string}): string`, `buildWaMeUrl(phone: string | null | undefined, message: string): string`.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/whatsapp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildQuoteMessage, buildWaMeUrl, normalizePhone } from './whatsapp';

describe('normalizePhone', () => {
  it('remove máscara e adiciona DDI 55', () => {
    expect(normalizePhone('(11) 98888-7777')).toBe('5511988887777');
    expect(normalizePhone('11 3333-4444')).toBe('551133334444');
  });
  it('mantém DDI 55 já presente', () => {
    expect(normalizePhone('+55 11 98888-7777')).toBe('5511988887777');
  });
  it('rejeita número curto', () => {
    expect(normalizePhone('9999')).toBeNull();
  });
});

describe('buildQuoteMessage', () => {
  it('inclui cliente, número, total e link', () => {
    const msg = buildQuoteMessage({
      companyName: 'Oficina do Zé',
      number: 42,
      totalCents: 150000,
      publicUrl: 'https://app.exemplo.com/o/abc',
      customerName: 'Maria',
    });
    expect(msg).toContain('Maria');
    expect(msg).toContain('nº 42');
    expect(msg).toContain('Oficina do Zé');
    expect(msg.replace(/\u00a0/g, ' ')).toContain('R$ 1.500,00');
    expect(msg).toContain('https://app.exemplo.com/o/abc');
  });
});

describe('buildWaMeUrl', () => {
  it('monta URL com telefone normalizado e texto codificado', () => {
    const url = buildWaMeUrl('(11) 98888-7777', 'Olá, orçamento');
    expect(url).toBe(`https://wa.me/5511988887777?text=${encodeURIComponent('Olá, orçamento')}`);
  });
  it('sem telefone abre seletor de contato', () => {
    expect(buildWaMeUrl(null, 'oi')).toBe('https://wa.me/?text=oi');
    expect(buildWaMeUrl('123', 'oi')).toBe('https://wa.me/?text=oi');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/whatsapp.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `src/lib/whatsapp.ts`**

```ts
import { formatBRL } from './money';

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return null;
}

export function buildQuoteMessage(p: {
  companyName: string;
  number: number;
  totalCents: number;
  publicUrl: string;
  customerName: string;
}): string {
  return [
    `Olá, ${p.customerName}!`,
    `Segue o orçamento nº ${p.number} da ${p.companyName}.`,
    `Total: ${formatBRL(p.totalCents)}`,
    `Veja os detalhes e baixe o PDF aqui: ${p.publicUrl}`,
  ].join('\n');
}

export function buildWaMeUrl(phone: string | null | undefined, message: string): string {
  const text = encodeURIComponent(message);
  const normalized = phone ? normalizePhone(phone) : null;
  return normalized ? `https://wa.me/${normalized}?text=${text}` : `https://wa.me/?text=${text}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/whatsapp.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp.ts src/lib/whatsapp.test.ts
git commit -m "feat: mensagem e link wa.me do orcamento"
```

---

### Task 5: Tipos de domínio e constantes

**Files:**
- Create: `src/lib/types.ts`, `src/lib/constants.ts`

**Interfaces:**
- Produces (consumido por TODAS as tasks seguintes):
  - `types.ts`: `QuoteStatus`, `Company`, `PublicCompany`, `CatalogItem`, `PaymentTerms`, `QuoteItem`, `Quote`, `toPublicCompany(c: Company): PublicCompany`.
  - `constants.ts`: `STATUSES: Record<QuoteStatus, {label: string; color: string}>`, `STATUS_ORDER: QuoteStatus[]`, `PAYMENT_METHOD_LABELS: Record<string, string>`.

- [ ] **Step 1: Criar `src/lib/types.ts`**

```ts
export type QuoteStatus = 'pendente' | 'aprovado' | 'em_andamento' | 'concluido' | 'recusado';

export interface Company {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  printPrimaryColor: string;
  printAccentColor: string;
  paymentMethods: string[];
  quoteValidityDays: number;
}

export type PublicCompany = Pick<
  Company,
  'name' | 'document' | 'phone' | 'address' | 'logoUrl' | 'printPrimaryColor' | 'printAccentColor' | 'quoteValidityDays'
>;

export function toPublicCompany(c: Company): PublicCompany {
  return {
    name: c.name,
    document: c.document,
    phone: c.phone,
    address: c.address,
    logoUrl: c.logoUrl,
    printPrimaryColor: c.printPrimaryColor,
    printAccentColor: c.printAccentColor,
    quoteValidityDays: c.quoteValidityDays,
  };
}

export interface CatalogItem {
  id: string;
  kind: 'produto' | 'servico';
  description: string;
  defaultPriceCents: number;
  active: boolean;
}

export interface PaymentTerms {
  methods: string[];
  installments: number;
  notes: string;
}

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Quote {
  id: string;
  number: number;
  status: QuoteStatus;
  customerName: string;
  customerPhone: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  vehicleKm: number | null;
  discountCents: number;
  paymentTerms: PaymentTerms;
  notes: string | null;
  totalCents: number;
  shareToken: string;
  createdAt: string;
  items: QuoteItem[];
}
```

- [ ] **Step 2: Criar `src/lib/constants.ts`**

```ts
import type { QuoteStatus } from './types';

export const STATUSES: Record<QuoteStatus, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: '#b45309' },
  aprovado: { label: 'Aprovado', color: '#15803d' },
  em_andamento: { label: 'Em andamento', color: '#1d4ed8' },
  concluido: { label: 'Concluído', color: '#475569' },
  recusado: { label: 'Recusado', color: '#b91c1c' },
};

export const STATUS_ORDER: QuoteStatus[] = ['pendente', 'aprovado', 'em_andamento', 'concluido', 'recusado'];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  credito: 'Cartão de crédito',
  debito: 'Cartão de débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
};
```

- [ ] **Step 3: Verificar tipos e commit**

Run: `npx tsc --noEmit`
Expected: sem erros.

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: tipos de dominio e constantes de status/pagamento"
```

---

### Task 6: Definição do PDF (`pdf.ts` + `pdfActions.ts`) — TDD na parte pura

**Files:**
- Create: `src/lib/pdf.ts` (função pura, testável), `src/lib/pdfActions.ts` (efeitos: abrir/baixar/blob/logo)
- Test: `src/lib/pdf.test.ts`

**Interfaces:**
- Consumes: `Quote`, `PublicCompany` (Task 5); `calcSubtotal`, `formatBRL`, `installments` (Task 3); `PAYMENT_METHOD_LABELS` (Task 5).
- Produces:
  - `pdf.ts`: `interface QuotePdfData { quote: Quote; company: PublicCompany; logoDataUrl?: string }`, `buildQuoteDocDefinition(data: QuotePdfData): TDocumentDefinitions`.
  - `pdfActions.ts`: `fetchImageAsDataUrl(url: string): Promise<string | undefined>`, `openQuotePdf(data: QuotePdfData): void`, `downloadQuotePdf(data: QuotePdfData): void`, `quotePdfBlob(data: QuotePdfData): Promise<Blob>`, `canShareFiles(): boolean`, `shareQuotePdf(data: QuotePdfData): Promise<void>`.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/pdf.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildQuoteDocDefinition } from './pdf';
import type { PublicCompany, Quote } from './types';

const company: PublicCompany = {
  name: 'Oficina Teste',
  document: '12.345.678/0001-00',
  phone: '(11) 3333-4444',
  address: 'Rua A, 123',
  logoUrl: null,
  printPrimaryColor: '#123456',
  printAccentColor: '#654321',
  quoteValidityDays: 15,
};

const quote: Quote = {
  id: 'q1',
  number: 42,
  status: 'pendente',
  customerName: 'Maria Silva',
  customerPhone: '(11) 98888-7777',
  vehicleModel: 'Gol 1.6',
  vehiclePlate: 'ABC1D23',
  vehicleKm: 85000,
  discountCents: 1000,
  paymentTerms: { methods: ['pix', 'credito'], installments: 3, notes: '' },
  notes: 'Peças com garantia de 90 dias',
  totalCents: 149000,
  shareToken: 'tok',
  createdAt: '2026-07-16T12:00:00Z',
  items: [
    { description: 'Troca de óleo', quantity: 1, unitPriceCents: 15000 },
    { description: 'Pastilha de freio', quantity: 2, unitPriceCents: 67500 },
  ],
};

describe('buildQuoteDocDefinition', () => {
  const def = buildQuoteDocDefinition({ quote, company });
  const json = JSON.stringify(def);

  it('inclui empresa, número e cliente', () => {
    expect(json).toContain('Oficina Teste');
    expect(json).toContain('ORÇAMENTO Nº 42');
    expect(json).toContain('Maria Silva');
  });
  it('inclui itens e veículo', () => {
    expect(json).toContain('Troca de óleo');
    expect(json).toContain('Pastilha de freio');
    expect(json).toContain('ABC1D23');
  });
  it('usa as cores configuradas da empresa', () => {
    expect(json).toContain('#123456');
    expect(json).toContain('#654321');
  });
  it('mostra desconto, total e parcelas', () => {
    expect(json).toContain('Desconto');
    expect(json.replace(/\u00a0/g, ' ')).toContain('R$ 1.490,00');
    expect(json).toContain('3x de');
  });
  it('mostra validade e observações', () => {
    expect(json).toContain('válido por 15 dias');
    expect(json).toContain('Peças com garantia de 90 dias');
  });
  it('não inclui imagem quando não há logo', () => {
    expect(json).not.toContain('"image"');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/pdf.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `src/lib/pdf.ts`**

```ts
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PAYMENT_METHOD_LABELS } from './constants';
import { calcSubtotal, formatBRL, installments } from './money';
import type { PublicCompany, Quote } from './types';

export interface QuotePdfData {
  quote: Quote;
  company: PublicCompany;
  logoDataUrl?: string;
}

export function buildQuoteDocDefinition({ quote, company, logoDataUrl }: QuotePdfData): TDocumentDefinitions {
  const subtotalCents = calcSubtotal(quote.items);
  const primary = company.printPrimaryColor;
  const accent = company.printAccentColor;

  const headerColumns: Content[] = [];
  if (logoDataUrl) headerColumns.push({ image: logoDataUrl, fit: [64, 64], margin: [0, 0, 12, 0] });
  headerColumns.push({
    stack: [
      { text: company.name, fontSize: 16, bold: true, color: '#ffffff' },
      {
        text: [company.document, company.phone, company.address].filter(Boolean).join('  •  '),
        fontSize: 9,
        color: '#ffffff',
        margin: [0, 4, 0, 0],
      },
    ],
    margin: [0, 6, 0, 0],
  });

  const th = (text: string, alignment: 'left' | 'center' | 'right' = 'left'): Content => ({
    text,
    bold: true,
    fontSize: 9,
    color: '#ffffff',
    fillColor: primary,
    alignment,
  });

  const itemRows: Content[][] = quote.items.map((it) => [
    { text: it.description, fontSize: 10 },
    { text: String(it.quantity), alignment: 'center', fontSize: 10 },
    { text: formatBRL(it.unitPriceCents), alignment: 'right', fontSize: 10 },
    { text: formatBRL(Math.round(it.quantity * it.unitPriceCents)), alignment: 'right', fontSize: 10 },
  ]);

  const totalRows: Content[] = [];
  if (quote.discountCents !== 0) {
    totalRows.push({
      columns: [
        { text: 'Subtotal', alignment: 'right', fontSize: 10 },
        { text: formatBRL(subtotalCents), alignment: 'right', width: 110, fontSize: 10 },
      ],
    });
    totalRows.push({
      columns: [
        { text: quote.discountCents > 0 ? 'Desconto' : 'Acréscimo', alignment: 'right', fontSize: 10 },
        { text: formatBRL(Math.abs(quote.discountCents)), alignment: 'right', width: 110, fontSize: 10 },
      ],
      margin: [0, 2, 0, 0],
    });
  }
  totalRows.push({
    columns: [
      { text: 'TOTAL', alignment: 'right', bold: true, fontSize: 13, color: accent },
      { text: formatBRL(quote.totalCents), alignment: 'right', width: 110, bold: true, fontSize: 13, color: accent },
    ],
    margin: [0, 4, 0, 0],
  });

  const methods = quote.paymentTerms.methods.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ');
  const paymentLines: string[] = [];
  if (methods) paymentLines.push(`Formas de pagamento: ${methods}`);
  if (quote.paymentTerms.installments > 1) {
    const parts = installments(quote.totalCents, quote.paymentTerms.installments);
    const last = parts[parts.length - 1];
    const suffix = last !== parts[0] ? ` (última de ${formatBRL(last)})` : '';
    paymentLines.push(`Parcelamento: ${quote.paymentTerms.installments}x de ${formatBRL(parts[0])}${suffix}`);
  }
  if (quote.paymentTerms.notes) paymentLines.push(quote.paymentTerms.notes);

  const vehicle = [quote.vehicleModel, quote.vehiclePlate, quote.vehicleKm != null ? `${quote.vehicleKm} km` : null]
    .filter(Boolean)
    .join('  •  ');

  const sectionTitle = (text: string): Content => ({ text, fontSize: 11, bold: true, color: accent, margin: [0, 14, 0, 4] });

  const content: Content[] = [
    {
      table: {
        widths: ['*'],
        body: [[{ columns: headerColumns, fillColor: primary, margin: [12, 10, 12, 10] }]],
      },
      layout: 'noBorders',
    },
    {
      columns: [
        { text: `ORÇAMENTO Nº ${quote.number}`, fontSize: 14, bold: true, color: primary },
        { text: `Data: ${new Date(quote.createdAt).toLocaleDateString('pt-BR')}`, alignment: 'right', fontSize: 10 },
      ],
      margin: [0, 14, 0, 0],
    },
    sectionTitle('Cliente'),
    { text: quote.customerName, fontSize: 10 },
    ...(quote.customerPhone ? [{ text: `WhatsApp: ${quote.customerPhone}`, fontSize: 10 } as Content] : []),
    ...(vehicle ? [sectionTitle('Veículo'), { text: vehicle, fontSize: 10 } as Content] : []),
    sectionTitle('Itens'),
    {
      table: {
        headerRows: 1,
        widths: ['*', 40, 75, 85],
        body: [[th('Descrição'), th('Qtd', 'center'), th('Unitário', 'right'), th('Subtotal', 'right')], ...itemRows],
      },
      layout: 'lightHorizontalLines',
    },
    { stack: totalRows, margin: [0, 10, 0, 0] },
    ...(paymentLines.length ? [sectionTitle('Pagamento'), { text: paymentLines.join('\n'), fontSize: 10 } as Content] : []),
    ...(quote.notes ? [sectionTitle('Observações'), { text: quote.notes, fontSize: 10 } as Content] : []),
    {
      text: `Orçamento válido por ${company.quoteValidityDays} dias.`,
      fontSize: 9,
      italics: true,
      color: '#666666',
      margin: [0, 20, 0, 0],
    },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [32, 28, 32, 32],
    content,
    defaultStyle: { fontSize: 10 },
    info: { title: `Orçamento ${quote.number} - ${company.name}` },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/pdf.test.ts`
Expected: PASS (6 testes).
Nota: `formatBRL` usa espaço não separável (U+00A0); por isso os testes normalizam o texto antes de comparar.

- [ ] **Step 5: Implementar `src/lib/pdfActions.ts`** (sem teste unitário — efeitos de navegador)

```ts
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { buildQuoteDocDefinition, type QuotePdfData } from './pdf';

// Compatível com as duas formas de export do vfs_fonts (0.2.x)
const fonts = pdfFonts as unknown as { vfs?: Record<string, string>; pdfMake?: { vfs: Record<string, string> } };
pdfMake.vfs = fonts.vfs ?? fonts.pdfMake?.vfs ?? {};

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
```

- [ ] **Step 6: Verificar e commit**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm test`
Expected: PASS (todos os testes das Tasks 3, 4 e 6).

```bash
git add src/lib/pdf.ts src/lib/pdf.test.ts src/lib/pdfActions.ts
git commit -m "feat: geracao de PDF do orcamento com cores e logo da empresa"
```

---

### Task 7: Cliente Supabase e camada de dados (`db.ts`)

**Files:**
- Create: `src/lib/supabaseClient.ts`, `src/lib/db.ts`

**Interfaces:**
- Consumes: tipos da Task 5; `toCents`/`fromCents` da Task 3; schema/funções SQL da Task 2.
- Produces (assinaturas exatas usadas pelas telas):
  - `getMyCompany(): Promise<Company | null>`
  - `createCompany(name: string): Promise<Company>`
  - `updateCompany(id: string, patch: Partial<Company>): Promise<Company>`
  - `uploadLogo(companyId: string, file: File): Promise<string>` (retorna URL pública)
  - `listCatalog(companyId: string): Promise<CatalogItem[]>`
  - `saveCatalogItem(companyId: string, item: {id?: string; kind: 'produto' | 'servico'; description: string; defaultPriceCents: number}): Promise<void>`
  - `deactivateCatalogItem(id: string): Promise<void>`
  - `interface QuoteListRow {id; number; status; customerName; vehicleModel; vehiclePlate; totalCents; createdAt}`
  - `listQuotes(companyId: string): Promise<QuoteListRow[]>`
  - `getQuote(id: string): Promise<Quote>`
  - `interface QuotePayload {customerName; customerPhone; vehicleModel; vehiclePlate; vehicleKm; discountCents; paymentTerms; notes; totalCents; items: {description; quantity; unitPriceCents}[]}`
  - `createQuote(companyId: string, p: QuotePayload): Promise<Quote>`
  - `updateQuote(quoteId: string, companyId: string, p: QuotePayload): Promise<void>`
  - `setQuoteStatus(id: string, status: QuoteStatus): Promise<void>`
  - `duplicateQuote(companyId: string, sourceId: string): Promise<Quote>`
  - `interface PublicQuote {quote: Quote; company: PublicCompany}`
  - `getPublicQuote(token: string): Promise<PublicQuote | null>`

- [ ] **Step 1: Criar `src/lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
}

export const supabase = createClient(url, key);
```

- [ ] **Step 2: Criar `src/lib/db.ts`**

```ts
import { fromCents, toCents } from './money';
import { supabase } from './supabaseClient';
import type { CatalogItem, Company, PaymentTerms, PublicCompany, Quote, QuoteStatus } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToCompany(r: any): Company {
  return {
    id: r.id,
    name: r.name,
    document: r.document,
    phone: r.phone,
    address: r.address,
    logoUrl: r.logo_url,
    printPrimaryColor: r.print_primary_color,
    printAccentColor: r.print_accent_color,
    paymentMethods: r.payment_methods ?? [],
    quoteValidityDays: r.quote_validity_days,
  };
}

export async function getMyCompany(): Promise<Company | null> {
  const { data, error } = await supabase.from('companies').select('*').maybeSingle();
  if (error) throw error;
  return data ? rowToCompany(data) : null;
}

export async function createCompany(name: string): Promise<Company> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('Sem sessão');
  const { data, error } = await supabase
    .from('companies')
    .insert({ name, owner_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return rowToCompany(data);
}

export async function updateCompany(id: string, patch: Partial<Company>): Promise<Company> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.document !== undefined) row.document = patch.document;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  if (patch.printPrimaryColor !== undefined) row.print_primary_color = patch.printPrimaryColor;
  if (patch.printAccentColor !== undefined) row.print_accent_color = patch.printAccentColor;
  if (patch.paymentMethods !== undefined) row.payment_methods = patch.paymentMethods;
  if (patch.quoteValidityDays !== undefined) row.quote_validity_days = patch.quoteValidityDays;
  const { data, error } = await supabase.from('companies').update(row).eq('id', id).select().single();
  if (error) throw error;
  return rowToCompany(data);
}

export async function uploadLogo(companyId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${companyId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
}

function rowToCatalogItem(r: any): CatalogItem {
  return {
    id: r.id,
    kind: r.kind,
    description: r.description,
    defaultPriceCents: toCents(Number(r.default_price)),
    active: r.active,
  };
}

export async function listCatalog(companyId: string): Promise<CatalogItem[]> {
  const { data, error } = await supabase
    .from('catalog_items')
    .select('*')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('description');
  if (error) throw error;
  return (data ?? []).map(rowToCatalogItem);
}

export async function saveCatalogItem(
  companyId: string,
  item: { id?: string; kind: 'produto' | 'servico'; description: string; defaultPriceCents: number },
): Promise<void> {
  const row = {
    company_id: companyId,
    kind: item.kind,
    description: item.description,
    default_price: fromCents(item.defaultPriceCents),
  };
  const query = item.id
    ? supabase.from('catalog_items').update(row).eq('id', item.id)
    : supabase.from('catalog_items').insert(row);
  const { error } = await query;
  if (error) throw error;
}

export async function deactivateCatalogItem(id: string): Promise<void> {
  const { error } = await supabase.from('catalog_items').update({ active: false }).eq('id', id);
  if (error) throw error;
}

function rowToQuote(r: any, itemRows: any[] = []): Quote {
  return {
    id: r.id,
    number: r.number,
    status: r.status,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    vehicleModel: r.vehicle_model,
    vehiclePlate: r.vehicle_plate,
    vehicleKm: r.vehicle_km,
    discountCents: toCents(Number(r.discount)),
    paymentTerms: (r.payment_terms as PaymentTerms) ?? { methods: [], installments: 1, notes: '' },
    notes: r.notes,
    totalCents: toCents(Number(r.total)),
    shareToken: r.share_token,
    createdAt: r.created_at,
    items: [...itemRows]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: toCents(Number(i.unit_price)),
      })),
  };
}

export interface QuoteListRow {
  id: string;
  number: number;
  status: QuoteStatus;
  customerName: string;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  totalCents: number;
  createdAt: string;
}

export async function listQuotes(companyId: string): Promise<QuoteListRow[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('id, number, status, customer_name, vehicle_model, vehicle_plate, total, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    customerName: r.customer_name,
    vehicleModel: r.vehicle_model,
    vehiclePlate: r.vehicle_plate,
    totalCents: toCents(Number(r.total)),
    createdAt: r.created_at,
  }));
}

export async function getQuote(id: string): Promise<Quote> {
  const { data, error } = await supabase.from('quotes').select('*, quote_items(*)').eq('id', id).single();
  if (error) throw error;
  return rowToQuote(data, data.quote_items ?? []);
}

export interface QuotePayload {
  customerName: string;
  customerPhone: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
  vehicleKm: number | null;
  discountCents: number;
  paymentTerms: PaymentTerms;
  notes: string | null;
  totalCents: number;
  items: { description: string; quantity: number; unitPriceCents: number }[];
}

function payloadToQuoteRow(p: QuotePayload): Record<string, unknown> {
  return {
    customer_name: p.customerName,
    customer_phone: p.customerPhone,
    vehicle_model: p.vehicleModel,
    vehicle_plate: p.vehiclePlate,
    vehicle_km: p.vehicleKm,
    discount: fromCents(p.discountCents),
    payment_terms: p.paymentTerms,
    notes: p.notes,
    total: fromCents(p.totalCents),
  };
}

function payloadToItemRows(quoteId: string, companyId: string, p: QuotePayload) {
  return p.items.map((it, i) => ({
    quote_id: quoteId,
    company_id: companyId,
    description: it.description,
    quantity: it.quantity,
    unit_price: fromCents(it.unitPriceCents),
    position: i,
  }));
}

export async function createQuote(companyId: string, p: QuotePayload): Promise<Quote> {
  const { data: num, error: numErr } = await supabase.rpc('take_quote_number', { p_company_id: companyId });
  if (numErr) throw numErr;
  const { data: quoteRow, error } = await supabase
    .from('quotes')
    .insert({ ...payloadToQuoteRow(p), company_id: companyId, number: num })
    .select()
    .single();
  if (error) throw error;
  const itemRows = payloadToItemRows(quoteRow.id, companyId, p);
  const { error: itemsErr } = await supabase.from('quote_items').insert(itemRows);
  if (itemsErr) {
    await supabase.from('quotes').delete().eq('id', quoteRow.id);
    throw itemsErr;
  }
  return rowToQuote(quoteRow, itemRows);
}

export async function updateQuote(quoteId: string, companyId: string, p: QuotePayload): Promise<void> {
  const { error } = await supabase.from('quotes').update(payloadToQuoteRow(p)).eq('id', quoteId);
  if (error) throw error;
  const { error: delErr } = await supabase.from('quote_items').delete().eq('quote_id', quoteId);
  if (delErr) throw delErr;
  const { error: insErr } = await supabase.from('quote_items').insert(payloadToItemRows(quoteId, companyId, p));
  if (insErr) throw insErr;
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function duplicateQuote(companyId: string, sourceId: string): Promise<Quote> {
  const src = await getQuote(sourceId);
  return createQuote(companyId, {
    customerName: src.customerName,
    customerPhone: src.customerPhone,
    vehicleModel: src.vehicleModel,
    vehiclePlate: src.vehiclePlate,
    vehicleKm: src.vehicleKm,
    discountCents: src.discountCents,
    paymentTerms: src.paymentTerms,
    notes: src.notes,
    totalCents: src.totalCents,
    items: src.items.map(({ description, quantity, unitPriceCents }) => ({ description, quantity, unitPriceCents })),
  });
}

export interface PublicQuote {
  quote: Quote;
  company: PublicCompany;
}

export async function getPublicQuote(token: string): Promise<PublicQuote | null> {
  const { data, error } = await supabase.rpc('get_public_quote', { p_token: token });
  if (error) throw error;
  if (!data) return null;
  const c = data.company;
  return {
    quote: rowToQuote(data.quote, data.items ?? []),
    company: {
      name: c.name,
      document: c.document,
      phone: c.phone,
      address: c.address,
      logoUrl: c.logo_url,
      printPrimaryColor: c.print_primary_color,
      printAccentColor: c.print_accent_color,
      quoteValidityDays: c.quote_validity_days,
    },
  };
}
```

- [ ] **Step 3: Verificar e commit**

Run: `npx tsc --noEmit`
Expected: sem erros.

```bash
git add src/lib/supabaseClient.ts src/lib/db.ts
git commit -m "feat: camada de dados Supabase com mapeamento camelCase/centavos"
```

---

### Task 8: Componentes de UI e toasts

**Files:**
- Create: `src/components/ui.tsx`, `src/components/toast.tsx`

**Interfaces:**
- Consumes: `formatBRL` (Task 3), `STATUSES` (Task 5), classes CSS da Task 1.
- Produces:
  - `ui.tsx`: `Field({label, children})`, `MoneyInput({valueCents, onChange, id?})`, `StatusBadge({status})`, `Spinner()`, `EmptyState({icon, title, hint?})`.
  - `toast.tsx`: `ToastProvider({children})`, `useToast(): {success(msg: string): void; error(msg: string): void}`.

- [ ] **Step 1: Criar `src/components/ui.tsx`**

```tsx
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
```

- [ ] **Step 2: Criar `src/components/toast.tsx`**

```tsx
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => {}, error: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: 'success' | 'error', message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const api = useRef<ToastApi>({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
  });

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
```

Nota: `api.current` captura `push` do primeiro render; como `push` é estável (useCallback sem deps), isso é correto.

- [ ] **Step 3: Verificar e commit**

Run: `npx tsc --noEmit`
Expected: sem erros.

```bash
git add src/components/ui.tsx src/components/toast.tsx
git commit -m "feat: componentes de UI (campos, dinheiro, badge, toasts)"
```

---

### Task 9: Autenticação, Login, Onboarding e Shell de navegação

**Files:**
- Create: `src/lib/auth.tsx`, `src/pages/Login.tsx`, `src/pages/Onboarding.tsx`, `src/components/Layout.tsx`
- Modify: `src/App.tsx` (substituir todo o conteúdo provisório da Task 1)
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 7), `getMyCompany`/`createCompany` (Task 7), `Field`/`Spinner` (Task 8), `ToastProvider`/`useToast` (Task 8).
- Produces: `AuthProvider`, `useAuth(): {session, company, loading, refreshCompany, signOut}`; todas as rotas do app já registradas: `/login`, `/o/:token` (pública), e protegidas `/`, `/novo`, `/orcamento/:id`, `/orcamento/:id/editar`, `/catalogo`, `/config`. As páginas das Tasks 10–15 entram aqui como versões mínimas ("Em construção") e cada task seguinte substitui o arquivo pelo definitivo, sem voltar a mexer no `App.tsx`. Ver Step 5.

- [ ] **Step 1: Criar `src/lib/auth.tsx`**

```tsx
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMyCompany } from './db';
import { supabase } from './supabaseClient';
import type { Company } from './types';

interface AuthState {
  session: Session | null;
  company: Company | null;
  loading: boolean;
  refreshCompany: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  company: null,
  loading: true,
  refreshCompany: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyReady, setCompanyReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setCompany(null);
      setCompanyReady(true);
      return;
    }
    let active = true;
    setCompanyReady(false);
    getMyCompany()
      .then((c) => {
        if (active) setCompany(c);
      })
      .catch(() => {
        if (active) setCompany(null);
      })
      .finally(() => {
        if (active) setCompanyReady(true);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const refreshCompany = async () => setCompany(await getMyCompany());
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, company, loading: !sessionReady || !companyReady, refreshCompany, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Criar `src/pages/Login.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/toast';
import { Field } from '../components/ui';
import { supabase } from '../lib/supabaseClient';

function friendlyAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('already registered')) return 'Este e-mail já tem cadastro. Use "Entrar".';
  if (message.includes('at least 6 characters')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return 'Não foi possível entrar. Verifique a conexão e tente novamente.';
}

export default function Login() {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const action =
      mode === 'entrar'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setBusy(false);
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    navigate('/');
  }

  return (
    <div className="center-page">
      <div className="brand">
        <div className="logo">SimpleOS</div>
        <div className="tagline">Orçamentos para oficinas, sem complicação</div>
      </div>
      <form className="card" onSubmit={submit}>
        <Field label="E-mail">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Senha">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
          />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          type="button"
          className="btn ghost mt"
          style={{ width: '100%' }}
          onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}
        >
          {mode === 'entrar' ? 'Não tem conta? Criar conta grátis' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Criar `src/pages/Onboarding.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useToast } from '../components/toast';
import { Field } from '../components/ui';
import { useAuth } from '../lib/auth';
import { createCompany } from '../lib/db';

export default function Onboarding() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { refreshCompany } = useAuth();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCompany(name.trim());
      await refreshCompany();
    } catch {
      toast.error('Não foi possível criar a oficina. Tente novamente.');
      setBusy(false);
    }
  }

  return (
    <div className="center-page">
      <div className="brand">
        <div className="logo">Bem-vindo! 👋</div>
        <div className="tagline">Só falta uma coisa: como se chama a sua oficina?</div>
      </div>
      <form className="card" onSubmit={submit}>
        <Field label="Nome da oficina">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex.: Oficina do Zé" />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? 'Criando…' : 'Começar a usar'}
        </button>
        <p className="small muted mt">Você poderá completar CNPJ, telefone, logo e cores em Ajustes.</p>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Criar `src/components/Layout.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom';

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5m0 0 9-5m-9 5v8" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />
    </svg>
  ),
};

export default function Layout() {
  return (
    <div className="app">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.home}
          Início
        </NavLink>
        <NavLink to="/novo" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.plus}
          Novo
        </NavLink>
        <NavLink to="/catalogo" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.box}
          Catálogo
        </NavLink>
        <NavLink to="/config" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.gear}
          Ajustes
        </NavLink>
      </nav>
    </div>
  );
}
```

- [ ] **Step 5: Substituir `src/App.tsx`**

As páginas das Tasks 10–15 já entram importadas aqui. Para que `npm run build` passe ao fim DESTA task, criar também os quatro arquivos de página como versões mínimas reais (cada task seguinte substitui o arquivo pelo definitivo — o conteúdo mínimo abaixo é funcional, não é placeholder de lógica):

`src/pages/Home.tsx`, `src/pages/QuoteWizard.tsx`, `src/pages/QuoteDetail.tsx`, `src/pages/Catalog.tsx`, `src/pages/Settings.tsx`, `src/pages/PublicQuote.tsx` — cada um, por enquanto:

```tsx
export default function Home() {
  return <h1>Em construção</h1>;
}
```

(ajustar o nome da função por arquivo: `QuoteWizard`, `QuoteDetail`, `Catalog`, `Settings`, `PublicQuote`).

`src/App.tsx`:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/toast';
import { Spinner } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import Catalog from './pages/Catalog';
import Home from './pages/Home';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import PublicQuote from './pages/PublicQuote';
import QuoteDetail from './pages/QuoteDetail';
import QuoteWizard from './pages/QuoteWizard';
import Settings from './pages/Settings';

function Protected() {
  const { session, company, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!company) return <Onboarding />;
  return <Layout />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/o/:token" element={<PublicQuote />} />
            <Route element={<Protected />}>
              <Route path="/" element={<Home />} />
              <Route path="/novo" element={<QuoteWizard />} />
              <Route path="/orcamento/:id" element={<QuoteDetail />} />
              <Route path="/orcamento/:id/editar" element={<QuoteWizard />} />
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/config" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
```

`src/main.tsx` permanece igual ao da Task 1 (já importa `App` e `styles.css`).

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run build`
Expected: build OK.

Verificação manual (requer `.env` configurado): `npm run dev`, abrir http://localhost:5173 →
- Sem sessão: redireciona para `/login`.
- Criar conta → cai no Onboarding → informar nome → cai na Home ("Em construção") com barra inferior.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: autenticacao, onboarding da oficina e shell de navegacao"
```

---

### Task 10: Tela Início (histórico com busca e filtro de status)

**Files:**
- Modify: `src/pages/Home.tsx` (substituir todo o conteúdo mínimo da Task 9)

**Interfaces:**
- Consumes: `useAuth` (Task 9), `listQuotes`/`QuoteListRow` (Task 7), `STATUSES`/`STATUS_ORDER` (Task 5), `formatBRL` (Task 3), `StatusBadge`/`Spinner`/`EmptyState` (Task 8), `useToast` (Task 8).

- [ ] **Step 1: Implementar `src/pages/Home.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/toast';
import { EmptyState, Spinner, StatusBadge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { STATUSES, STATUS_ORDER } from '../lib/constants';
import { listQuotes, type QuoteListRow } from '../lib/db';
import { formatBRL } from '../lib/money';
import type { QuoteStatus } from '../lib/types';

export default function Home() {
  const { company } = useAuth();
  const [rows, setRows] = useState<QuoteListRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QuoteStatus | 'todos'>('todos');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!company) return;
    listQuotes(company.id)
      .then(setRows)
      .catch(() => toast.error('Não foi possível carregar os orçamentos.'));
  }, [company, toast]);

  const counts = useMemo(() => {
    const c: Partial<Record<QuoteStatus, number>> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (filter !== 'todos' && r.status !== filter) return false;
      if (!term) return true;
      return (
        r.customerName.toLowerCase().includes(term) ||
        (r.vehiclePlate ?? '').toLowerCase().includes(term) ||
        (r.vehicleModel ?? '').toLowerCase().includes(term) ||
        String(r.number).includes(term)
      );
    });
  }, [rows, search, filter]);

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
```

- [ ] **Step 2: Verificar e commit**

Run: `npx tsc --noEmit` → sem erros. `npm run build` → OK.
Manual (com `.env`): Home mostra vazio com botão; após criar orçamentos (Task 13), busca e filtros funcionam.

```bash
git add src/pages/Home.tsx
git commit -m "feat: historico de orcamentos com busca e filtro por status"
```

---

### Task 11: Tela Catálogo (produtos/serviços)

**Files:**
- Modify: `src/pages/Catalog.tsx` (substituir conteúdo mínimo)

**Interfaces:**
- Consumes: `listCatalog`/`saveCatalogItem`/`deactivateCatalogItem` (Task 7), `CatalogItem` (Task 5), `Field`/`MoneyInput`/`Spinner`/`EmptyState` (Task 8), `formatBRL` (Task 3), `useAuth`, `useToast`.

- [ ] **Step 1: Implementar `src/pages/Catalog.tsx`**

```tsx
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
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function reload() {
    if (!company) return;
    try {
      setItems(await listCatalog(company.id));
    } catch {
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
```

- [ ] **Step 2: Verificar e commit**

Run: `npx tsc --noEmit` → sem erros. `npm run build` → OK.
Manual: criar, editar e excluir itens; busca filtra.

```bash
git add src/pages/Catalog.tsx
git commit -m "feat: catalogo de produtos e servicos"
```

---

### Task 12: Tela Ajustes (empresa, logo, cores, pagamento)

**Files:**
- Modify: `src/pages/Settings.tsx` (substituir conteúdo mínimo)

**Interfaces:**
- Consumes: `updateCompany`/`uploadLogo` (Task 7), `PAYMENT_METHOD_LABELS` (Task 5), `Field`/`Spinner` (Task 8), `useAuth` (com `refreshCompany` e `signOut`), `useToast`.

- [ ] **Step 1: Implementar `src/pages/Settings.tsx`**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../components/toast';
import { Field, Spinner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PAYMENT_METHOD_LABELS } from '../lib/constants';
import { updateCompany, uploadLogo } from '../lib/db';

export default function Settings() {
  const { company, refreshCompany, signOut } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [primary, setPrimary] = useState('#1e3a5f');
  const [accent, setAccent] = useState('#e8590c');
  const [methods, setMethods] = useState<string[]>([]);
  const [validityDays, setValidityDays] = useState(15);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setDocument(company.document ?? '');
    setPhone(company.phone ?? '');
    setAddress(company.address ?? '');
    setPrimary(company.printPrimaryColor);
    setAccent(company.printAccentColor);
    setMethods(company.paymentMethods);
    setValidityDays(company.quoteValidityDays);
    setLogoPreview(company.logoUrl);
  }, [company]);

  if (!company) return <Spinner />;

  function toggleMethod(m: string) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function pickLogo(file: File | null) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : company?.logoUrl ?? null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!company || !name.trim()) return;
    setBusy(true);
    try {
      let logoUrl = company.logoUrl;
      if (logoFile) logoUrl = await uploadLogo(company.id, logoFile);
      await updateCompany(company.id, {
        name: name.trim(),
        document: document.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        logoUrl,
        printPrimaryColor: primary,
        printAccentColor: accent,
        paymentMethods: methods,
        quoteValidityDays: validityDays,
      });
      await refreshCompany();
      setLogoFile(null);
      toast.success('Ajustes salvos.');
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1>Ajustes</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dados da oficina</h2>
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="CNPJ ou CPF (opcional)">
          <input value={document} onChange={(e) => setDocument(e.target.value)} />
        </Field>
        <Field label="Telefone (opcional)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </Field>
        <Field label="Endereço (opcional)">
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Impressão</h2>
        <Field label="Logomarca">
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
        </Field>
        <div className="row">
          <Field label="Cor principal">
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </Field>
          <Field label="Cor de destaque">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          </Field>
        </div>
        <span className="small muted">Prévia do cabeçalho do PDF:</span>
        <div style={{ background: primary, borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
          {logoPreview && (
            <img src={logoPreview} alt="Logo" style={{ height: 40, maxWidth: 80, objectFit: 'contain', background: '#fff', borderRadius: 4 }} />
          )}
          <div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{name || 'Sua oficina'}</div>
            <div style={{ color: accent, fontSize: 12, fontWeight: 700 }}>ORÇAMENTO Nº 123</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Pagamento</h2>
        <span className="small muted">Formas que sua oficina aceita:</span>
        {Object.entries(PAYMENT_METHOD_LABELS).map(([id, label]) => (
          <label key={id} className="check">
            <input type="checkbox" checked={methods.includes(id)} onChange={() => toggleMethod(id)} />
            {label}
          </label>
        ))}
        <Field label="Validade do orçamento (dias)">
          <input
            type="number"
            min={1}
            value={validityDays}
            onChange={(e) => setValidityDays(Math.max(1, parseInt(e.target.value || '15', 10)))}
          />
        </Field>
      </div>

      <button className="btn" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar alterações'}
      </button>
      <button type="button" className="btn danger mt" onClick={() => void signOut()}>
        Sair da conta
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Verificar e commit**

Run: `npx tsc --noEmit` → sem erros. `npm run build` → OK.
Manual: alterar nome/cores/logo → salvar → recarregar página → dados persistem; prévia reflete cores e logo na hora.

```bash
git add src/pages/Settings.tsx
git commit -m "feat: ajustes da oficina com logo, cores de impressao e pagamento"
```

---

### Task 13: Assistente de orçamento (novo e edição, em 4 passos)

**Files:**
- Modify: `src/pages/QuoteWizard.tsx` (substituir conteúdo mínimo)

**Interfaces:**
- Consumes: `createQuote`/`updateQuote`/`getQuote`/`listCatalog`/`QuotePayload` (Task 7), `calcSubtotal`/`calcTotal`/`formatBRL`/`installments` (Task 3), `PAYMENT_METHOD_LABELS` (Task 5), `Field`/`MoneyInput`/`Spinner` (Task 8), `useAuth`, `useToast`.
- Produces: ao salvar navega para `/orcamento/:id?novo=1` (a Task 14 usa o parâmetro `novo` para mostrar a tela de sucesso com as ações de PDF/WhatsApp).

- [ ] **Step 1: Implementar `src/pages/QuoteWizard.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar e commit**

Run: `npx tsc --noEmit` → sem erros. `npm run build` → OK. `npm test` → PASS.
Manual: criar orçamento completo pelos 4 passos (catálogo + texto livre, desconto, parcelas) → salva e navega para o detalhe com `?novo=1`; editar um existente mantém número e itens.

```bash
git add src/pages/QuoteWizard.tsx
git commit -m "feat: assistente de orcamento em 4 passos com catalogo e texto livre"
```

---

### Task 14: Detalhe do orçamento (sucesso, status, PDF, WhatsApp, duplicar)

**Files:**
- Modify: `src/pages/QuoteDetail.tsx` (substituir conteúdo mínimo)

**Interfaces:**
- Consumes: `getQuote`/`setQuoteStatus`/`duplicateQuote` (Task 7), `openQuotePdf`/`shareQuotePdf`/`canShareFiles`/`fetchImageAsDataUrl` (Task 6), `buildQuoteMessage`/`buildWaMeUrl` (Task 4), `toPublicCompany` (Task 5), `STATUSES`/`STATUS_ORDER`/`PAYMENT_METHOD_LABELS` (Task 5), `formatBRL`/`installments` (Task 3), `Spinner`/`StatusBadge` (Task 8), `useAuth`, `useToast`.
- Consumes da Task 13: query param `?novo=1` indica orçamento recém-criado (mostra banner de sucesso).

- [ ] **Step 1: Implementar `src/pages/QuoteDetail.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar e commit**

Run: `npx tsc --noEmit` → sem erros. `npm run build` → OK.
Manual: após gerar orçamento na Task 13 → banner de sucesso aparece; Ver PDF abre o documento com logo/cores; Enviar no WhatsApp abre wa.me com mensagem e link; trocar status atualiza a badge; Duplicar cria novo número.

```bash
git add src/pages/QuoteDetail.tsx
git commit -m "feat: detalhe do orcamento com status, PDF, WhatsApp e duplicar"
```

---

### Task 15: Página pública do orçamento (`/o/:token`)

**Files:**
- Modify: `src/pages/PublicQuote.tsx` (substituir conteúdo mínimo)

**Interfaces:**
- Consumes: `getPublicQuote`/`PublicQuote` (Task 7), `downloadQuotePdf`/`fetchImageAsDataUrl` (Task 6), `PAYMENT_METHOD_LABELS` (Task 5), `formatBRL`/`installments` (Task 3), `Spinner`/`EmptyState` (Task 8).
- Nota: esta rota fica FORA do shell protegido (sem barra inferior) e funciona sem login — é o link enviado por WhatsApp.

- [ ] **Step 1: Implementar `src/pages/PublicQuote.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState, Spinner } from '../components/ui';
import { PAYMENT_METHOD_LABELS } from '../lib/constants';
import { getPublicQuote, type PublicQuote as PublicQuoteData } from '../lib/db';
import { calcSubtotal, formatBRL, installments as splitInstallments } from '../lib/money';
import { downloadQuotePdf, fetchImageAsDataUrl } from '../lib/pdfActions';

export default function PublicQuote() {
  const { token } = useParams();
  const [data, setData] = useState<PublicQuoteData | null | 'erro'>(null);
  const [busy, setBusy] = useState(false);

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
  const parts = quote.paymentTerms.installments > 1 ? splitInstallments(quote.totalCents, quote.paymentTerms.installments) : null;

  async function baixarPdf() {
    setBusy(true);
    try {
      const logoDataUrl = company.logoUrl ? await fetchImageAsDataUrl(company.logoUrl) : undefined;
      downloadQuotePdf({ quote, company, logoDataUrl });
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
              {parts && ` · ${quote.paymentTerms.installments}x de ${formatBRL(parts[0])}`}
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
```

- [ ] **Step 2: Verificar e commit**

Run: `npx tsc --noEmit` → sem erros. `npm run build` → OK.
Manual: abrir o link `/o/<share_token>` numa janela anônima (sem login) → orçamento aparece com cores/logo da oficina e Baixar PDF funciona; token inválido mostra "Orçamento não encontrado".

```bash
git add src/pages/PublicQuote.tsx
git commit -m "feat: pagina publica do orcamento com download de PDF"
```

---

### Task 16: README e verificação final

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: tudo. Nenhum código novo além de documentação.

- [ ] **Step 1: Criar `README.md`**

```markdown
# SimpleOS — Orçamentos para Oficinas

App web mobile-first e multi-tenant para oficinas criarem orçamentos, gerarem PDF e enviarem por WhatsApp.

## Funcionalidades

- Login por e-mail/senha (1 usuário por oficina)
- Configuração da oficina: dados, logomarca, cores da impressão, formas de pagamento
- Catálogo de produtos e serviços
- Orçamento em 4 passos: cliente/veículo → itens (catálogo ou texto livre) → pagamento (formas, parcelas, desconto/acréscimo) → revisão
- Numeração sequencial por oficina
- Histórico com busca e status: Pendente, Aprovado, Em andamento, Concluído, Recusado
- PDF com logo e cores da oficina (pdfmake)
- Envio por WhatsApp: link público (`wa.me`) e compartilhamento nativo do PDF
- Link público do orçamento sem login (`/o/<token>`)

## Setup

1. Crie um projeto em https://supabase.com.
2. Em **Authentication → Sign In / Up → Email**, desative "Confirm email".
3. No **SQL Editor**, execute `supabase/migrations/0001_init.sql`.
4. Copie `.env.example` para `.env` e preencha com a URL e a anon key do projeto (Settings → API).
5. `npm install`
6. `npm run dev` → http://localhost:5173

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm test` — testes unitários (Vitest)
- `npm run build` — typecheck + build de produção
- `npm run preview` — serve o build

## Arquitetura

- SPA React + Vite + TypeScript (`src/pages`, `src/components`)
- Supabase: Auth, Postgres com RLS por empresa, Storage (bucket `logos`)
- Toda a lógica de dinheiro em centavos inteiros (`src/lib/money.ts`)
- Acesso a dados centralizado em `src/lib/db.ts`
- PDF: definição pura em `src/lib/pdf.ts` (testada), efeitos em `src/lib/pdfActions.ts`
```

- [ ] **Step 2: Verificação final completa**

Run: `npm test`
Expected: PASS — todos os testes (money, whatsapp, pdf).

Run: `npm run build`
Expected: sem erros de tipo e build gerado.

Checklist manual de ponta a ponta (requer Supabase configurado; usar o navegador em largura mobile):
1. Criar conta nova → onboarding pede nome da oficina → Home vazia.
2. Ajustes: preencher dados, subir logo, mudar as duas cores, marcar formas de pagamento → salvar → recarregar → persistiu.
3. Catálogo: criar 2 serviços e 1 produto.
4. Novo orçamento: cliente com WhatsApp, veículo; adicionar 2 itens do catálogo + 1 texto livre; desconto; cartão 3x; observação → gerar.
5. Tela de sucesso: Ver PDF (logo, cores, itens, parcelas, validade corretos); Enviar no WhatsApp abre wa.me com mensagem e link.
6. Abrir o link público em janela anônima → orçamento visível + Baixar PDF.
7. Home: orçamento listado; busca por placa acha; mudar status no detalhe → filtro por status reflete.
8. Editar orçamento (mantém número), Duplicar (novo número).
9. Segunda conta (outra oficina): não vê nada da primeira; numeração própria começa em 1.
10. Sair da conta → volta ao login.

- [ ] **Step 3: Commit final**

```bash
git add README.md
git commit -m "docs: README com setup e arquitetura"
```

---

## Observações para o executor

- As tasks 3, 4 e 6 são TDD estrito (teste antes da implementação).
- As tasks de tela (9–15) são verificadas por typecheck + build + verificação manual; não há testes de componente nesta versão (decisão do spec: testar só lógica pura).
- Se `npm run dev` falhar por falta de `.env`, criar a partir do `.env.example` — o `supabaseClient.ts` lança erro claro de propósito.
- Gaps de numeração de orçamento são aceitáveis (se a inserção falhar depois de reservar o número, o número fica "queimado"). É comportamento esperado da v1.
