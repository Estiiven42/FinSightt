/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAppStore } from './lib/api';
import { AuthView } from './components/AuthView';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { AIInsights } from './components/AIInsights';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { token, fetchData, isLoading } = useAppStore();
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  if (!token) {
    return <AuthView />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'budgets': return <Budgets />;
      case 'ai-insights': return <AIInsights />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex bg-[#F8F9FA] min-h-screen">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-gray-900 capitalize">
                {currentView.replace('-', ' ')}
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
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

