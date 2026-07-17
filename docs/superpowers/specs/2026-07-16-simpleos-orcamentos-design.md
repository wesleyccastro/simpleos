# Simples OS — Orçamentos de Oficina (Design)

**Data:** 2026-07-16
**Status:** Aprovado pelo usuário

## Objetivo

Aplicação web mobile-first e multi-tenant para oficinas criarem, imprimirem e enviarem orçamentos. Usuários leigos devem conseguir operar sem treinamento: botões grandes, uma ação principal por tela, fluxo em passos.

## Decisões de produto (confirmadas com o usuário)

- **Backend:** Supabase (Auth, Postgres com RLS, Storage para logos). Sem servidor próprio.
- **Frontend:** SPA React + Vite + TypeScript, hospedagem estática (Vercel/Netlify).
- **PDF:** gerado no aparelho com `pdfmake`.
- **WhatsApp:** os dois modos — link público via `wa.me` e compartilhamento nativo do PDF (Web Share API) quando o navegador suportar.
- **Usuários:** 1 usuário por oficina nesta versão (modelo de dados preparado para evoluir).
- **Status do orçamento:** `pendente → aprovado → em_andamento → concluido`, mais `recusado`.
- **Pagamento:** oficina configura formas aceitas; no orçamento escolhe forma(s), parcelamento e desconto/acréscimo.
- **Cliente/veículo por orçamento:** nome (obrigatório) e WhatsApp do cliente; modelo, placa e km do veículo (opcionais). Sem cadastro reaproveitável de clientes nesta versão.

## Arquitetura

```
[SPA React/Vite] ──supabase-js──> [Supabase: Auth | Postgres+RLS | Storage]
       │
       ├─ pdfmake (PDF no cliente)
       ├─ wa.me / Web Share API (WhatsApp)
       └─ Rota pública /o/:shareToken (orçamento sem login)
```

Toda a segurança multi-tenant vive em políticas RLS no Postgres, versionadas em migrations SQL no repositório (`supabase/migrations/`).

## Modelo de dados

### `companies` (tenant)
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid | FK `auth.users`, único (1 usuário por oficina) |
| name | text | obrigatório |
| document | text | CNPJ/CPF, opcional |
| phone, address | text | opcionais |
| logo_url | text | Storage público |
| print_primary_color | text | hex, default do app |
| print_accent_color | text | hex, default do app |
| payment_methods | text[] | ex.: `{pix, dinheiro, credito, debito}` |
| quote_validity_days | int | default 15, impresso no PDF |
| next_quote_number | int | contador, default 1 |

### `catalog_items`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| kind | text | `produto` ou `servico` |
| description | text | |
| default_price | numeric(12,2) | |
| active | boolean | soft delete |

### `quotes`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| number | int | sequencial por empresa (única: company_id+number) |
| status | text | `pendente\|aprovado\|em_andamento\|concluido\|recusado` |
| customer_name | text | obrigatório |
| customer_phone | text | WhatsApp, opcional |
| vehicle_model, vehicle_plate | text | opcionais |
| vehicle_km | int | opcional |
| discount | numeric(12,2) | pode ser negativo (acréscimo) |
| payment_terms | jsonb | `{methods: [], installments: n, notes: ""}` |
| notes | text | observações impressas |
| total | numeric(12,2) | persistido (snapshot) |
| share_token | uuid | default aleatório, para link público |
| created_at, updated_at | timestamptz | |

### `quote_items`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| quote_id | uuid FK | on delete cascade |
| company_id | uuid | denormalizado p/ RLS simples |
| description | text | do catálogo ou texto livre |
| quantity | numeric(10,2) | default 1 |
| unit_price | numeric(12,2) | |
| position | int | ordem de exibição |

### Regras no banco

- **RLS:** todas as tabelas habilitam RLS; política única por tabela: `company_id` deve pertencer à empresa cujo `owner_id = auth.uid()`.
- **Numeração:** função `next_quote_number(company_id)` com `UPDATE ... RETURNING` (atômica) chamada na criação do orçamento — sem números duplicados.
- **Link público:** função `get_public_quote(share_token)` `security definer` que retorna orçamento + itens + dados de exibição da empresa apenas pelo token. Nenhum acesso anônimo direto às tabelas.
- **Storage:** bucket `logos` com leitura pública e escrita restrita ao dono da empresa (pasta = company_id).

## Telas e fluxo

Navegação por **barra inferior fixa**: Início, Novo, Catálogo, Configurações.

1. **Login/Cadastro** — e-mail e senha. Após primeiro login, passo de boas-vindas: nome da oficina → cria `companies`.
2. **Início (histórico)** — lista de orçamentos (número, cliente, veículo, total, badge de status colorida), busca por cliente/placa/número, filtro por status com contadores. Botão destacado "Novo orçamento".
3. **Novo orçamento — passos:**
   1. *Cliente & veículo:* nome (obrigatório), WhatsApp, modelo, placa, km.
   2. *Itens:* busca no catálogo (toque adiciona) ou aba "texto livre" (descrição + preço). Lista editável (quantidade, preço, remover). Total fixo no rodapé.
   3. *Pagamento:* seleção das formas (entre as configuradas), parcelas (se cartão), desconto ou acréscimo, observações.
   4. *Revisão:* resumo completo → **Salvar** → tela de sucesso com "Ver PDF", "Enviar link no WhatsApp", "Compartilhar PDF".
4. **Detalhe do orçamento** — dados completos, troca de status com um toque (fluxo sugerido, mas qualquer transição permitida), Ver PDF, WhatsApp, Editar (regenera total), Duplicar (novo número).
5. **Catálogo** — lista com busca; criar/editar/desativar produto ou serviço (tipo, descrição, preço padrão).
6. **Configurações** — dados da empresa, upload/troca da logo, cores da impressão com pré-visualização do cabeçalho, formas de pagamento aceitas, validade padrão do orçamento, sair.
7. **Página pública `/o/:shareToken`** — visual limpo do orçamento com botão "Baixar PDF" (gerado no cliente com os mesmos dados). Sem login.

## PDF

Gerado com `pdfmake` a partir de uma função pura `buildQuotePdf(quote, company)`:
- Cabeçalho com cor primária da empresa, logo (se houver), nome/CNPJ/telefone/endereço.
- Faixa com "Orçamento Nº X" e data; cor de destaque nos títulos de seção.
- Cliente/veículo, tabela de itens (descrição, qtd, unit., subtotal), subtotal, desconto/acréscimo, **total**.
- Condições de pagamento e parcelas, observações, validade ("Válido por N dias").

## WhatsApp

- **Enviar link:** `https://wa.me/55<numero>?text=<mensagem>` com mensagem pronta: saudação, nome da oficina, número do orçamento, total e link público. Se não houver telefone, abre o seletor de contato do WhatsApp (wa.me sem número).
- **Compartilhar PDF:** `navigator.share({files: [pdf]})` — botão só aparece quando `navigator.canShare` suportar arquivos.

## Cálculos (lógica pura, testada)

- `subtotal = Σ(quantity × unit_price)`; `total = subtotal − discount` (discount negativo = acréscimo); nunca negativo (validação).
- Parcelas: exibição `Nx de R$ (total/N)` com ajuste de centavos na última parcela.
- Moeda em `Intl.NumberFormat('pt-BR')`; valores em `numeric` no banco, centavos como inteiros no cálculo do cliente para evitar erro de ponto flutuante.

## Erros

- Mensagens em pt-BR simples e acionáveis; toasts não-bloqueantes.
- Falha de rede ao salvar: mantém o formulário preenchido e oferece "Tentar novamente".
- Sessão expirada: redireciona ao login preservando a rota.

## Testes

- **Vitest** para lógica pura: totais/desconto/parcelas, mensagem de WhatsApp, definição do PDF (estrutura, não pixels), formatação de moeda/placa.
- Verificação manual guiada do fluxo completo (login → configurar → catálogo → orçamento → PDF → WhatsApp) antes de considerar pronto.

## Fora do escopo (versão 1)

Múltiplos usuários por oficina, cadastro reaproveitável de clientes, relatórios/dashboard, cobrança do app, API oficial do WhatsApp, modo offline completo.
