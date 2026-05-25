import React, { useState } from 'react';
import { useAppStore } from '../lib/api';
import { Card, Button, Input, Select } from './ui';
import { Loader2, Sparkles, ArrowLeft, Save, AlertCircle, Bookmark, Check } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { formatCurrencyCOP } from '../lib/theme';

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
      
      // Update global Zustand store with newly created category
      useAppStore.setState(state => ({
        categories: [...state.categories, res.data]
      }));

      // Auto-select the newly created category
      setFormData(prev => ({ ...prev, categoria_id: String(res.data.id) }));
      setNewCatName('');
      setIsCreatingCustom(false);
    } catch (err) {
      console.error("Failed to create custom category:", err);
      setError('No se pudo guardar la categoría personalizada.');
    }
    setIsCreatingCatLoading(false);
  };

  const handleAiCategorize = async () => {
    if (!formData.descripcion || !formData.monto) {
      setError('Por favor ingresa una descripción y un monto para que la IA sugiera una categoría.');
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
      setError('Error de comunicación con Gemini AI. Inténtalo de nuevo.');
    }
    setIsAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      setError('Por favor ingresa una descripción para continuar.');
      return;
    }
    const numericMonto = Number(formData.monto);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      setError('El monto monetario debe ser un número positivo mayor que cero.');
      return;
    }
    if (!formData.categoria_id) {
      setError('Por favor selecciona una categoría de destino.');
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
      setError('No se pudo guardar el registro del movimiento.');
    }
  };

  const isIngreso = formData.tipo === 'ingreso';

  return (
    <Card className="p-8 max-w-2xl mx-auto border border-gray-100 shadow-xl shadow-gray-200/50 bg-white rounded-3xl animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onCancel} 
          type="button" 
          className="p-2 hover:bg-gray-50 rounded-xl border border-gray-100 transition-all text-gray-500 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Nuevo Registro Financiero</h2>
          <p className="text-xs text-gray-500 mt-0.5">Ingresa los datos para actualizar tu balance en COP</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TIPO DE MOVIMIENTO SELECTOR */}
        <div className="flex bg-gray-100 p-1 rounded-2xl w-full">
          <button
            type="button"
            onClick={() => setFormData({...formData, tipo: 'gasto', categoria_id: ''})}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              formData.tipo === 'gasto'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/15'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Gasto / Egreso
          </button>
          <button
            type="button"
            onClick={() => setFormData({...formData, tipo: 'ingreso', categoria_id: ''})}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              formData.tipo === 'ingreso'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/15'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Ingreso / Entrada
          </button>
        </div>

        {/* INPUTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <Input 
              label="Descripción del Movimiento" 
              placeholder="Ej. Mercado semanal o Consultoría" 
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              required
            />
          </div>

          <div className="space-y-1">
            <Input 
              label="Monto (Pesos COP)" 
              type="number" 
              placeholder="Ej. 1250000" 
              value={formData.monto}
              onChange={e => setFormData({...formData, monto: e.target.value})}
              required
            />
            {/* LIVE MONETARY ESTIMATION UX */}
            {formData.monto && !isNaN(Number(formData.monto)) && (
              <p className="text-[11px] text-indigo-600 font-extrabold font-mono mt-1 bg-indigo-50/50 p-1.5 px-3.5 border border-indigo-100/50 rounded-xl leading-relaxed select-none animate-fadeIn flex items-center gap-1.5">
                <Bookmark className="w-3 h-3 text-indigo-500 shrink-0" />
                Valor a registrar: <strong className="text-indigo-700">{formatCurrencyCOP(formData.monto)}</strong>
              </p>
            )}
          </div>

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
                className="text-[11px] text-left text-gray-500 hover:text-indigo-600 font-bold mt-2 self-start underline decoration-dotted transition-colors cursor-pointer"
                id="btn-add-custom-cat"
              >
                + ¿Agregar otra categoría personalizada?
              </button>
            )}
          </div>

          <Input 
            label="Fecha del Movimiento"
            type="date"
            value={formData.fecha_transaccion}
            onChange={e => setFormData({...formData, fecha_transaccion: e.target.value})}
            required
          />
        </div>

        {/* CUSTOM CATEGORY ADDER */}
        {isCreatingCustom && (
          <div className="p-4 bg-gray-50 border border-gray-200/70 rounded-2xl space-y-3 animate-fadeIn">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Crear Categoría Personalizada ({formData.tipo})</h4>
            <div className="flex gap-2.5 items-end">
              <div className="flex-1">
                <Input 
                  placeholder="Ej. Membresías, Gimnasio, Mascotas..." 
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Button 
                onClick={handleCreateCustomCategory} 
                disabled={isCreatingCatLoading || !newCatName.trim()}
                type="button"
                className="h-[42px] px-5 text-xs font-black bg-gray-950 hover:bg-gray-800 text-white rounded-xl"
              >
                {isCreatingCatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
              <Button 
                variant="ghost" 
                type="button"
                onClick={() => { setIsCreatingCustom(false); setNewCatName(''); }}
                className="h-[42px] px-3.5 text-xs text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* COMPONENTE ASISTENTE IA EN MEDIO DEL REGISTRO */}
        <div className="p-5 bg-gradient-to-tr from-purple-500/5 to-indigo-500/5 rounded-2xl border border-indigo-100 space-y-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
          
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5 fill-indigo-200" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider block">Optimización por IA</span>
                <span className="text-[10px] text-gray-400 font-semibold block">Delega categorización y tags automáticos</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="secondary" 
              className="py-1.5 px-3.5 text-[10px] font-black bg-white select-none shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all border border-indigo-100 text-indigo-700 cursor-pointer"
              onClick={handleAiCategorize}
              disabled={isAiLoading || !formData.descripcion}
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1.5 fill-indigo-100" />
                  Sugerir con Gemini
                </>
              )}
            </Button>
          </div>
          
          {formData.categoria_ia ? (
            <div className="bg-white/70 backdrop-blur-sm p-3 rounded-xl border border-indigo-100/50 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wide">Clasificación Recomendada:</span>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-0.5 uppercase">
                  <Check className="w-3 h-3" />
                  {formData.categoria_ia}
                </span>
              </div>
              {formData.etiquetas_ia.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.etiquetas_ia.map(tag => (
                    <span key={tag} className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-bold tracking-tight uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-indigo-500/70 font-semibold leading-relaxed">
              Completa la descripción y haz clic en "Sugerir con Gemini" para habilitar el etiquetado inteligente de tags.
            </p>
          )}
        </div>

        {/* ERROR ANNOTATIONS */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 font-bold">{error}</p>
          </div>
        )}

        {/* FORM ACTIONS */}
        <div className="flex gap-4 pt-4 border-t border-gray-100">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            className="flex-1 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl py-3 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="flex-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/10 text-white rounded-xl py-3 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Registrar Movimiento
          </Button>
        </div>
      </form>
    </Card>
  );
}
