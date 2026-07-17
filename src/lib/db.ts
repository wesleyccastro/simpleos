import { fromCents, toCents } from './money';
import { assertValidQuotePayload } from './quoteValidation';
import { supabase } from './supabaseClient';
import type { CatalogItem, Company, PaymentTerms, PublicCompany, Quote, QuotePayload, QuoteStatus } from './types';

export type { QuotePayload } from './types';

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
  if (patch.name !== undefined && !patch.name.trim()) throw new Error('Informe o nome da oficina.');
  if (patch.quoteValidityDays !== undefined && (!Number.isInteger(patch.quoteValidityDays) || patch.quoteValidityDays < 1)) {
    throw new Error('A validade precisa ser de pelo menos um dia.');
  }
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
  if (!item.description.trim()) throw new Error('Informe a descrição do item.');
  if (!Number.isInteger(item.defaultPriceCents) || item.defaultPriceCents < 0) {
    throw new Error('O preço não pode ser negativo.');
  }
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
        kind: (i.kind as 'produto' | 'servico') ?? 'servico',
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

function payloadToRpcItemRows(p: QuotePayload) {
  return p.items.map((it, i) => ({
    kind: it.kind,
    description: it.description,
    quantity: it.quantity,
    unit_price: fromCents(it.unitPriceCents),
    position: i,
  }));
}

export async function createQuote(companyId: string, p: QuotePayload): Promise<Quote> {
  assertValidQuotePayload(p);
  const { data, error } = await supabase.rpc('create_quote_with_items', {
    p_company_id: companyId,
    p_quote: payloadToQuoteRow(p),
    p_items: payloadToRpcItemRows(p),
  });
  if (error) throw error;
  const result = data as { id?: string } | null;
  if (!result?.id) throw new Error('O banco não retornou o orçamento criado.');
  return getQuote(result.id);
}

export async function updateQuote(quoteId: string, companyId: string, p: QuotePayload): Promise<void> {
  assertValidQuotePayload(p);
  const { error } = await supabase.rpc('update_quote_with_items', {
    p_quote_id: quoteId,
    p_company_id: companyId,
    p_quote: payloadToQuoteRow(p),
    p_items: payloadToRpcItemRows(p),
  });
  if (error) throw error;
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteQuote(id: string, companyId: string): Promise<void> {
  const { data, error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Orçamento não encontrado ou sem permissão para excluir.');
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
    items: src.items.map(({ kind, description, quantity, unitPriceCents }) => ({ kind, description, quantity, unitPriceCents })),
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
