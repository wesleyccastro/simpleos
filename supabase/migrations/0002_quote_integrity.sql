-- SimpleOS: integridade de valores e gravação transacional de orçamentos.
-- Execute depois de 0001_init.sql.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_quote_validity_days_positive') then
    alter table public.companies add constraint companies_quote_validity_days_positive check (quote_validity_days > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_next_quote_number_positive') then
    alter table public.companies add constraint companies_next_quote_number_positive check (next_quote_number > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_description_not_blank') then
    alter table public.catalog_items add constraint catalog_items_description_not_blank check (btrim(description) <> '');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_default_price_nonnegative') then
    alter table public.catalog_items add constraint catalog_items_default_price_nonnegative check (default_price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quotes_customer_name_not_blank') then
    alter table public.quotes add constraint quotes_customer_name_not_blank check (btrim(customer_name) <> '');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quotes_vehicle_km_nonnegative') then
    alter table public.quotes add constraint quotes_vehicle_km_nonnegative check (vehicle_km is null or vehicle_km >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quotes_total_nonnegative') then
    alter table public.quotes add constraint quotes_total_nonnegative check (total >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quote_items_description_not_blank') then
    alter table public.quote_items add constraint quote_items_description_not_blank check (btrim(description) <> '');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quote_items_quantity_positive') then
    alter table public.quote_items add constraint quote_items_quantity_positive check (quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quote_items_unit_price_nonnegative') then
    alter table public.quote_items add constraint quote_items_unit_price_nonnegative check (unit_price >= 0);
  end if;
end $$;

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

  insert into public.quote_items (quote_id, company_id, description, quantity, unit_price, position)
  select
    v_quote_id,
    p_company_id,
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

  insert into public.quote_items (quote_id, company_id, description, quantity, unit_price, position)
  select
    p_quote_id,
    p_company_id,
    item->>'description',
    (item->>'quantity')::numeric,
    (item->>'unit_price')::numeric,
    ordinal::int - 1
  from jsonb_array_elements(p_items) with ordinality as entry(item, ordinal);
end;
$$;

-- A numeração agora é reservada somente dentro da RPC transacional.
revoke execute on function public.take_quote_number(uuid) from public, anon, authenticated;

revoke all on function public.create_quote_with_items(uuid, jsonb, jsonb) from public;
revoke all on function public.update_quote_with_items(uuid, uuid, jsonb, jsonb) from public;
grant execute on function public.create_quote_with_items(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_quote_with_items(uuid, uuid, jsonb, jsonb) to authenticated;
