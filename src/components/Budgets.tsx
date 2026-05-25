import React, { useState } from 'react';
import { useAppStore } from '../lib/api';
import { Card, Button, Input, Select, cn } from './ui';
import { Plus, Target, AlertTriangle, ShieldCheck, HelpCircle, Check, Sparkles, TrendingUp } from 'lucide-react';
import { formatCurrencyCOP } from '../lib/theme';

export function Budgets() {
  const { budgets, categories, transactions, addBudget } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    categoria_id: '',
    monto_limite: '',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear()
  });

  const getSpentAmount = (categoria_id: number, mes: number, anio: number) => {
    return transactions
      .filter(t => {
        if (Number(t.categoria_id) !== Number(categoria_id) || t.tipo !== 'gasto' || !t.fecha_transaccion) return false;
        const [y, m] = t.fecha_transaccion.split('T')[0].split('-').map(Number);
        return m === mes && y === anio;
      })
      .reduce((sum, t) => sum + Number(t.monto), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoria_id) {
      setErrorMsg('Por favor selecciona una categoría.');
      return;
    }
    const limit = Number(formData.monto_limite);
    if (!formData.monto_limite || isNaN(limit) || limit <= 0) {
      setErrorMsg('Por favor ingresa un monto límite mayor a cero.');
      return;
    }
    
    setErrorMsg('');
    try {
      await addBudget({
        ...formData,
        categoria_id: Number(formData.categoria_id),
        monto_limite: limit
      });
      setIsAdding(false);
      setFormData(prev => ({ ...prev, categoria_id: '', monto_limite: '' }));
    } catch (err: any) {
      setErrorMsg('Ocurrió un error al registrar el presupuesto.');
    }
  };

  const months = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Control de Presupuestos</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Define límites para tus metas de consumo en COP y evita sobresaltos</p>
        </div>
        <Button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-bold bg-gray-950 hover:bg-gray-800 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 select-none shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> 
          {isAdding ? 'Cerrar Formulario' : 'Definir Presupuesto'}
        </Button>
      </div>

      {/* DEFINE BUDGET TRIGGER BLOCK */}
      {isAdding && (
        <Card className="p-6 bg-gray-50/50 border border-gray-150 rounded-2xl shadow-xl shadow-gray-200/25">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Crear Presupuesto Mensual</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <Select 
                label="Categoría de Gasto"
                value={formData.categoria_id}
                onChange={e => setFormData({...formData, categoria_id: e.target.value})}
                options={[
                  { label: 'Seleccionar categoría...', value: '' },
                  ...categories.filter(c => c.tipo === 'gasto').map(c => ({ label: c.nombre, value: c.id }))
                ]}
              />
              <Input 
                label="Monto Límite (COP)"
                placeholder="Ej. 500000"
                type="number"
                value={formData.monto_limite}
                onChange={e => setFormData({...formData, monto_limite: e.target.value})}
              />
              <Select 
                label="Mes de Cobertura"
                value={formData.mes}
                onChange={e => setFormData({...formData, mes: Number(e.target.value)})}
                options={months}
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs py-3 cursor-pointer">
                  Guardar
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 text-xs py-3 text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg font-semibold">{errorMsg}</p>
            )}
          </form>
        </Card>
      )}

      {/* BUDGET CARDS CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(budget => {
          const spent = getSpentAmount(budget.categoria_id, budget.mes, budget.anio);
          const limit = Number(budget.monto_limite);
          const percentage = limit > 0 ? (spent / limit) * 100 : 0;

          // Compute alert flags and styling definitions
          const hasOverspent = percentage > 100;
          const isWarning = percentage >= 80 && percentage <= 100;
          const isSafe = percentage < 80;

          return (
            <Card 
              key={budget.id} 
              className={cn(
                "p-6 border bg-white rounded-3xl shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-xl",
                hasOverspent 
                  ? "border-rose-200/70 shadow-rose-50/20 bg-rose-50/5" 
                  : isWarning 
                  ? "border-amber-200/70 shadow-amber-50/20 bg-amber-50/5" 
                  : "border-gray-100 shadow-gray-100/30"
              )}
            >
              <div className="flex justify-between items-start mb-5 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl border flex items-center justify-center shadow-sm",
                    hasOverspent 
                      ? "bg-rose-50 border-rose-100 text-rose-600" 
                      : isWarning 
                      ? "bg-amber-50 border-amber-100 text-amber-600" 
                      : "bg-gray-50 border-gray-100 text-gray-600"
                  )}>
                    <Target className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm select-all">{budget.categoria_nombre}</h3>
                    <p className="text-[10px] text-gray-400 font-extrabold tracking-wide uppercase mt-0.5">
                      {months[budget.mes - 1].label} {budget.anio}
                    </p>
                  </div>
                </div>

                {/* STATUS BADGES */}
                {hasOverspent ? (
                  <div className="flex items-center gap-1.5 text-[9px] text-rose-700 bg-rose-100/70 border border-rose-150 px-2.5 py-1 rounded-full font-black uppercase tracking-wider select-none animate-pulse">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> Superado
                  </div>
                ) : isWarning ? (
                  <div className="flex items-center gap-1.5 text-[9px] text-amber-700 bg-amber-100/70 border border-amber-150 px-2.5 py-1 rounded-full font-black uppercase tracking-wider select-none">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> Límite
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[9px] text-emerald-700 bg-emerald-100/70 border border-emerald-150 px-2.5 py-1 rounded-full font-black uppercase tracking-wider select-none">
                    <ShieldCheck className="w-3 h-3 shrink-0" /> Controlado
                  </div>
                )}
              </div>

              {/* PROGRESS BAR & QUANTITY INFO */}
              <div className="space-y-4">
                
                {/* LABELS WITH PESO VALUES */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold uppercase text-[9px]">Gasto Efectuado</span>
                    <span className="text-gray-400 font-bold uppercase text-[9px]">Presupuestado</span>
                  </div>
                  <div className="flex justify-between items-end gap-2">
                    <span className={cn(
                      "text-sm font-black font-mono tracking-tight",
                      hasOverspent ? "text-rose-600" : isWarning ? "text-amber-600" : "text-gray-900"
                    )}>
                      {formatCurrencyCOP(spent)}
                    </span>
                    <span className="text-xs font-extrabold text-gray-400 font-mono">
                      {formatCurrencyCOP(budget.monto_limite)}
                    </span>
                  </div>
                </div>
                
                {/* METERS */}
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      hasOverspent 
                        ? "bg-gradient-to-r from-rose-500 to-rose-600 shadow-sm shadow-rose-300" 
                        : isWarning 
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm shadow-amber-300" 
                        : "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-300"
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="font-semibold">
                    {hasOverspent 
                      ? `Excedido por ${formatCurrencyCOP(spent - limit)}` 
                      : `Disponible: ${formatCurrencyCOP(limit - spent)}`
                    }
                  </span>
                  <span className="font-black font-mono">
                    {percentage.toFixed(1)}% Usado
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
        
        {/* FALLBACK IN CASE OF EMPTY DATAS */}
        {budgets.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400 max-w-md mx-auto">
            <Card className="p-8 border-dashed flex flex-col items-center justify-center gap-4 bg-gray-50/30">
              <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Target className="w-8 h-8 text-gray-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">No hay presupuestos activos</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-[240px]">Haga clic en 'Definir Presupuesto' para establecer límites de consumo inteligente por categoría.</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
