import axios from 'axios';
import { create } from 'zustand';

// --- API Client ---
const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
  
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  fetchData: () => Promise<void>;
  addTransaction: (data: Partial<Transaction>) => Promise<void>;
  addBudget: (data: Partial<Budget>) => Promise<void>;
  saveAIInsight: (tipo: string, contenido: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  transactions: [],
  categories: [],
  budgets: [],
  insights: [],
  isLoading: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, transactions: [], budgets: [] });
  },

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [txs, cats, bdgts, ins] = await Promise.all([
        api.get('/transactions'),
        api.get('/categories'),
        api.get('/budgets'),
        api.get('/ai-insights')
      ]);
      set({ 
        transactions: txs.data, 
        categories: cats.data, 
        budgets: bdgts.data,
        insights: ins.data
      });
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: async (data) => {
    const res = await api.post('/transactions', data);
    set((state) => ({ transactions: [res.data, ...state.transactions] }));
  },

  addBudget: async (data) => {
    const res = await api.post('/budgets', data);
    set((state) => ({ budgets: [...state.budgets.filter(b => b.categoria_id !== data.categoria_id), res.data] }));
  },

  saveAIInsight: async (tipo, contenido) => {
    const res = await api.post('/ai-insights', { tipo, contenido });
    set((state) => ({ insights: [res.data, ...state.insights] }));
  }
}));

export default api;
