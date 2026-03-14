
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
        const csvContent = [
            headers.join(';'),
            ...data.map(row => headers.map(h => String(row[h] ?? '').replace(/"/g, '""')).join(';'))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    const processArticulos = async (data: any[][]) => {
        const headerKeywords = ['Referencia', 'Descripción', 'Ult. Costo', 'IVA'];
        const headerIndex = findHeaderRow(data, headerKeywords);
        
        if (headerIndex === -1) {
            setMessage({ type: 'error', text: 'No se encontró la cabecera correcta en el archivo de Artículos.' });
            setProcessing(false);
            return;
        }

        const headers = data[headerIndex];
        const idx = {
            ref: getHeaderIndex(headers, 'Referencia'),
            desc: getHeaderIndex(headers, 'Descripción'),
            costo: getHeaderIndex(headers, 'Ult. Costo'),
            iva: getHeaderIndex(headers, 'IVA'),
            seccion: getHeaderIndex(headers, 'Sección'),
            familia: getHeaderIndex(headers, 'Familia'),
            ultPro: getHeaderIndex(headers, 'Ult.Pro'),
            un: getHeaderIndex(headers, 'UN')
        };

        const newArticulos: any[] = [];
        for (let i = headerIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row[idx.ref]) continue;

            const costoBase = parseFloat(String(row[idx.costo]).replace(',', '.')) || 0;
            const iva = parseFloat(String(row[idx.iva]).replace(',', '.')) || 0;
            const nuevoCosto = costoBase + ((costoBase * iva) / 100);

            newArticulos.push({
                Referencia: String(row[idx.ref]),
                Sección: row[idx.seccion],
                Descripción: row[idx.desc],
                Familia: row[idx.familia],
                'Ult.Pro': row[idx.ultPro],
                'Ult. Costo': nuevoCosto,
                IVA: iva,
                UN: row[idx.un]
            });
        }

        const currentData = await getAppData();
        await saveAllData({ articulos: newArticulos });
        
        // Exportar para verificación
        downloadCSV(newArticulos, 'articulos_procesados.csv');
        
        setMessage({ type: 'success', text: `Se han cargado ${newArticulos.length} artículos correctamente y se ha descargado el CSV para verificación.` });
        setProcessing(false);
    };

    const processTarifas = async (data: any[][]) => {
        const headerKeywords = ['Cod.', 'Tienda', 'Cód. Art.', 'Descripción', 'P.V.P.'];
        const headerIndex = findHeaderRow(data, headerKeywords);
        
        if (headerIndex === -1) {
            setMessage({ type: 'error', text: 'No se encontró la cabecera correcta en el archivo de Tarifas.' });
            setProcessing(false);
            return;
        }

        const headers = data[headerIndex];
        const idx = {
            cod: getHeaderIndex(headers, 'Cod.'),
            tienda: getHeaderIndex(headers, 'Tienda'),
            codArt: getHeaderIndex(headers, 'Cód. Art.'),
            desc: getHeaderIndex(headers, 'Descripción'),
            pvp: getHeaderIndex(headers, 'P.V.P.'),
            pvpOferta: getHeaderIndex(headers, 'PVP Oferta'),
            fecIni: getHeaderIndex(headers, 'Fec.Ini.Ofe.'),
            fecFin: getHeaderIndex(headers, 'Fec.Fin.Ofe.')
        };

        const newTarifas: any[] = [];
        for (let i = headerIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row[idx.codArt]) continue; // Usamos codArt como clave principal

            // Función para limpiar precios: eliminar todo excepto números, puntos y comas
            const cleanPrice = (val: any) => {
                const str = String(val).replace(',', '.').replace(/[^0-9.]/g, '');
                return parseFloat(str) || 0;
            };

            newTarifas.push({
                'Cod.': String(row[idx.cod]),
                'Tienda': String(row[idx.tienda]),
                'Cód. Art.': String(row[idx.codArt]).trim().replace(/^0+/, ''),
                'Descripción': String(row[idx.desc]),
                'P.V.P.': cleanPrice(row[idx.pvp]),
                'PVP Oferta': cleanPrice(row[idx.pvpOferta]),
                'Fec.Ini.Ofe.': String(row[idx.fecIni] || ''),
                'Fec.Fin.Ofe.': String(row[idx.fecFin] || '')
            });
        }

        await saveAllData({ tarifas: newTarifas });
        
        // Exportar para verificación
        downloadCSV(newTarifas, 'tarifas_procesadas.csv');
        
        setMessage({ type: 'success', text: `Se han cargado ${newTarifas.length} tarifas correctamente y se ha descargado el CSV para verificación.` });
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
