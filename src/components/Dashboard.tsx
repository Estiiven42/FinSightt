import React from 'react';
import { useAppStore } from '../lib/api';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Card } from './ui';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  BadgeAlert,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatCurrencyCOP, THEME_COLORS } from '../lib/theme';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { transactions, user } = useAppStore();
  const navigate = useNavigate();

  // Financial calculations
  const totalIncome = transactions
    .filter(t => t.tipo === 'ingreso')
    .reduce((sum, t) => sum + Number(t.monto), 0);
  
  const totalExpense = transactions
    .filter(t => t.tipo === 'gasto')
    .reduce((sum, t) => sum + Number(t.monto), 0);

  const balance = totalIncome - totalExpense;

  // Process category statistics for expenditures
  const categoryDataRaw = transactions
    .filter(t => t.tipo === 'gasto')
    .reduce((acc: any, t) => {
      const cat = t.categoria_nombre || t.categoria_ia || 'Sin categoría';
      if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
      acc[cat].value += Number(t.monto);
      return acc;
    }, {});

  const categoryData = Object.values(categoryDataRaw)
    .sort((a: any, b: any) => b.value - a.value) as { name: string; value: number }[];

  const topCategories = categoryData.slice(0, 5);

  // Parse transaction trends for the past 6 months
  const trendData = [...Array(6)].map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('es-CO', { month: 'short' });
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    
    const monthlyIncome = transactions
      .filter(t => {
        if (!t.fecha_transaccion) return false;
        const [y, m] = t.fecha_transaccion.split('T')[0].split('-').map(Number);
        return (m - 1) === monthIndex && y === year && t.tipo === 'ingreso';
      })
      .reduce((sum, t) => sum + Number(t.monto), 0);

    const monthlyExpense = transactions
      .filter(t => {
        if (!t.fecha_transaccion) return false;
        const [y, m] = t.fecha_transaccion.split('T')[0].split('-').map(Number);
        return (m - 1) === monthIndex && y === year && t.tipo === 'gasto';
      })
      .reduce((sum, t) => sum + Number(t.monto), 0);

    return { 
      name: month.toUpperCase().replace('.', ''), 
      ingresos: monthlyIncome, 
      gastos: monthlyExpense 
    };
  });

  // Calculate percentage ratios
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Custom tooltips with clear typography and es-CO support
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 space-y-2 text-xs font-sans">
          <p className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            Mes: {label}
          </p>
          <div className="space-y-1">
            <p className="flex justify-between items-center gap-6 font-bold text-emerald-600">
              <span>Ingresos:</span>
              <span className="font-mono">{formatCurrencyCOP(payload[0].value)}</span>
            </p>
            <p className="flex justify-between items-center gap-6 font-bold text-rose-600">
              <span>Gastos:</span>
              <span className="font-mono">{formatCurrencyCOP(payload[1].value)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 text-xs font-sans">
          <p className="font-bold text-gray-900 mb-1 capitalize">{data.name}</p>
          <p className="flex items-center gap-2 text-rose-600 font-extrabold font-mono text-sm">
            {formatCurrencyCOP(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* SECTION 1: CARDS FINANCIERAS PREMIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD BALANCE: ESTILO TARJETA FINTCH TITANIUM */}
        <Card className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 shadow-xl shadow-indigo-950/20 text-white rounded-3xl relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
          
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm">
              <Wallet className="w-5 h-5 text-indigo-300" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full border border-indigo-400/25">
              FinSight Premium
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-indigo-200/70 text-xs font-extrabold uppercase tracking-widest">Balance Disponible</p>
            <h2 className="text-3xl font-black tracking-tight font-mono text-white select-all">
              {formatCurrencyCOP(balance)}
            </h2>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200/50">
            <span className="font-semibold">Tasa de Ahorro Neto:</span>
            <span className={`font-black font-mono px-2 py-0.5 rounded-md ${savingsRate > 20 ? 'text-emerald-400 bg-emerald-500/10' : savingsRate > 0 ? 'text-indigo-300 bg-indigo-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </Card>

        {/* CARD INGRESOS: GRADO FINANCIERO VERDE ESMERALDA */}
        <Card className="p-6 bg-white border border-gray-100 hover:border-emerald-200/70 shadow-lg shadow-gray-100/40 rounded-3xl group hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-50/50">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-emerald-700 text-xs font-extrabold bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-150">
                Ingresos
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-gray-400 text-xs font-extrabold uppercase tracking-widest">Entradas Recientes</p>
              <h2 className="text-2xl font-black tracking-tight font-mono text-emerald-600">
                {formatCurrencyCOP(totalIncome)}
              </h2>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 font-semibold mt-4 pt-4 border-t border-gray-50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Flujo positivo regularizado
          </p>
        </Card>

        {/* CARD GASTOS: ALERTA FINANCIERA ROJO CORAL */}
        <Card className="p-6 bg-white border border-gray-100 hover:border-rose-200/70 shadow-lg shadow-gray-100/40 rounded-3xl group hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 shadow-sm shadow-rose-50/50">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-rose-700 text-xs font-extrabold bg-rose-100/50 px-3 py-1 rounded-full border border-rose-150">
                Salidas
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-gray-400 text-xs font-extrabold uppercase tracking-widest">Egresos Facturados</p>
              <h2 className="text-2xl font-black tracking-tight font-mono text-rose-600">
                {formatCurrencyCOP(totalExpense)}
              </h2>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 font-semibold mt-4 pt-4 border-t border-gray-50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Gastos amortizados del mes
          </p>
        </Card>
      </div>

      {/* SECTION 2: CHARTS (TENDENCIA Y CATEGORÍAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* TENDENCIA DE 6 MESES CON GRADIENTES SUAVES */}
        <Card className="p-6 lg:col-span-3 border border-gray-100 shadow-lg shadow-gray-100/20 rounded-3xl bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-gray-900 tracking-tight text-base">Tendencias de Consumo</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Historial combinado de ingresos y gastos (2026)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> 
                <span className="text-gray-700">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" /> 
                <span className="text-gray-700">Gastos</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME_COLORS.ingreso.primary} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={THEME_COLORS.ingreso.primary} stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME_COLORS.gasto.primary} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={THEME_COLORS.gasto.primary} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }}
                />
                <Tooltip content={<CustomTrendTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke={THEME_COLORS.ingreso.primary} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorIngreso)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke={THEME_COLORS.gasto.primary} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorGasto)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* GASTOS POR CATEGORÍA COMPONENTE */}
        <Card className="p-6 lg:col-span-2 border border-gray-100 shadow-lg shadow-gray-100/20 rounded-3xl bg-white space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-gray-900 tracking-tight text-base">Gastos por Categoría</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Tus 5 focos de salida monetaria más activos</p>
          </div>

          {topCategories.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-gray-400 gap-2">
              <BadgeAlert className="w-8 h-8 text-rose-300" />
              <p className="text-xs font-semibold">Sin gastos identificados</p>
              <p className="text-[10px] text-gray-400 max-w-[180px]">Registra movimientos de tipo "gasto" para habilitar este gráfico.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#4B5563', fontWeight: '700' }} 
                    width={85} 
                  />
                  <Tooltip content={<CustomCategoryTooltip />} cursor={{ fill: '#F9FAFB' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                    {topCategories.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={THEME_COLORS.chartGastoPool[index % THEME_COLORS.chartGastoPool.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="border-t border-gray-50 pt-3 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
            <span>Financieramente controlado</span>
            <span className="text-indigo-600">Revisión IA</span>
          </div>
        </Card>
      </div>

      {/* QUICK ACCION: MOVIMIENTOS RECIENTES */}
      <Card className="p-6 border border-gray-100 shadow-lg shadow-gray-100/10 rounded-3xl bg-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-gray-900 tracking-tight text-base">Últimas Operaciones</h3>
            <p className="text-xs text-gray-400 font-medium">Bisturí de los movimientos más recientes</p>
          </div>
          <button 
            onClick={() => navigate('/transacciones')} 
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:gap-2 transition-all"
          >
            Ver todos los movimientos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {transactions.slice(0, 4).map(t => {
            const isIngreso = t.tipo === 'ingreso';
            return (
              <div key={t.id} className="py-3.5 flex justify-between items-center group transition-all">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border font-bold capitalize text-xs ${
                    isIngreso 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                      : 'text-rose-700 bg-rose-50 border-rose-100'
                  }`}>
                    {t.categoria_nombre ? t.categoria_nombre.slice(0, 3) : 'Fin'}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 select-all">{t.descripcion}</h5>
                    <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                      {t.fecha_transaccion ? t.fecha_transaccion.split('T')[0] : 'Hoy'}
                      {t.categoria_ia && (
                        <span className="text-purple-600 font-bold flex items-center gap-0.5">
                          • <Sparkles className="w-2.5 h-2.5 inline" /> IA: {t.categoria_ia}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-black font-mono tracking-tight ${
                    isIngreso ? 'text-emerald-600' : 'text-gray-900'
                  }`}>
                    {isIngreso ? '+' : '-'}{formatCurrencyCOP(t.monto)}
                  </span>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <p className="py-8 text-center text-xs text-gray-400 font-semibold">Tus transacciones recientes se listarán aquí.</p>
          )}
        </div>
      </Card>

    </div>
  );
}
