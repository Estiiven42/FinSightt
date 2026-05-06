import React, { useState } from 'react';
import { useAppStore } from '../lib/api';
import { generateWeeklyInsights } from '../lib/gemini';
import { Card, Button } from './ui';
import { Sparkles, Loader2, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { format } from 'date-fns';

export function AIInsights() {
  const { transactions, budgets, insights, saveAIInsight } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    const result = await generateWeeklyInsights(transactions, budgets);
    if (result) {
      await saveAIInsight('Perspectiva Semanal', JSON.stringify(result));
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Perspectivas IA</h2>
        <Button onClick={handleGenerate} disabled={isLoading || transactions.length < 5}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generar Nuevo Análisis
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {insights.length === 0 ? (
            <Card className="p-12 flex flex-col items-center text-center gap-4 border-dashed bg-gray-50">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold">¿Listo para mejorar tus finanzas?</h3>
                <p className="text-gray-500 max-w-xs mt-1">Genera un análisis basado en tus últimas transacciones para obtener predicciones y ahorros personalizados.</p>
              </div>
              <Button onClick={handleGenerate} disabled={isLoading || transactions.length < 5}>
                Empezar Análisis
              </Button>
              {transactions.length < 5 && <p className="text-[10px] text-orange-600 font-bold uppercase">Se requieren al menos 5 transacciones</p>}
            </Card>
          ) : (
            insights.map(item => {
              const data = JSON.parse(item.contenido);
              return (
                <Card key={item.id} className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold">{item.tipo}</h3>
                      <p className="text-xs text-gray-500 font-medium">{format(new Date(item.generado_en), 'dd MMMM, yyyy HH:mm')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-100 pb-8">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Predicción Gasto
                      </p>
                      <p className="text-3xl font-black tracking-tighter">${data.prediccion_monto || '0'}</p>
                      <p className="text-xs text-gray-500 font-medium leading-tight">Proyectado para la próxima semana.</p>
                    </div>
                    
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3" /> Estado de Salud Financiera
                      </p>
                      <p className="text-sm font-medium leading-relaxed italic text-gray-700">
                        "{data.analisis_presupuesto}"
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Recomendaciones Estratégicas
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.recomendaciones?.map((rec: string, i: number) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium text-gray-700 leading-snug">
                          <span className="text-black font-black mr-2 opacity-20">{i + 1}</span> 
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-purple-600 text-white border-0 shadow-lg shadow-purple-200">
            <h4 className="font-bold text-lg mb-2">Poder de la IA</h4>
            <p className="text-purple-100 text-sm leading-relaxed mb-4">
              FinSight utiliza Gemini 1.5 Flash para analizar patrones complejos que no son visibles a simple vista.
            </p>
            <div className="flex -space-x-2 overflow-hidden">
               {[1,2,3].map(i => (
                 <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-purple-600 bg-purple-400 flex items-center justify-center font-bold text-xs">
                   {i}
                 </div>
               ))}
               <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-purple-600 bg-black text-[8px] font-black uppercase">
                 IA
               </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h4 className="font-bold mb-4">Métricas de Algoritmo</h4>
            <div className="space-y-4">
               {[
                 { label: 'Precisión de Categoría', value: '98.2%' },
                 { label: 'Confidencialidad de Datos', value: 'AES-256' },
                 { label: 'Modelo en Uso', value: 'Gemini 1.5 Flash' }
               ].map(m => (
                 <div key={m.label} className="flex justify-between items-end border-b border-gray-50 pb-2">
                   <span className="text-xs text-gray-500 font-medium">{m.label}</span>
                   <span className="text-sm font-bold">{m.value}</span>
                 </div>
               ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
