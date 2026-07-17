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
3. No **SQL Editor**, execute em ordem:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_quote_integrity.sql`
   - `supabase/migrations/0003_api_privileges.sql`
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
- Criação e edição de orçamentos em RPCs transacionais; uma falha reverte cabeçalho, itens e numeração
- `pdfmake` e suas fontes são carregados sob demanda para manter o bundle inicial menor

## Estado da validação

- Testes unitários e build podem ser executados sem Supabase configurado.
- A homologação com Auth, RLS, Storage, link público e concorrência depende de um projeto Supabase e permanece pendente.
- Ao configurar o Supabase, execute o checklist manual no fim do plano em `docs/superpowers/plans/2026-07-16-simpleos-orcamentos.md`.
