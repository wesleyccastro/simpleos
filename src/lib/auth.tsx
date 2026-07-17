import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMyCompany } from './db';
import { supabase } from './supabaseClient';
import type { Company } from './types';

interface AuthState {
  session: Session | null;
  company: Company | null;
  companyError: boolean;
  loading: boolean;
  refreshCompany: () => Promise<void>;
  retryCompany: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  company: null,
  companyError: false,
  loading: true,
  refreshCompany: async () => {},
  retryCompany: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyError, setCompanyError] = useState(false);
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
      setCompanyError(false);
      setCompanyReady(true);
      return;
    }
    let active = true;
    setCompanyReady(false);
    setCompanyError(false);
    getMyCompany()
      .then((c) => {
        if (active) setCompany(c);
      })
      .catch(() => {
        if (active) setCompanyError(true);
      })
      .finally(() => {
        if (active) setCompanyReady(true);
      });
    return () => {
      active = false;
    };
  }, [session, sessionReady]);

  const refreshCompany = async () => {
    try {
      setCompany(await getMyCompany());
      setCompanyError(false);
    } catch (error) {
      setCompanyError(true);
      throw error;
    }
  };
  const retryCompany = async () => {
    setCompanyReady(false);
    try {
      await refreshCompany();
    } finally {
      setCompanyReady(true);
    }
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        company,
        companyError,
        loading: !sessionReady || !companyReady,
        refreshCompany,
        retryCompany,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
