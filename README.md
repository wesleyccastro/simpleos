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
