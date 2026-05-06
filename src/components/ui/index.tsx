import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) {
  return (
    <div id={id} className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Button({ children, className, id, onClick, variant = 'primary', disabled, type = 'button' }: { 
  children: React.ReactNode, 
  className?: string, 
  id?: string, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
  disabled?: boolean,
  type?: 'button' | 'submit'
}) {
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-white text-black border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn("px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2", variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function Input({ id, label, type = 'text', value, onChange, placeholder, className, required }: {
  id?: string,
  label?: string,
  type?: string,
  value?: string | number,
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
  placeholder?: string,
  className?: string,
  required?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-gray-400"
      />
    </div>
  );
}

export function Select({ id, label, value, onChange, options, className }: {
  id?: string,
  label?: string,
  value?: string | number,
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void,
  options: { label: string, value: string | number }[],
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all cursor-pointer"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}
