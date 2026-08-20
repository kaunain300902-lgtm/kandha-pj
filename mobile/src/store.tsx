import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, type City, type Me } from './api';
import { connectSocket, disconnectSocket } from './socket';
import type { Lang } from './i18n';

type State = {
  ready: boolean;
  me: Me | null;
  cities: City[];
  city: City | null;
  lang: Lang;
  setCity: (c: City) => void;
  setLang: (l: Lang) => void;
  signIn: (token: string, me: Me) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCityState] = useState<City | null>(null);
  const [lang, setLang] = useState<Lang>('hi');

  const refresh = useCallback(async () => {
    try {
      const m = await api.me();
      setMe(m);
      if (m.lang) setLang(m.lang);
    } catch { setMe(null); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.cities();
        setCities(list);
        setCityState(list[0] ?? null);
      } catch { /* offline — the gate will show a retry */ }
      if (await getToken()) { await refresh(); await connectSocket(); }
      setReady(true);
    })();
  }, [refresh]);

  useEffect(() => {
    if (me?.cityId) {
      const c = cities.find((x) => x.id === me.cityId);
      if (c) setCityState(c);
    }
  }, [me?.cityId, cities]);

  const signIn = useCallback(async (token: string, user: Me) => {
    await setToken(token);
    setMe(user);
    if (user.lang) setLang(user.lang);
    await connectSocket();
  }, []);

  const signOut = useCallback(async () => {
    disconnectSocket();
    await setToken(null);
    setMe(null);
  }, []);

  const value = useMemo<State>(() => ({
    ready, me, cities, city, lang,
    setCity: setCityState, setLang, signIn, signOut, refresh,
  }), [ready, me, cities, city, lang, signIn, signOut, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
