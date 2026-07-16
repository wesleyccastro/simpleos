import { useState, type FormEvent } from 'react';
import { useToast } from '../components/toast';
import { Field } from '../components/ui';
import { useAuth } from '../lib/auth';
import { createCompany } from '../lib/db';

export default function Onboarding() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { refreshCompany } = useAuth();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCompany(name.trim());
      await refreshCompany();
    } catch {
      toast.error('Não foi possível criar a oficina. Tente novamente.');
      setBusy(false);
    }
  }

  return (
    <div className="center-page">
      <div className="brand">
        <div className="logo">Bem-vindo! 👋</div>
        <div className="tagline">Só falta uma coisa: como se chama a sua oficina?</div>
      </div>
      <form className="card" onSubmit={submit}>
        <Field label="Nome da oficina">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex.: Oficina do Zé" />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? 'Criando…' : 'Começar a usar'}
        </button>
        <p className="small muted mt">Você poderá completar CNPJ, telefone, logo e cores em Ajustes.</p>
      </form>
    </div>
  );
}
