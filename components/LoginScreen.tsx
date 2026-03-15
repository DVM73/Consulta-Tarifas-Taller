
import React, { useState, useEffect } from 'react';
import { User, AppData } from '../types';
import LockIcon from './icons/LockIcon';
import UserIcon from './icons/UserIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import ChatIcon from './icons/ChatIcon';
import { APP_VERSION } from '../constants';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  appData: AppData | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, appData }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'error' | 'ready' | 'local'>('loading');
  
  useEffect(() => {
    if (appData) {
        const isLocalMode = !process.env.FIREBASE_API_KEY || appData.companyName?.includes('(DEMO)');
        setConnectionStatus(isLocalMode ? 'local' : 'ready');
    } else {
        const timer = setTimeout(() => {
            setConnectionStatus('error');
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [appData]);

  const companyName = appData?.companyName || 'Cargando Sistema...';
  const lastUpdatedText = appData?.lastUpdated || 'Conectando con la nube...';
  // Aseguramos que sea un array, incluso si es undefined
  const users = appData?.users || [];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Introduce tus credenciales');
      return;
    }

    // 1. INTENTAR LOGIN NORMAL CONTRA BASE DE DATOS (Prioridad)
    // Buscamos si existe el usuario en la lista cargada
    const foundUser = users.find(u => 
      String(u.nombre).trim().toLowerCase() === username.trim().toLowerCase() && 
      String(u.clave) === password
    );

    if (foundUser) {
        onLogin(foundUser);
        return;
    }

    // 2. LOGIN DE EMERGENCIA / CONFIGURACIÓN INICIAL
    // Esta puerta trasera SOLO se abre si NO hay usuarios en la base de datos.
    // Una vez creado el primer usuario, esta condición (users.length === 0) será falsa y el acceso se bloqueará.
    if (users.length === 0 && username === 'admin' && password === 'admin') {
         const tempAdminUser: User = {
             id: 'admin-init', // ID temporal
             nombre: 'admin',
             clave: 'admin',
             zona: 'OFI',
             grupo: 'Admin',
             departamento: 'Supervisor',
             rol: 'admin',
             verPVP: true
         };
         console.warn("⚠️ Acceso concedido mediante credenciales de inicialización (DB vacía).");
         onLogin(tempAdminUser);
         return;
    }

    setError('Usuario o contraseña incorrectos');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-500/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] glass-panel rounded-3xl overflow-hidden animate-scale-in p-10 relative z-10 border-white/40 dark:border-slate-700/40">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 text-brand-600 dark:text-brand-400 mb-6 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/20 rounded-3xl flex items-center justify-center shadow-inner group cursor-pointer transition-all duration-500 hover:rotate-6">
             <ChatIcon className="w-10 h-10 stroke-[1.5] transition-transform duration-500 group-hover:scale-110" />
          </div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-brand-600 via-slate-800 to-brand-600 dark:from-brand-400 dark:via-white dark:to-brand-400 bg-clip-text text-transparent text-center leading-tight mb-3 animate-gradient-x">
            {companyName}
          </h1>
          <div className="vibrant-gradient px-4 py-1.5 rounded-full text-[10px] font-black mb-4 uppercase tracking-[0.2em] shadow-lg shadow-brand-500/20 border border-white/20">
            v{APP_VERSION}
          </div>
          
          {connectionStatus === 'error' && (
               <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs text-center border border-red-100 dark:border-red-800/50 mb-2 w-full">
                  <strong>⚠️ Error de Carga</strong><br/>
                  No se han podido cargar los datos iniciales.
              </div>
          )}

          {/* Indicador visual de modo Setup */}
          {users.length === 0 && connectionStatus !== 'loading' && (
              <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 p-2 rounded text-[10px] font-bold uppercase tracking-wide border border-blue-100 dark:border-blue-800 mb-2 w-full text-center">
                  Modo Configuración Inicial Activo
              </div>
          )}
          
          {connectionStatus === 'ready' && users.length > 0 && (
               <p className="text-slate-500 dark:text-slate-400 text-sm">Inicia sesión en tu cuenta</p>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Usuario</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <UserIcon className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                className="block w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-3 text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all bg-white/50 dark:bg-slate-800/50 dark:text-white backdrop-blur-sm"
                placeholder={users.length === 0 ? "admin" : "usuario"}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Contraseña</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <LockIcon className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="block w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all bg-white/50 dark:bg-slate-800/50 dark:text-white backdrop-blur-sm"
                placeholder={users.length === 0 ? "admin" : "contraseña"}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-brand-500 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg border border-red-100 dark:border-red-500/20 animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={connectionStatus === 'loading'}
            className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed mt-4"
          >
            {connectionStatus === 'loading' ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800/50 pt-6">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium mb-1 tracking-wide">
            Datos: {lastUpdatedText}
          </p>
        </div>
      </div>
      <div className="fixed bottom-4 right-4 text-slate-400 dark:text-slate-600 text-[10px] uppercase tracking-widest font-bold pointer-events-none">
        By Daniel Vázquez Medina
      </div>
    </div>
  );
};

export default LoginScreen;
