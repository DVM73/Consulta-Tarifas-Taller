
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadIcon, FileTextIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { getAppData, saveAllData } from '../services/dataService';

const FileConverter: React.FC = () => {
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeType, setActiveType] = useState<'articulos' | 'tarifas' | null>(null);

    const handleButtonClick = (type: 'articulos' | 'tarifas') => {
        setActiveType(type);
        setMessage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
            setMessage({ type: 'error', text: 'Por favor, selecciona un archivo Excel (.xls o .xlsx).' });
            return;
        }

        processFile(file);
    };

    const processFile = (file: File) => {
        setProcessing(true);
        setMessage({ type: 'info', text: 'Procesando archivo...' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

                if (activeType === 'articulos') {
                    await processArticulos(jsonData);
                } else if (activeType === 'tarifas') {
                    await processTarifas(jsonData);
                }
            } catch (error) {
                console.error(error);
                setMessage({ type: 'error', text: 'Error al procesar el archivo. Asegúrate de que el formato sea correcto.' });
                setProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const findHeaderRow = (data: any[][], keywords: string[]): number => {
        for (let i = 0; i < data.length; i++) {
            const row = data[i].map(cell => String(cell).trim().toLowerCase().replace(/\s+/g, ' '));
            if (keywords.every(kw => row.includes(kw.toLowerCase().replace(/\s+/g, ' ')))) return i;
        }
        return -1;
    };

    const getHeaderIndex = (headers: string[], keyword: string): number => {
        return headers.findIndex(h => h.trim().toLowerCase().replace(/\s+/g, ' ') === keyword.toLowerCase().replace(/\s+/g, ' '));
    };

    const downloadCSV = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        const headerString = headers.join(';');
        
        // Asegurar que no haya duplicados en las cabeceras si se pasan como datos
        const csvContent = [
            headerString,
            ...data.map(row => headers.map(h => {
                const val = row[h];
                if (typeof val === 'number') {
                    return val.toFixed(2).replace('.', ',');
                }
                return String(val ?? '').replace(/"/g, '""');
            }).join(';')).filter(rowString => rowString !== headerString)
        ].join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    const processArticulos = async (data: any[][]) => {
        const newArticulos: any[] = [];
        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            const ref = String(row[1] ?? '').trim();
            if (!ref || ref.toLowerCase() === 'referencia' || ref.toLowerCase() === 'cód.' || ref.toLowerCase() === 'codigo' || ref.toLowerCase() === 'código') continue;

            const costoBase = parseFloat(String(row[11] ?? '').replace(',', '.')) || 0;
            const iva = parseFloat(String(row[12] ?? '').replace(',', '.')) || 0;
            // Redondeo estricto a 2 decimales
            const nuevoCosto = Math.round((costoBase + ((costoBase * iva) / 100)) * 100) / 100;

            newArticulos.push({
                Referencia: ref,
                Sección: String(row[3] ?? ''),
                Descripción: String(row[4] ?? ''),
                Familia: String(row[5] ?? ''),
                'Ult.Pro': String(row[9] ?? ''),
                'Ult. Costo': nuevoCosto,
                IVA: String(row[12] ?? ''),
                UniMed: String(row[13] ?? '')
            });
        }

        await saveAllData({ articulos: newArticulos });
        downloadCSV(newArticulos, 'articulos_procesados.csv');
        setMessage({ type: 'success', text: `Se han cargado ${newArticulos.length} artículos correctamente.` });
        setProcessing(false);
    };

    const processTarifas = async (data: any[][]) => {
        const newTarifas: any[] = [];
        for (let i = 5; i < data.length; i++) {
            const row = data[i];
            const codArt = String(row[4] ?? '').trim().replace(/^0+/, '');
            if (!codArt || codArt.toLowerCase() === 'cód. art.' || codArt.toLowerCase() === 'cod. art.' || codArt.toLowerCase() === 'codigo' || codArt.toLowerCase() === 'código') continue;

            const cleanPrice = (val: any) => {
                const str = String(val).replace(',', '.').replace(/[^0-9.]/g, '');
                const num = parseFloat(str);
                // Redondeo estricto a 2 decimales
                return (isNaN(num) || num === 0) ? null : Math.round(num * 100) / 100;
            };

            newTarifas.push({
                'Cod.': String(row[2] ?? ''),
                'Tienda': String(row[3] ?? ''),
                'Cód. Art.': codArt,
                'Descripción': String(row[5] ?? ''),
                'P.V.P.': cleanPrice(row[9]),
                'PVP Oferta': cleanPrice(row[12]),
                'Fec.Ini.Ofe.': String(row[14] ?? ''),
                'Fec.Fin.Ofe.': String(row[17] ?? '')
            });
        }

        await saveAllData({ tarifas: newTarifas });
        downloadCSV(newTarifas, 'tarifas_procesadas.csv');
        setMessage({ type: 'success', text: `Se han cargado ${newTarifas.length} tarifas correctamente.` });
        setProcessing(false);
    };

    return (
        <div className="glass-panel p-10 max-w-4xl mx-auto animate-fade-in border-white/20 shadow-xl">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-tight">
                    <span className="vibrant-gradient bg-clip-text text-transparent">Importador de Archivos XLS</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-lg mx-auto">Selecciona el tipo de archivo que deseas cargar directamente en la base de datos con procesamiento automático.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <button
                    onClick={() => handleButtonClick('articulos')}
                    disabled={processing}
                    className="group relative flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed interactive-card"
                >
                    <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner group-hover:shadow-lg group-hover:shadow-brand-500/20 dynamic-icon">
                        <FileTextIcon className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-tight group-hover:text-brand-600 transition-colors">Artículos</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Cargar Artículos.XLS</p>
                    
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <UploadIcon className="w-5 h-5 text-brand-500 animate-bounce" />
                    </div>
                </button>

                <button
                    onClick={() => handleButtonClick('tarifas')}
                    disabled={processing}
                    className="group relative flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed interactive-card"
                >
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-inner group-hover:shadow-lg group-hover:shadow-emerald-500/20 dynamic-icon">
                        <FileTextIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">Tarifas</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Cargar Tarifas.XLS</p>

                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <UploadIcon className="w-5 h-5 text-emerald-500 animate-bounce" />
                    </div>
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xls,.xlsx"
                className="hidden"
            />

            {message && (
                <div className={`p-5 rounded-2xl flex items-center gap-4 border shadow-sm animate-scale-in ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                    message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                    'bg-brand-50 text-brand-700 border-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-800'
                }`}>
                    <div className="shrink-0">
                        {message.type === 'success' && <CheckCircleIcon className="w-6 h-6" />}
                        {message.type === 'error' && <AlertCircleIcon className="w-6 h-6" />}
                        {message.type === 'info' && <UploadIcon className="w-6 h-6 animate-bounce" />}
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wide">{message.text}</span>
                </div>
            )}
        </div>
    );
};

export default FileConverter;
