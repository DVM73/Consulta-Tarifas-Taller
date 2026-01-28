
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función auxiliar para buscar variables con diferentes prefijos comunes
const findEnv = (env: Record<string, string>, key: string) => {
  return JSON.stringify(
    env[key] || 
    env[`VITE_${key}`] || 
    env[`REACT_APP_${key}`] || 
    process.env[key] || 
    ''
  );
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga todas las variables de entorno disponibles
  const env = loadEnv(mode, path.resolve(), '');

  return {
    plugins: [react()],
    // ?? A�ADE ESTA SECCI�N AQU�, DONDE INDICAMOS EL PUERTO QUE DEBE UTILIZAR LA APP PARA ARRANCAR EN LOCAL
        server: {
          port: 5174,
          strictPort: true, // Esto evita que si el 5174 est� ocupado, salte a otro
        },
    // ?? HASTA AQU�
    base: './', 
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            firebase: ['firebase/app', 'firebase/firestore'],
            pdf: ['jspdf', 'jspdf-autotable'],
            genai: ['@google/genai']
          }
        }
      }
    },
    define: {
      // Polyfill vital para evitar "process is not defined" en navegadores
      'process.env': {}, 
      // Inyección robusta de variables
      'process.env.API_KEY': findEnv(env, 'API_KEY'),
      'process.env.FIREBASE_API_KEY': findEnv(env, 'FIREBASE_API_KEY'),
      'process.env.FIREBASE_AUTH_DOMAIN': findEnv(env, 'FIREBASE_AUTH_DOMAIN'),
      'process.env.FIREBASE_PROJECT_ID': findEnv(env, 'FIREBASE_PROJECT_ID'),
      'process.env.FIREBASE_STORAGE_BUCKET': findEnv(env, 'FIREBASE_STORAGE_BUCKET'),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': findEnv(env, 'FIREBASE_MESSAGING_SENDER_ID'),
      'process.env.FIREBASE_APP_ID': findEnv(env, 'FIREBASE_APP_ID')
    }
  };
});
