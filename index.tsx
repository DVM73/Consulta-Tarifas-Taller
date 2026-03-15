
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log("🚀 Iniciando App v3.0.0 (Modo Híbrido)...");

const isProduction = window.location.hostname !== 'localhost' && 
                     !window.location.hostname.includes('ai.studio') && 
                     !window.location.hostname.includes('googleusercontent.com') &&
                     !window.location.hostname.includes('webcontainer.io');

// GESTIÓN AVANZADA DE SERVICE WORKER Y CACHÉ
const handleServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;

    if (isProduction) {
        // En producción real (Vercel), comportamiento normal
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('✅ SW Registrado (Prod):', reg.scope))
                .catch(err => console.warn('⚠️ Error SW:', err));
        });
    } else {
        // EN PREVIEW/DEV: LIMPIEZA NUCLEAR
        console.warn("🧹 MODO PREVIEW DETECTADO: Limpiando cachés...");
        
        // 1. Desregistrar Service Workers existentes
        const registrations = await navigator.serviceWorker.getRegistrations();
        for(let registration of registrations) {
            await registration.unregister();
            console.log("🗑️ Service Worker desvinculado.");
        }

        // 2. Borrar Caché de Almacenamiento (Cache Storage)
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => {
                console.log("🔥 Borrando caché:", name);
                return caches.delete(name);
            }));
        }
        
        console.log("✨ Entorno limpio. La app debería cargar fresca.");
    }
};

handleServiceWorker();

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("❌ Error: No se encontró el contenedor #root.");
}
