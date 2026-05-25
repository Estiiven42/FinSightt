import axios from 'axios';
import { create } from 'zustand';

// --- Safe Storage Wrapper to prevent SecurityErrors in Sandboxed iFrames ---
const inMemoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("[SafeStorage] Cannot read from localStorage, using memory fallback.", e);
      return inMemoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("[SafeStorage] Cannot write to localStorage, using memory fallback.", e);
      inMemoryStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("[SafeStorage] Cannot remove from localStorage, using memory fallback.", e);
      delete inMemoryStorage[key];
    }
  }
};

// --- API Client ---
const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = safeStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Types ---
export interface User {
  id: string;
  nombre: string;
  correo: string;
  moneda: string;
  google_id?: string;
  avatar_url?: string;
}

export interface Category {
  id: number;
  nombre: string;
  icono: string;
  tipo: 'ingreso' | 'gasto';
}

export interface Transaction {
  id: number;
  tipo: 'ingreso' | 'gasto';
  monto: number;
  descripcion: string;
  fecha_transaccion: string;
  categoria_id: number;
  categoria_nombre?: string;
  categoria_icono?: string;
  categoria_ia?: string;
  etiquetas_ia?: string[];
}

export interface Budget {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  monto_limite: number;
  mes: number;
  anio: number;
}

export interface AIInsight {
  id: number;
  tipo: string;
  contenido: string;
  generado_en: string;
}

// --- Store ---
interface AppState {
  user: User | null;
  token: string | null;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  insights: AIInsight[];
  isLoading: boolean;
  isInitializing: boolean;
  
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  fetchData: () => Promise<void>;
  addTransaction: (data: Partial<Transaction>) => Promise<void>;
  addBudget: (data: Partial<Budget>) => Promise<void>;
  saveAIInsight: (tipo: string, contenido: string) => Promise<void>;
}

// Helper to safely parse JSON from safeStorage
const getInitialUser = (): User | null => {
  try {
    const cached = safeStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  user: getInitialUser(),
  token: safeStorage.getItem('token'),
  transactions: [],
  categories: [],
  budgets: [],
  insights: [],
  isLoading: false,
  isInitializing: !!safeStorage.getItem('token'),

  setAuth: (user, token) => {
    safeStorage.setItem('token', token);
    safeStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isInitializing: false });
  },

  logout: () => {
    safeStorage.removeItem('token');
    safeStorage.removeItem('user');
    set({ user: null, token: null, transactions: [], budgets: [], insights: [], isInitializing: false });
  },

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const state = get();
      const promises: Promise<any>[] = [
        api.get('/transactions'),
        api.get('/categories'),
        api.get('/budgets'),
        api.get('/ai-insights')
      ];

      // Hydrate user profile if token is present but user setup is missing (or to keep it updated)
      const fetchUser = !state.user;
      if (fetchUser) {
        promises.push(api.get('/auth/me'));
      }

      const results = await Promise.all(promises);
      
      const updateData: Partial<AppState> = {
        transactions: results[0].data,
        categories: results[1].data,
        budgets: results[2].data,
        insights: results[3].data
      };

      if (fetchUser && results[4]) {
        updateData.user = results[4].data;
        safeStorage.setItem('user', JSON.stringify(results[4].data));
      }

      set(updateData);
    } catch (err: any) {
      console.error("Failed to fetch data", err);
      // Automatically clear stale or expired authorization tokens
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        get().logout();
      }
    } finally {
      set({ isLoading: false, isInitializing: false });
    }
  },

  addTransaction: async (data) => {
    const res = await api.post('/transactions', data);
    set((state) => ({ transactions: [res.data, ...state.transactions] }));
  },

  addBudget: async (data) => {
    const res = await api.post('/budgets', data);
    set((state) => ({ budgets: [...state.budgets.filter(b => Number(b.categoria_id) !== Number(data.categoria_id)), res.data] }));
  },

  saveAIInsight: async (tipo, contenido) => {
    const res = await api.post('/ai-insights', { tipo, contenido });
    set((state) => ({ insights: [res.data, ...state.insights] }));
  }
}));

export default api;
