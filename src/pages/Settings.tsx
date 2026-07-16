import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../components/toast';
import { Field, Spinner } from '../components/ui';
import { useAuth } from '../lib/auth';
import { PAYMENT_METHOD_LABELS } from '../lib/constants';
import { updateCompany, uploadLogo } from '../lib/db';

export default function Settings() {
  const { company, refreshCompany, signOut } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [primary, setPrimary] = useState('#1e3a5f');
  const [accent, setAccent] = useState('#e8590c');
  const [methods, setMethods] = useState<string[]>([]);
  const [validityDays, setValidityDays] = useState(15);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setDocument(company.document ?? '');
    setPhone(company.phone ?? '');
    setAddress(company.address ?? '');
    setPrimary(company.printPrimaryColor);
    setAccent(company.printAccentColor);
    setMethods(company.paymentMethods);
    setValidityDays(company.quoteValidityDays);
    setLogoPreview(company.logoUrl);
  }, [company]);

  if (!company) return <Spinner />;

  function toggleMethod(m: string) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function pickLogo(file: File | null) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : company?.logoUrl ?? null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!company || !name.trim()) return;
    setBusy(true);
    try {
      let logoUrl = company.logoUrl;
      if (logoFile) logoUrl = await uploadLogo(company.id, logoFile);
      await updateCompany(company.id, {
        name: name.trim(),
        document: document.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        logoUrl,
        printPrimaryColor: primary,
        printAccentColor: accent,
        paymentMethods: methods,
        quoteValidityDays: validityDays,
      });
      await refreshCompany();
      setLogoFile(null);
      toast.success('Ajustes salvos.');
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1>Ajustes</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dados da oficina</h2>
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="CNPJ ou CPF (opcional)">
          <input value={document} onChange={(e) => setDocument(e.target.value)} />
        </Field>
        <Field label="Telefone (opcional)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </Field>
        <Field label="Endereço (opcional)">
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Impressão</h2>
        <Field label="Logomarca">
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
        </Field>
        <div className="row">
          <Field label="Cor principal">
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </Field>
          <Field label="Cor de destaque">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          </Field>
        </div>
        <span className="small muted">Prévia do cabeçalho do PDF:</span>
        <div style={{ background: primary, borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
          {logoPreview && (
            <img src={logoPreview} alt="Logo" style={{ height: 40, maxWidth: 80, objectFit: 'contain', background: '#fff', borderRadius: 4 }} />
          )}
          <div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{name || 'Sua oficina'}</div>
            <div style={{ color: accent, fontSize: 12, fontWeight: 700 }}>ORÇAMENTO Nº 123</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Pagamento</h2>
        <span className="small muted">Formas que sua oficina aceita:</span>
        {Object.entries(PAYMENT_METHOD_LABELS).map(([id, label]) => (
          <label key={id} className="check">
            <input type="checkbox" checked={methods.includes(id)} onChange={() => toggleMethod(id)} />
            {label}
          </label>
        ))}
        <Field label="Validade do orçamento (dias)">
          <input
            type="number"
            min={1}
            value={validityDays}
            onChange={(e) => setValidityDays(Math.max(1, parseInt(e.target.value || '15', 10)))}
          />
        </Field>
      </div>

      <button className="btn" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar alterações'}
      </button>
      <button type="button" className="btn danger mt" onClick={() => void signOut()}>
        Sair da conta
      </button>
    </form>
  );
}
