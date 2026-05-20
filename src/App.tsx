/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './lib/api';
import { AuthView } from './components/AuthView';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { AIInsights } from './components/AIInsights';
import { NewTransaction } from './components/NewTransaction';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

function AppLayout() {
  const { token, fetchData, isLoading, isInitializing } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isInitializing) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center select-none"
        >
          <div className="flex flex-col items-center justify-center max-w-sm">
            {/* Logo block */}
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-black/10"
            >
              <span className="text-white font-black text-2xl tracking-tighter">FS</span>
            </motion.div>

            {/* Typography pairings */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-2xl font-black tracking-tight text-gray-900 mb-2"
            >
              FinSight
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-sm font-medium text-gray-400 mb-8"
            >
              Inicializando FinSight...
            </motion.p>

            {/* Custom spinner element */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="flex items-center gap-3 px-4 py-2 border border-gray-150 rounded-full bg-white shadow-sm shadow-gray-100/50"
            >
              <Loader2 className="w-4 h-4 text-black animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Sincronizando Datos
              </span>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const getViewTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Panel de Control';
    if (path === '/transacciones') return 'Transacciones';
    if (path === '/transacciones/nueva') return 'Nueva Transacción';
    if (path === '/presupuestos') return 'Presupuestos';
    if (path === '/perspectivas') return 'Perspectivas de IA';
    return 'FinSight';
  };

  return (
    <div className="flex bg-[#F8F9FA] min-h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-gray-900">
                {getViewTitle()}
              </h1>
              <p className="text-gray-500 font-medium">Panel Maestro de FinSight</p>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest bg-white border border-gray-100 px-3 py-1.5 rounded-lg shadow-sm">
                <Loader2 className="w-3 h-3 animate-spin" /> Actualizando
              </div>
            )}
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transacciones" element={<Transactions />} />
                <Route path="/transacciones/nueva" element={<NewTransaction onCancel={() => window.history.back()} onSuccess={() => window.history.back()} />} />
                <Route path="/presupuestos" element={<Budgets />} />
                <Route path="/perspectivas" element={<AIInsights />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthView />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}


