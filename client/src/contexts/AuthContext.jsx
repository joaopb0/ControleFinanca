import { useCallback, useEffect, useRef, useState } from 'react';
import { clearSessionState, getCurrentUser, login, register, logout, onUnauthorized } from '../services/api';
import { createSessionSync } from '../services/sessionSync';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [sessionError, setSessionError] = useState('');
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const [retry, setRetry] = useState(0);
  const sessionSync = useRef(null);

  useEffect(() => {
    const sync = createSessionSync(() => {
      clearSessionState();
      setUser(null);
      setStatus('loading');
      setSessionError('');
      setRetry((value) => value + 1);
    });
    sessionSync.current = sync;
    return () => {
      sessionSync.current = null;
      sync.close();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onUnauthorized(() => {
      if (!active) return;
      setUser(null);
      setStatus('ready');
      setSessionError('');
    });

    getCurrentUser().then((currentUser) => {
      if (!active) return;
      setUser(currentUser);
      setStatus('ready');
    }).catch((error) => {
      if (!active) return;
      setUser(null);
      if (error.status === 401) {
        setStatus('ready');
      } else {
        setSessionError('Não foi possível verificar sua sessão. Confira sua conexão e tente novamente.');
        setStatus('error');
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [retry]);

  const authenticate = useCallback(async (action, credentials) => {
    const authenticatedUser = await action(credentials);
    setSessionGeneration((generation) => generation + 1);
    setUser(authenticatedUser);
    setStatus('ready');
    sessionSync.current?.notify();
    return authenticatedUser;
  }, []);

  const signIn = useCallback((credentials) => authenticate(login, credentials), [authenticate]);
  const signUp = useCallback((credentials) => authenticate(register, credentials), [authenticate]);
  const signOut = useCallback(async () => {
    try {
      await logout();
      setUser(null);
      setStatus('ready');
      sessionSync.current?.notify();
    } catch (error) {
      // Uma sessão já expirada também está encerrada no servidor.
      if (error.status !== 401) throw error;
      setUser(null);
      setStatus('ready');
      sessionSync.current?.notify();
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, status, sessionError, sessionGeneration, signIn, signUp, signOut,
      retrySession: () => {
        setStatus('loading');
        setSessionError('');
        setRetry((value) => value + 1);
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
}
