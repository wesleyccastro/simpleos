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
