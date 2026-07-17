-- Simples OS: permite que usuários autenticados excluam orçamentos da própria empresa.
-- A política RLS "dono gerencia orcamentos" restringe a exclusão ao tenant atual.
-- Os itens são removidos pelo ON DELETE CASCADE da chave estrangeira composta.

grant delete
  on table public.quotes
  to authenticated;

revoke delete on table public.quotes from anon;
