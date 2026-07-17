-- Simples OS: privilégios mínimos da Data API.
-- Execute depois de 0002_quote_integrity.sql.

grant usage on schema public to authenticated;

grant select, insert, update
  on table public.companies
  to authenticated;

grant select, insert, update
  on table public.catalog_items
  to authenticated;

grant select, insert, update
  on table public.quotes
  to authenticated;

grant select, insert, delete
  on table public.quote_items
  to authenticated;

-- O acesso anônimo continua somente pela função security definer.
revoke all on table public.companies from anon;
revoke all on table public.catalog_items from anon;
revoke all on table public.quotes from anon;
revoke all on table public.quote_items from anon;

grant execute on function public.my_company_id() to authenticated;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;
grant execute on function public.create_quote_with_items(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_quote_with_items(uuid, uuid, jsonb, jsonb) to authenticated;
