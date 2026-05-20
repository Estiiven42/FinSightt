import React, { useState } from 'react';
import { useAppStore } from '../lib/api';
import { Card, Button, Input, Select, cn } from './ui';
import { Plus, Target, AlertTriangle } from 'lucide-react';

export function Budgets() {
  const { budgets, categories, transactions, addBudget } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
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
    if (!formData.categoria_id) return;
    await addBudget({
      ...formData,
      categoria_id: Number(formData.categoria_id),
      monto_limite: Number(formData.monto_limite)
    });
    setIsAdding(false);
  };

  const months = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Presupuestos Mensuales</h2>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4" /> Definir Presupuesto
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 bg-gray-50">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Select 
              label="Categoría"
              value={formData.categoria_id}
              onChange={e => setFormData({...formData, categoria_id: e.target.value})}
              options={[
                { label: 'Seleccionar...', value: '' },
                ...categories.filter(c => c.tipo === 'gasto').map(c => ({ label: c.nombre, value: c.id }))
              ]}
            />
            <Input 
              label="Monto Límite"
              type="number"
              value={formData.monto_limite}
              onChange={e => setFormData({...formData, monto_limite: e.target.value})}
            />
            <Select 
              label="Mes"
              value={formData.mes}
              onChange={e => setFormData({...formData, mes: Number(e.target.value)})}
              options={months}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(budget => {
          const spent = getSpentAmount(budget.categoria_id, budget.mes, budget.anio);
          const percentage = (spent / budget.monto_limite) * 100;
          const isWarning = percentage >= 80;

          return (
            <Card key={budget.id} className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Target className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">{budget.categoria_nombre}</h3>
                    <p className="text-xs text-gray-500 font-medium">{months[budget.mes - 1].label} {budget.anio}</p>
                  </div>
                </div>
                {isWarning && (
                  <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    <AlertTriangle className="w-3 h-3" /> Alerta
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Gastado: <strong>{spent.toLocaleString()}</strong></span>
                  <span className="text-gray-900 font-black">Límite: {Number(budget.monto_limite).toLocaleString()}</span>
                </div>
                
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      percentage > 100 ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-black"
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-right">
                  {percentage.toFixed(1)}% Consumido
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
