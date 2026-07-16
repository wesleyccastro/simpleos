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
