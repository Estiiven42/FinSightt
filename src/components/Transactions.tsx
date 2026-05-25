import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/api';
import { Card, Button } from './ui';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Calendar,
  Layers,
  Inbox,
  TrendingDown,
  TrendingUp,
  Coins
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { formatCurrencyCOP, THEME_COLORS } from '../lib/theme';

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function Transactions() {
  const { transactions, fetchData } = useAppStore();
  const navigate = useNavigate();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'ingreso' | 'gasto'>('all');

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar permanentemente este movimiento?')) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchData();
      } catch (err) {
        console.error("Failed to delete transaction:", err);
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/export/csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transacciones.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      alert("Error al exportar los datos. Asegúrate de haber iniciado sesión e inténtalo de nuevo.");
    }
  };

  // Filter transactions according to selected financial type
  const filteredTransactions = transactions.filter(t => {
    if (selectedTypeFilter === 'all') return true;
    return t.tipo === selectedTypeFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Historial Financiero</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Auditoría detallada de tus ingresos, egresos y etiquetados de IA</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button 
            variant="secondary" 
            onClick={handleExport} 
            className="text-xs font-bold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-gray-500" /> Exportar CSV
          </Button>
          <Button 
            onClick={() => navigate('/transacciones/nueva')}
            className="text-xs font-bold bg-gray-950 hover:bg-gray-800 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 select-none"
          >
            <Plus className="w-4 h-4" /> Registrar Movimiento
          </Button>
        </div>
      </div>

      {/* SEGMENTATION FILTERS */}
      <div className="flex bg-gray-100/80 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setSelectedTypeFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
            selectedTypeFilter === 'all'
              ? 'bg-white text-gray-950 shadow-sm border border-gray-200/50'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Todos ({transactions.length})
        </button>
        <button
          onClick={() => setSelectedTypeFilter('ingreso')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            selectedTypeFilter === 'ingreso'
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/15'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Ingresos ({transactions.filter(t => t.tipo === 'ingreso').length})
        </button>
        <button
          onClick={() => setSelectedTypeFilter('gasto')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
            selectedTypeFilter === 'gasto'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/15'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          Gastos ({transactions.filter(t => t.tipo === 'gasto').length})
        </button>
      </div>

      {/* TRANSACTIONS DISPLAY WRAPPER */}
      <Card className="border border-gray-100 shadow-xl shadow-gray-100/30 overflow-hidden rounded-2xl bg-white">
        
        {/* DESKTOP TABULAR VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Fecha de Operación</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Monto Nominal (COP)</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <Inbox className="w-8 h-8 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">No se encontraron movimientos registrados</p>
                        <p className="text-xs text-gray-400 max-w-xs mt-1">Registra transacciones para monitorear tu historial en pesos colombianos.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const isIngreso = t.tipo === 'ingreso';
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/40 transition-colors group">
                      <td className="px-6 py-4.5 text-xs font-bold text-gray-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-300" />
                          {format(parseLocalDate(t.fecha_transaccion), 'dd MMM, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-gray-900 text-sm select-all">{t.descripcion}</span>
                          
                          {/* IA Tags & categorization indicators */}
                          {t.categoria_ia && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] bg-purple-50 text-purple-700 font-extrabold border border-purple-100 px-2 py-0.5 rounded-md flex items-center gap-0.5 select-all uppercase">
                                <Sparkles className="w-2.5 h-2.5 fill-purple-200" />
                                Sugerido: {t.categoria_ia}
                              </span>
                              {t.etiquetas_ia?.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[9px] bg-purple-50/10 text-purple-500 font-semibold border border-purple-100/30 px-1.5 py-0.5 rounded-md uppercase">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-xs font-bold capitalize">
                        <span className={`px-2.5 py-1.5 border rounded-xl flex items-center gap-1.5 w-fit ${
                          isIngreso 
                            ? 'text-emerald-700 bg-emerald-50/40 border-emerald-100/50' 
                            : 'text-rose-700 bg-rose-50/40 border-rose-100/50'
                        }`}>
                          {isIngreso ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          {t.categoria_nombre || 'Sin categoría'}
                        </span>
                      </td>
                      <td className={`px-6 py-4.5 text-sm font-black text-right font-mono tracking-tight ${
                        isIngreso ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {isIngreso ? '+' : '-'}{formatCurrencyCOP(t.monto)}
                      </td>
                      <td className="px-6 py-4.5 text-right w-16">
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="text-gray-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 duration-200"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE RESPONSIVE CARD VIEW (Under md: size) */}
        <div className="block md:hidden divide-y divide-gray-50">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-xs font-bold">No se encontraron movimientos registrados</p>
            </div>
          ) : (
            filteredTransactions.map(t => {
              const isIngreso = t.tipo === 'ingreso';
              return (
                <div key={t.id} className="p-4 space-y-3 hover:bg-gray-50/35 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold font-mono">
                        {format(parseLocalDate(t.fecha_transaccion), 'dd MMM, yyyy')}
                      </span>
                      <h4 className="font-extrabold text-gray-900 text-sm select-all">{t.descripcion}</h4>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-black font-mono tracking-tight block ${
                        isIngreso ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {isIngreso ? '+' : '-'}{formatCurrencyCOP(t.monto)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-50">
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-lg capitalize inline-flex items-center gap-1 ${
                        isIngreso 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                          : 'text-rose-700 bg-rose-50 border-rose-100'
                      }`}>
                        {isIngreso ? (
                          <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" />
                        ) : (
                          <ArrowDownLeft className="w-2.5 h-2.5 text-rose-500" />
                        )}
                        {t.categoria_nombre || 'Sin categoría'}
                      </span>

                      {t.categoria_ia && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 font-extrabold border border-purple-100 px-2 py-0.5 rounded-lg inline-flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          {t.categoria_ia}
                        </span>
                      )}
                    </div>

                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="text-gray-400 hover:text-rose-600 p-1 bg-gray-50 rounded-lg border border-gray-200/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </Card>
    </div>
  );
}
