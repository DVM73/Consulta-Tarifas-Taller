
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import LoginScreen from './components/LoginScreen';
import { User, AppData } from './types';
import { getAppData } from './services/dataService';
import { AppContext } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';

// Importación Lazy para optimizar carga y evitar ciclos
const UserDashboard = React.lazy(() => import('./components/UserDashboard'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const SupervisorDashboard = React.lazy(() => import('./components/SupervisorDashboard'));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const initData = async () => {
        try {
            console.log("🚀 Iniciando carga de datos...");
            const data = await getAppData();
            setAppData(data);
            setLoading(false);
        } catch (error: any) {
            console.error("❌ Error crítico:", error);
            setLoadError(error?.message || "Error desconocido al cargar datos.");
            setLoading(false);
        }
    };

    initData();

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    const safetyTimer = setTimeout(() => {
        setLoading((currentLoading) => {
            if (currentLoading) {
                console.warn("⚠️ Tiempo de carga excedido. Forzando inicio.");
                return false;
            }
            return currentLoading;
        });
    }, 4000);

    return () => clearTimeout(safetyTimer);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };
  
  const handleLogout = () => {
    setUser(null);
  };

  const contextValue = useMemo(() => ({
      theme,
      toggleTheme,
      user,
      logout: handleLogout,
      appData
  }), [theme, user, appData]);
  
  const LoadingFallback = () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-brand-600 dark:text-brand-400 font-bold text-xs tracking-widest uppercase animate-pulse">Cargando Módulo...</p>
        </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center animate-fade-in">
                    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-widest animate-pulse">Iniciando Sistema...</p>
                </div>
            </div>
        );
    }

    if (loadError && !appData) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-red-50 dark:bg-red-950/20 p-10">
                <div className="text-center max-w-lg glass-panel p-8 rounded-2xl">
                    <h1 className="text-red-600 dark:text-red-400 font-bold text-xl mb-4">Error de Inicio</h1>
                    <p className="text-red-800 dark:text-red-300 mb-6">{loadError}</p>
                    <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-colors">Reintentar</button>
                </div>
            </div>
        );
    }

    if (!user) {
        return <LoginScreen onLogin={handleLogin} appData={appData} />;
    }

    return (
        <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
                {user.rol === 'admin' && <AdminDashboard />}
                {user.rol === 'Supervisor' && <SupervisorDashboard />}
                {user.rol !== 'admin' && user.rol !== 'Supervisor' && <UserDashboard />}
            </Suspense>
        </ErrorBoundary>
    );
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-screen w-screen overflow-hidden flex flex-col font-sans selection:bg-brand-500/30">
        {renderContent()}
      </div>
    </AppContext.Provider>
  );
};

export default App;
