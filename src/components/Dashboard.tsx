import React from 'react';
import { useAppStore } from '../lib/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Cell
} from 'recharts';
import { Card } from './ui';
import { TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export function Dashboard() {
  const { transactions, user } = useAppStore();

  const totalIncome = transactions
    .filter(t => t.tipo === 'ingreso')
    .reduce((sum, t) => sum + Number(t.monto), 0);
  
  const totalExpense = transactions
    .filter(t => t.tipo === 'gasto')
    .reduce((sum, t) => sum + Number(t.monto), 0);

  const balance = totalIncome - totalExpense;

  const categoryData = Object.values(
    transactions
      .filter(t => t.tipo === 'gasto')
      .reduce((acc: any, t) => {
        const cat = t.categoria_nombre || 'Sin categoría';
        if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
        acc[cat].value += Number(t.monto);
        return acc;
      }, {})
  ).sort((a: any, b: any) => b.value - a.value);

  const trendData = [...Array(6)].map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('es', { month: 'short' });
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

    return { name: month, ingresos: monthlyIncome, gastos: monthlyExpense };
  });

  const COLORS = ['#000000', '#4A4A4A', '#828282', '#A3A3A3', '#D1D1D1'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-black text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-white/60 text-sm font-medium">Balance Total</p>
          <h2 className="text-3xl font-bold tracking-tighter mt-1">{balance.toLocaleString()} {user?.moneda}</h2>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded">+12%</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">Ingresos Totales</p>
          <h2 className="text-3xl font-bold tracking-tighter mt-1">{totalIncome.toLocaleString()} {user?.moneda}</h2>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded">-4%</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">Gastos Totales</p>
          <h2 className="text-3xl font-bold tracking-tighter mt-1">{totalExpense.toLocaleString()} {user?.moneda}</h2>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Tendencia de 6 Meses</h3>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-black rounded-full" /> Ingresos</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-gray-300 rounded-full" /> Gastos</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="ingresos" stroke="#000" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="gastos" stroke="#D1D1D1" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">Gastos por Categoría</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666', fontWeight: 600 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#F5F5F5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
