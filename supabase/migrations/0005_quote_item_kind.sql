-- Simples OS: separa produtos e serviços nos itens do orçamento (usado na impressão).
-- Execute depois de 0004_quote_deletion.sql.

alter table public.quote_items
  add column if not exists kind text not null default 'servico';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quote_items_kind_valid') then
    alter table public.quote_items add constraint quote_items_kind_valid check (kind in ('produto', 'servico'));
  end if;
end $$;

alter table public.quote_items alter column kind drop default;

create or replace function public.create_quote_with_items(
  p_company_id uuid,
  p_quote jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_number int;
  v_quote_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão obrigatória' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'O orçamento precisa ter pelo menos um item' using errcode = '23514';
  end if;

  update public.companies
     set next_quote_number = next_quote_number + 1
   where id = p_company_id
     and owner_id = (select auth.uid())
  returning next_quote_number - 1 into v_number;

  if v_number is null then
    raise exception 'Oficina não encontrada' using errcode = '42501';
  end if;

  insert into public.quotes (
    company_id,
    number,
    customer_name,
    customer_phone,
    vehicle_model,
    vehicle_plate,
    vehicle_km,
    discount,
    payment_terms,
    notes,
    total
  ) values (
    p_company_id,
    v_number,
    p_quote->>'customer_name',
    nullif(p_quote->>'customer_phone', ''),
    nullif(p_quote->>'vehicle_model', ''),
    nullif(p_quote->>'vehicle_plate', ''),
    nullif(p_quote->>'vehicle_km', '')::int,
    (p_quote->>'discount')::numeric,
    coalesce(p_quote->'payment_terms', '{"methods":[],"installments":1,"notes":""}'::jsonb),
    nullif(p_quote->>'notes', ''),
    (p_quote->>'total')::numeric
  )
  returning id into v_quote_id;

  insert into public.quote_items (quote_id, company_id, kind, description, quantity, unit_price, position)
  select
    v_quote_id,
    p_company_id,
    coalesce(nullif(item->>'kind', ''), 'servico'),
    item->>'description',
    (item->>'quantity')::numeric,
    (item->>'unit_price')::numeric,
    ordinal::int - 1
  from jsonb_array_elements(p_items) with ordinality as entry(item, ordinal);

  return jsonb_build_object('id', v_quote_id, 'number', v_number);
end;
$$;

create or replace function public.update_quote_with_items(
  p_quote_id uuid,
  p_company_id uuid,
  p_quote jsonb,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão obrigatória' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'O orçamento precisa ter pelo menos um item' using errcode = '23514';
  end if;

  update public.quotes as q
     set customer_name = p_quote->>'customer_name',
         customer_phone = nullif(p_quote->>'customer_phone', ''),
         vehicle_model = nullif(p_quote->>'vehicle_model', ''),
         vehicle_plate = nullif(p_quote->>'vehicle_plate', ''),
         vehicle_km = nullif(p_quote->>'vehicle_km', '')::int,
         discount = (p_quote->>'discount')::numeric,
         payment_terms = coalesce(p_quote->'payment_terms', '{"methods":[],"installments":1,"notes":""}'::jsonb),
         notes = nullif(p_quote->>'notes', ''),
         total = (p_quote->>'total')::numeric
   where q.id = p_quote_id
     and q.company_id = p_company_id
     and exists (
       select 1
       from public.companies as c
       where c.id = p_company_id
         and c.owner_id = (select auth.uid())
     )
  returning q.id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Orçamento não encontrado' using errcode = '42501';
  end if;

  delete from public.quote_items
   where quote_id = p_quote_id
     and company_id = p_company_id;

  insert into public.quote_items (quote_id, company_id, kind, description, quantity, unit_price, position)
  select
    p_quote_id,
    p_company_id,
    coalesce(nullif(item->>'kind', ''), 'servico'),
    item->>'description',
    (item->>'quantity')::numeric,
    (item->>'unit_price')::numeric,
    ordinal::int - 1
  from jsonb_array_elements(p_items) with ordinality as entry(item, ordinal);
end;
$$;
