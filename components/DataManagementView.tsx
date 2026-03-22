
import React, { useRef, useState } from 'react';
import ExportIcon from './icons/ExportIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import UploadIcon from './icons/UploadIcon';
import { getAppData, overwriteAllData } from '../services/dataService';

export const DataManagementView = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    // --- LÓGICA DE EXPORTACIÓN ---
    const handleExport = async () => {
        const data = await getAppData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `backup_sistema_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- LÓGICA DE IMPORTACIÓN ---
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            try {
                const data = JSON.parse(text);
                if (data && data.users && data.pos) {
                    if (confirm(`Se han detectado ${data.users.length} usuarios y ${data.pos.length} tiendas. ¿Deseas restaurar esta copia? Se sobrescribirán los datos actuales.`)) {
                        setLoading(true);
                        await overwriteAllData(data);
                        alert("✅ Restauración completada con éxito. La página se recargará.");
                        window.location.reload();
                    }
                } else {
                    alert("❌ El archivo no parece ser una copia de seguridad válida.");
                }
            } catch (error) {
                alert("❌ Error procesando el archivo JSON. Verifica el formato.");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* SECCIÓN DE EXPORTACIÓN */}
            <div className="glass-panel p-10 text-center flex flex-col justify-center h-full border-white/20 shadow-xl hover:scale-[1.02] transition-transform interactive-card">
                <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center text-brand-600 mb-6 mx-auto shadow-inner">
                    <ExportIcon className="w-10 h-10 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-tight">
                    <span className="vibrant-gradient bg-clip-text text-transparent">Exportar Base de Datos</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">Descarga una copia completa de todos los datos en formato JSON para seguridad o migración.</p>
                <button onClick={handleExport} className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-600/30 hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                    <ExportIcon className="w-5 h-5"/> Descargar Copia JSON
                </button>
            </div>

            {/* SECCIÓN DE IMPORTACIÓN */}
            <div className="glass-panel p-10 text-center flex flex-col justify-center h-full border-white/20 shadow-xl hover:scale-[1.02] transition-transform interactive-card">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 mb-6 mx-auto shadow-inner">
                    <ArrowDownIcon className="w-10 h-10 animate-bounce" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-tight">
                    <span className="vibrant-gradient bg-clip-text text-transparent">Importar Base de Datos</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">Restaura el sistema completo cargando un archivo JSON previamente exportado.</p>
                
                <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef}
                    onChange={handleFile}
                    className="hidden" 
                    id="file-restore"
                />
                <label 
                    htmlFor="file-restore" 
                    className={`w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <UploadIcon className="w-5 h-5"/> {loading ? 'Restaurando...' : 'Seleccionar Archivo JSON'}
                </label>
            </div>
        </div>
    );
};
