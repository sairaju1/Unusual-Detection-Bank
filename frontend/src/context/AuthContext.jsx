import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session from a saved token on page load.
  useEffect(() => {
    if (!tokenStore.get()) return setReady(true);
    api.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.login(email, password);
    tokenStore.set(r.token);
    setUser(r.user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const r = await api.register(name, email, password);
    tokenStore.set(r.token);
    setUser(r.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
