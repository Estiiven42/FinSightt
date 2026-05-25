import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/api';
import api from '../lib/api';
import { Button, Input, Card } from './ui';
import { LogIn, UserPlus, Wallet, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ nombre: '', correo: '', contrasena: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const token = useAppStore(state => state.token);
  const setAuth = useAppStore(state => state.setAuth);
  const navigate = useNavigate();

  // Handle automatic redirect if token is already or newly set
  useEffect(() => {
    if (token) {
      console.log("[Auth Debug] Auth Token exists. Redirecting to home: /");
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    console.log("[Auth Debug] Auth submit triggered. Form data e-mail:", formData.correo);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      console.log(`[Auth Debug] Login request started on ${endpoint}...`);
      const res = await api.post(endpoint, formData);
      console.log("[Auth Debug] Login response received successfully:", res.data?.user ? "User present" : "No user");
      
      console.log("[Auth Debug] Zustand state being updated via setAuth...");
      setAuth(res.data.user, res.data.token);
      console.log("[Auth Debug] Token persisted and authentication completed. Immediate redirect initiated.");
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error("[Auth Debug] Auth request execution failed:", err);
      setError(err.response?.data?.error || 'Error de autenticación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    console.log("[Auth Debug] Google sign-in flow triggered by user interaction.");
    try {
      const res = await api.get('/auth/google/url');
      const authUrl = res.data.url;
      console.log("[Auth Debug] Received Google oauth URL:", authUrl);

      // Open OAuth provider directly in a popup window centered on user's screen
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      console.log("[Auth Debug] Attempting to open popup at centered position:", { left, top, width, height });
      const authWindow = window.open(
        authUrl,
        'google_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!authWindow) {
        console.warn("[Auth Debug] Popup window creation blocked.");
        setError('El bloqueador de popups impidió abrir Google. Habilite los popups en su navegador.');
      } else {
        console.log("[Auth Debug] Google sign-in popup window spawned successfully.");
      }
    } catch (err: any) {
      console.error("[Auth Debug] Failed to request Google authenticate URL:", err);
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        'No se pudo conectar con el inicio de sesión de Google. ¿Está configurado?'
      );
    }
  };

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Security: Validate source origin (allow Run.app, Render, and localhost)
      const origin = event.origin;
      console.log("[Auth Debug] Heard message from origin:", origin);
      const isValid = 
        origin.endsWith('.run.app') || 
        origin.endsWith('.onrender.com') || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('https://localhost');
      if (!isValid) {
        console.warn("[Auth Debug] Refused message from untrusted external origin:", origin);
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { user, token } = event.data.payload;
        console.log("[Auth Debug] OAuth channel success. Proceeding with setAuth configuration...");
        setAuth(user, token);
        console.log("[Auth Debug] Initialization of Zustand session completed. Immediate redirect initiated.");
        navigate('/', { replace: true });
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        console.error("[Auth Debug] OAuth channel failure event reported:", event.data.error);
        setError(event.data.error || 'Fallo de autenticación con Google.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [setAuth, navigate]);

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

            <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                </span>
              ) : isLogin ? (
                <><LogIn className="w-4 h-4" /> Iniciar Sesión</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Crear Cuenta</>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-500 font-medium">O continúa con</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all shadow-sm cursor-pointer"
          >
            <GoogleIcon />
            {isLogin ? "Iniciar sesión con Google" : "Registrarse con Google"}
          </button>

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
