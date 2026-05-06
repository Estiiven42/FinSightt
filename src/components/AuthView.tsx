import React, { useState } from 'react';
import { useAppStore } from '../lib/api';
import api from '../lib/api';
import { Button, Input, Card } from './ui';
import { LogIn, UserPlus, Wallet } from 'lucide-react';
import { motion } from 'motion/react';

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ nombre: '', correo: '', contrasena: '' });
  const setAuth = useAppStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await api.post(endpoint, formData);
      setAuth(res.data.user, res.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">FinSight</h1>
              <p className="text-gray-500 text-sm">Tu inteligencia financiera personal</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <Input
                label="Nombre"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            )}
            <Input
              label="Correo Electrónico"
              placeholder="correo@ejemplo.com"
              type="email"
              value={formData.correo}
              onChange={e => setFormData({ ...formData, correo: e.target.value })}
              required
            />
            <Input
              label="Contraseña"
              placeholder="••••••••"
              type="password"
              value={formData.contrasena}
              onChange={e => setFormData({ ...formData, contrasena: e.target.value })}
              required
            />

            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

            <Button type="submit" className="w-full mt-4">
              {isLogin ? (
                <><LogIn className="w-4 h-4" /> Iniciar Sesión</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Crear Cuenta</>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6 font-medium">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-black ml-1 hover:underline font-bold"
            >
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
