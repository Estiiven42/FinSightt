import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/api';
import { Card, Button } from './ui';
import { Plus, Trash2, Sparkles, Download } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function Transactions() {
  const { transactions, fetchData } = useAppStore();
  const navigate = useNavigate();

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta transacción?')) {
      await api.delete(`/transactions/${id}`);
      fetchData();
    }
  };

  const handleExport = () => {
    window.open('/api/export/csv', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registro de Movimientos</h2>
          <p className="text-gray-500 text-sm">Gestiona tus ingresos y gastos recientes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleExport} className="hidden sm:flex">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button onClick={() => navigate('/transacciones/nueva')}>
            <Plus className="w-4 h-4" /> Nueva Transacción
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No hay transacciones registradas. Empieza agregando una nueva.
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">
                      {format(parseLocalDate(t.fecha_transaccion), 'dd MMM, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{t.descripcion}</span>
                        {t.categoria_ia && (
                          <span className="text-[10px] text-purple-600 font-bold uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> IA: {t.categoria_ia}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700 capitalize">
                        {t.categoria_nombre || 'Sin categoría'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-black text-right tracking-tighter ${
                      t.tipo === 'ingreso' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {t.tipo === 'ingreso' ? '+' : '-'}{Number(t.monto).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
