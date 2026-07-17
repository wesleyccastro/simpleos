import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/toast';
import { Field } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';

function friendlyAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('already registered')) return 'Este e-mail já tem cadastro. Use "Entrar".';
  if (message.includes('at least 6 characters')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return 'Não foi possível entrar. Verifique a conexão e tente novamente.';
}

export default function Login() {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const action =
      mode === 'entrar'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setBusy(false);
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    navigate(from, { replace: true });
  }

  if (!loading && session) return <Navigate to={from} replace />;

  return (
    <div className="center-page">
      <div className="brand">
        <div className="logo">SimpleOS</div>
        <div className="tagline">Orçamentos para oficinas, sem complicação</div>
      </div>
      <form className="card" onSubmit={submit}>
        <Field label="E-mail">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Senha">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
          />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          type="button"
          className="btn ghost mt"
          style={{ width: '100%' }}
          onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}
        >
          {mode === 'entrar' ? 'Não tem conta? Criar conta grátis' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
