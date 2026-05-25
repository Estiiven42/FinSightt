/**
 * FinSight Fintech-Grade Visual Theme Core
 * This file centralizes colors, micro-animations, and formatters
 * that reflect a modern professional fintech application (Nequi/Nubank style).
 */

// Format numbers according to es-CO local standard, ensuring clear visual separation and no redundant decimals
export function formatCurrencyCOP(value: number | string): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (numericValue === undefined || numericValue === null || Number.isNaN(numericValue)) {
    return '$ 0 COP';
  }

  // Use es-CO number formatter
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  let formatted = formatter.format(Math.abs(numericValue));
  
  // Ensure exactly one space between the "$" symbol and the first digit
  formatted = formatted.replace(/^\$\s*/, '$ ');

  // Maintain sign context
  const sign = numericValue < 0 ? '-' : '';
  return `${sign}${formatted} COP`;
}

// Financial colors mapping
export const THEME_COLORS = {
  // ESMERALDA FINANCIERO (Ingresos)
  ingreso: {
    primary: '#10b981', // Emerald 500
    soft: '#e6f4ea',
    softBorder: '#a7f3d0', // Emerald 200
    dark: '#064e3b',
    gradient: ['#10b981', '#059669', '#34d399'],
    textClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    hoverClass: 'hover:bg-emerald-50/70'
  },
  // ROJO CORAL/ALERTA (Gastos)
  gasto: {
    primary: '#f43f5e', // Rose 500
    soft: '#fff1f2',
    softBorder: '#fecdd3', // Rose 200
    dark: '#4c0519',
    gradient: ['#f43f5e', '#e11d48', '#fb7185'],
    textClass: 'text-rose-700 bg-rose-50 border-rose-200',
    hoverClass: 'hover:bg-rose-50/70'
  },
  // AZUL FINANCIERO / MORADO PREMIUM (Balance/Total)
  balance: {
    primary: '#6366f1', // Indigo 500
    soft: '#e0e7ff',
    softBorder: '#c7d2fe', // Indigo 200
    dark: '#1e1b4b',
    gradient: ['#4f46e5', '#6366f1', '#818cf8'],
    textClass: 'text-indigo-700 bg-indigo-50 border-indigo-200'
  },
  // Secondary modern chart color pool
  chartGastoPool: [
    '#f43f5e', // Rose 500
    '#fb923c', // Orange 400
    '#f59e0b', // Amber 500
    '#fda4af', // Rose 300
    '#fed7aa'  // Orange 200
  ],
  chartIngresoPool: [
    '#10b981', // Emerald 500
    '#059669', // Emerald 600
    '#34d399', // Emerald 400
    '#6ee7b7', // Emerald 300
    '#a7f3d0'  // Emerald 200
  ]
};

export function getTransactionColor(tipo: 'ingreso' | 'gasto') {
  return THEME_COLORS[tipo];
}

export function getBalanceVariant(value: number) {
  if (value > 0) return THEME_COLORS.ingreso;
  if (value < 0) return THEME_COLORS.gasto;
  return THEME_COLORS.balance;
}
