import React, { useState } from 'react';
import { useAppStore } from '../lib/api';
import { Card, Button, Input, Select } from './ui';
import { categorizeTransaction } from '../lib/gemini';
import { Plus, Loader2, Trash2, Sparkles, Download } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';

export function Transactions() {
  const { transactions, categories, addTransaction, fetchData } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    tipo: 'gasto',
    fecha_transaccion: format(new Date(), 'yyyy-MM-dd'),
    categoria_id: '',
    categoria_ia: '',
    etiquetas_ia: [] as string[]
  });

  const handleAiCategorize = async () => {
    if (!formData.descripcion || !formData.monto) return;
    setIsAiLoading(true);
    try {
      const res = await api.post('/ai/categorize', {
        descripcion: formData.descripcion,
        monto: Number(formData.monto),
        tipo: formData.tipo
      });
      if (res.data) {
        setFormData(prev => ({
          ...prev,
          categoria_ia: res.data.categoria_ia,
          etiquetas_ia: res.data.etiquetas_ia
        }));
      }
    } catch (err) {
      console.error("AI Error:", err);
    }
    setIsAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoria_id) return;
    await addTransaction({
      ...formData,
      monto: Number(formData.monto),
      categoria_id: Number(formData.categoria_id)
    });
    setIsAdding(false);
    setFormData({
      descripcion: '',
      monto: '',
      tipo: 'gasto',
      fecha_transaccion: format(new Date(), 'yyyy-MM-dd'),
      categoria_id: '',
      categoria_ia: '',
      etiquetas_ia: []
    });
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/transactions/${id}`);
    fetchData();
  };

  const handleExport = () => {
    window.open('/api/export/csv', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Transacciones</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4" /> Nueva Transacción
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="p-6 bg-gray-50 border-dashed border-2">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input 
              label="Descripción" 
              placeholder="Ej. Almuerzo oficina" 
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              required
            />
            <Input 
              label="Monto" 
              type="number" 
              placeholder="0.00" 
              value={formData.monto}
              onChange={e => setFormData({...formData, monto: e.target.value})}
              required
            />
            <Select 
              label="Tipo"
              value={formData.tipo}
              onChange={e => setFormData({...formData, tipo: e.target.value as any})}
              options={[
                { label: 'Gasto', value: 'gasto' },
                { label: 'Ingreso', value: 'ingreso' }
              ]}
            />
            <Select 
              label="Categoría"
              value={formData.categoria_id}
              onChange={e => setFormData({...formData, categoria_id: e.target.value})}
              options={[
                { label: 'Seleccionar...', value: '' },
                ...categories.map(c => ({ label: c.nombre, value: c.id }))
              ]}
            />
            
            <div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200">
              <Button 
                type="button" 
                variant="secondary" 
                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                onClick={handleAiCategorize}
                disabled={isAiLoading || !formData.descripcion}
              >
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainSparkles className="w-4 h-4" />}
                Clasificar con IA
              </Button>
              
              {formData.categoria_ia && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sugerencia IA:</span>
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-bold shadow-sm">
                    {formData.categoria_ia}
                  </span>
                  {formData.etiquetas_ia.map(tag => (
                    <span key={tag} className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-mono uppercase text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 ml-auto">
                <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button type="submit">Guardar Transacción</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Monto</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-gray-500">
                    {format(new Date(t.fecha_transaccion), 'dd MMM, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{t.descripcion}</span>
                      {t.categoria_ia && (
                        <span className="text-[10px] text-purple-600 font-bold uppercase tracking-tighter flex items-center gap-1">
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
                  <td className={cn(
                    "px-6 py-4 text-sm font-black text-right tracking-tighter",
                    t.tipo === 'ingreso' ? 'text-green-600' : 'text-gray-900'
                  )}>
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
