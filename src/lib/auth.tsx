import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMyCompany } from './db';
import { supabase } from './supabaseClient';
import type { Company } from './types';

interface AuthState {
  session: Session | null;
  company: Company | null;
  loading: boolean;
  refreshCompany: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  company: null,
  loading: true,
  refreshCompany: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyReady, setCompanyReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (!session) {
      setCompany(null);
      setCompanyReady(true);
      return;
    }
    let active = true;
    setCompanyReady(false);
    getMyCompany()
      .then((c) => {
        if (active) setCompany(c);
      })
      .catch(() => {
        if (active) setCompany(null);
      })
      .finally(() => {
        if (active) setCompanyReady(true);
      });
    return () => {
      active = false;
    };
  }, [session, sessionReady]);

  const refreshCompany = async () => setCompany(await getMyCompany());
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, company, loading: !sessionReady || !companyReady, refreshCompany, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
