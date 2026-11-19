import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Park, User } from '../types/models';
import { DEMO, createSeed } from '../data/seed';
import { Action, reducer } from './reducer';
import { dayKey } from '../utils/format';

const STORAGE_KEY = 'parkupb:state:v1';

// Garante que as contas de demonstração (utente, gestor, admin) existem sempre,
// mesmo que os dados guardados sejam de uma versão anterior ou a conta tenha sido apagada.
function withDemoAccounts(saved: AppState): AppState {
  const demoEmails = Object.values(DEMO).map((d) => d.email);
  const missing = createSeed().users.filter(
    (u) => demoEmails.includes(u.email) && !saved.users.some((x) => x.email.toLowerCase() === u.email),
  );
  if (!missing.length) return saved;
  const ids = new Set(missing.map((m) => m.id));
  return { ...saved, users: [...saved.users.filter((x) => !ids.has(x.id)), ...missing] };
}

interface Ctx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  ready: boolean;
  now: number;
  user: User | null;
  park: Park;
  resetDemo: () => void;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createSeed());
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Relógio partilhado: prazos (1 h antes), ocupação e tempos excedidos atualizam sozinhos.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  // Carrega os dados guardados localmente. Num novo dia, os dados de demonstração são regenerados.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as AppState;
          if (saved.seedDay === dayKey(Date.now())) dispatch({ type: 'HYDRATE', state: withDemoAccounts(saved) });
        }
      } catch {
        // Sem persistência disponível: a app continua só em memória.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
    }, 400);
  }, [state, ready]);

  const value = useMemo<Ctx>(() => {
    const user = state.users.find((u) => u.id === state.sessionUserId) ?? null;
    const park = state.parks.find((p) => p.id === state.selectedParkId) ?? state.parks[0];
    return {
      state, dispatch, ready, now, user, park,
      resetDemo: () => dispatch({ type: 'RESET', state: { ...createSeed(), sessionUserId: state.sessionUserId } }),
    };
  }, [state, ready, now]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}

/** Utilizador autenticado (garantido nos ecrãs protegidos). */
export function useMe(): User {
  const { user } = useApp();
  if (!user) throw new Error('Sem sessão');
  return user;
}
