
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
        // Asegurar que no haya duplicados en las cabeceras si se pasan como datos
        const csvContent = [
            headers.join(';'),
            ...data.map(row => headers.map(h => {
                const val = row[h];
                if (typeof val === 'number') {
                    return val.toFixed(2).replace('.', ',');
                }
                return String(val ?? '').replace(/"/g, '""');
            }).join(';'))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
            if (!ref) continue;

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
                UN: String(row[13] ?? '')
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
            if (!codArt) continue;

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
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 max-w-4xl mx-auto animate-fade-in">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Importador de Archivos XLS</h2>
                <p className="text-slate-500 dark:text-slate-400">Selecciona el tipo de archivo que deseas cargar directamente en la base de datos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <button
                    onClick={() => handleButtonClick('articulos')}
                    disabled={processing}
                    className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileTextIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Artículos</h3>
                    <p className="text-sm text-slate-400 text-center">Cargar Artículos.XLS</p>
                </button>

                <button
                    onClick={() => handleButtonClick('tarifas')}
                    disabled={processing}
                    className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileTextIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Tarifas</h3>
                    <p className="text-sm text-slate-400 text-center">Cargar Tarifas.XLS</p>
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
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                } animate-fade-in`}>
                    {message.type === 'success' && <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />}
                    {message.type === 'error' && <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />}
                    {message.type === 'info' && <UploadIcon className="w-5 h-5 flex-shrink-0 animate-bounce" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}
        </div>
    );
};

export default FileConverter;
