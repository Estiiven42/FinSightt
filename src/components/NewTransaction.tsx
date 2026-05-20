import React, { useState } from 'react';
import { useAppStore } from '../lib/api';
import { Card, Button, Input, Select } from './ui';
import { Loader2, Sparkles, ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';

export function NewTransaction({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { categories, addTransaction } = useAppStore();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isCreatingCatLoading, setIsCreatingCatLoading] = useState(false);

  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    tipo: 'gasto',
    fecha_transaccion: format(new Date(), 'yyyy-MM-dd'),
    categoria_id: '',
    categoria_ia: '',
    etiquetas_ia: [] as string[]
  });

  const handleCreateCustomCategory = async () => {
    if (!newCatName.trim()) return;
    setIsCreatingCatLoading(true);
    setError('');
    try {
      const res = await api.post('/categories', {
        nombre: newCatName.trim(),
        icono: formData.tipo === 'ingreso' ? 'Coins' : 'Tag',
        tipo: formData.tipo
      });
      
      // Actualizar el estado global de Zustand para incluir la nueva categoría
      useAppStore.setState(state => ({
        categories: [...state.categories, res.data]
      }));

      // Seleccionar automáticamente la nueva categoría
      setFormData(prev => ({ ...prev, categoria_id: String(res.data.id) }));
      setNewCatName('');
      setIsCreatingCustom(false);
    } catch (err) {
      console.error("Failed to create custom category:", err);
      setError('No se pudo crear la categoría personalizada.');
    }
    setIsCreatingCatLoading(false);
  };

  const handleAiCategorize = async () => {
    if (!formData.descripcion || !formData.monto) {
      setError('Por favor ingresa una descripción y un monto para clasificar.');
      return;
    }
    setError('');
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
      setError('Error al conectar con la IA. Inténtalo de nuevo.');
    }
    setIsAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      setError('Por favor ingresa una descripción para el movimiento.');
      return;
    }
    const numericMonto = Number(formData.monto);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      setError('El monto debe ser un número positivo mayor que cero.');
      return;
    }
    if (!formData.categoria_id) {
      setError('Por favor selecciona una categoría.');
      return;
    }
    setError('');
    try {
      await addTransaction({
        ...formData,
        monto: numericMonto,
        categoria_id: Number(formData.categoria_id)
      });
      onSuccess();
    } catch (err) {
      setError('No se pudo guardar la transacción.');
    }
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Registrar Nueva Transacción</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            label="Tipo de Movimiento"
            value={formData.tipo}
            onChange={e => setFormData({...formData, tipo: e.target.value as any, categoria_id: ''})}
            options={[
              { label: 'Gasto', value: 'gasto' },
              { label: 'Ingreso', value: 'ingreso' }
            ]}
          />
          <div className="flex flex-col justify-end">
            <Select 
              label="Categoría"
              value={formData.categoria_id}
              onChange={e => {
                if (e.target.value === '__add_custom__') {
                  setIsCreatingCustom(true);
                } else {
                  setFormData({...formData, categoria_id: e.target.value});
                }
              }}
              options={[
                { label: 'Seleccionar...', value: '' },
                ...categories
                  .filter(c => c.tipo === formData.tipo)
                  .map(c => ({ label: c.nombre, value: String(c.id) })),
                { label: '➕ Crear Categoría...', value: '__add_custom__' }
              ]}
            />
            {!isCreatingCustom && (
              <button 
                type="button" 
                onClick={() => setIsCreatingCustom(true)}
                className="text-xs text-left text-gray-500 hover:text-black font-semibold mt-1.5 self-start underline decoration-dotted transition-colors"
                id="btn-add-custom-cat"
              >
                + ¿Agregar otra categoría personalizada?
              </button>
            )}
          </div>

          {isCreatingCustom && (
            <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Crear Categoría Personalizada ({formData.tipo})</h4>
              <div className="flex gap-2 items-end">
                <Input 
                  placeholder="Ej. Suscripciones o Regalos" 
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleCreateCustomCategory} 
                  disabled={isCreatingCatLoading || !newCatName.trim()}
                  className="h-[42px] px-4"
                >
                  {isCreatingCatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => { setIsCreatingCustom(false); setNewCatName(''); }}
                  className="h-[42px] px-3"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <Input 
            label="Fecha"
            type="date"
            value={formData.fecha_transaccion}
            onChange={e => setFormData({...formData, fecha_transaccion: e.target.value})}
            required
          />
        </div>

        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-700">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Asistente de IA</span>
            </div>
            <Button 
              type="button" 
              variant="secondary" 
              className="py-1 px-3 text-xs bg-white"
              onClick={handleAiCategorize}
              disabled={isAiLoading || !formData.descripcion}
            >
              {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sugerir Categoría'}
            </Button>
          </div>
          
          {formData.categoria_ia ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-purple-600 font-medium">La IA sugiere:</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold ring-1 ring-purple-200">
                {formData.categoria_ia}
              </span>
              {formData.etiquetas_ia.map(tag => (
                <span key={tag} className="text-[10px] bg-white text-purple-500 px-1.5 py-0.5 rounded font-bold border border-purple-100 uppercase">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-purple-400 font-medium">Usa la IA para clasificar automáticamente tus gastos y obtener mejores reportes.</p>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded-lg border border-red-100">
            {error}
          </p>
        )}

        <div className="flex gap-4 pt-4">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1">
            <Save className="w-4 h-4" /> Guardar Transacción
          </Button>
        </div>
      </form>
    </Card>
  );
}
