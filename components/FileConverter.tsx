
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadIcon, FileTextIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';

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
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

                if (activeType === 'articulos') {
                    processArticulos(jsonData);
                } else if (activeType === 'tarifas') {
                    processTarifas(jsonData);
                }
            } catch (error) {
                console.error(error);
                setMessage({ type: 'error', text: 'Error al procesar el archivo. Asegúrate de que el formato sea correcto.' });
                setProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const downloadCSV = (headers: string[], rows: any[][], fileNamePrefix: string) => {
        const csvContent = [
            headers,
            ...rows
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(csvContent);
        const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' }); // Usamos punto y coma para CSV en español/excel

        // Añadir BOM para UTF-8 en Excel
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const fileName = `${fileNamePrefix}_${dateStr}.csv`;

        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        setMessage({ type: 'success', text: `Archivo ${fileName} generado correctamente.` });
        setProcessing(false);
    };

    const processArticulos = (data: any[][]) => {
        // Eliminar las 2 primeras filas (0 y 1)
        const rows = data.slice(2);
        const newRows: any[][] = [];

        // Columnas Originales (según descripción):
        // L (11): Ult. Costo
        // M (12): IVA
        // N (13): Uni.Med
        // Columnas a mantener: B(1), D(3), E(4), F(5), J(9), L(11), M(12), N(13)
        
        // Headers esperados: Referencia, Sección, Descripción, Familia, Ult.Pro, Ult. Costo, IVA, Uni.Med
        const headers = ['Referencia', 'Sección', 'Descripción', 'Familia', 'Ult.Pro', 'Ult. Costo', 'IVA', 'Uni.Med'];

        rows.forEach(row => {
            // Si la fila está vacía, saltar
            if (row.length === 0 || !row[1]) return;

            // FILTRO DE SEGURIDAD: Si encontramos una fila que parece ser la cabecera original, la saltamos.
            // Esto evita duplicados si la estructura del archivo varía ligeramente.
            if (String(row[1]).trim() === 'Referencia' || String(row[11]).trim() === 'Ult. Costo') return;

            // Extraer y calcular el nuevo coste con IVA
            const costoBase = parseFloat(String(row[11]).replace(',', '.')) || 0;
            const iva = parseFloat(String(row[12]).replace(',', '.')) || 0;
            const nuevoCosto = costoBase + ((costoBase * iva) / 100);

            // Formatear a string con coma para decimales
            const costoFinalStr = nuevoCosto.toFixed(2).replace('.', ',');
            const ivaStr = row[12] !== undefined && row[12] !== null ? String(row[12]).replace('.', ',') : '';

            const newRow = [
                row[1], // Referencia (B)
                row[3], // Sección (D)
                row[4], // Descripción (E)
                row[5], // Familia (F)
                row[9], // Ult.Pro (J)
                costoFinalStr, // Ult. Costo (L) - Ahora contiene el coste con IVA
                ivaStr, // IVA (M)
                row[13]  // Uni.Med (N)
            ];
            newRows.push(newRow);
        });

        downloadCSV(headers, newRows, 'Artículos');
    };

    const processTarifas = (data: any[][]) => {
        // Eliminar las 4 primeras filas (0, 1, 2, 3)
        const rows = data.slice(4);
        const newRows: any[][] = [];

        // Columnas a mantener (según análisis):
        // C(2), D(3), E(4), F(5), J(9), M(12), O(14), R(17)
        // Headers: Cod., Tienda, Cód. Art., Descripción, P.V.P., PVP Oferta, Fec.Ini.Ofe., Fec.Fin.Ofe.
        
        const headers = ['Cod.', 'Tienda', 'Cód. Art.', 'Descripción', 'P.V.P.', 'PVP Oferta', 'Fec.Ini.Ofe.', 'Fec.Fin.Ofe.'];

        rows.forEach(row => {
            // Si la fila está vacía o no tiene código, saltar
            if (row.length === 0 || !row[2]) return;

            // FILTRO DE SEGURIDAD: Si encontramos una fila que parece ser la cabecera original, la saltamos.
            if (String(row[2]).trim() === 'Cod.') return;

            const pvp = parseFloat(String(row[9]).replace(',', '.')) || 0;
            const pvpOferta = parseFloat(String(row[12]).replace(',', '.')) || 0;

            const newRow = [
                row[2], // Cod. (C)
                row[3], // Tienda (D)
                row[4], // Cód. Art. (E)
                row[5], // Descripción (F)
                pvp.toFixed(2).replace('.', ','), // P.V.P. (J)
                pvpOferta > 0 ? pvpOferta.toFixed(2).replace('.', ',') : '', // PVP Oferta (M)
                row[14], // Fec.Ini.Ofe. (O)
                row[17]  // Fec.Fin.Ofe. (R) - Asumiendo R por ser común
            ];
            newRows.push(newRow);
        });

        downloadCSV(headers, newRows, 'Tarifas');
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 max-w-4xl mx-auto animate-fade-in">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Conversor de Archivos XLS a CSV</h2>
                <p className="text-slate-500 dark:text-slate-400">Selecciona el tipo de archivo que deseas procesar y convertir.</p>
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
                    <p className="text-sm text-slate-400 text-center">Procesar archivo de Artículos.XLS</p>
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
                    <p className="text-sm text-slate-400 text-center">Procesar archivo de Tarifas.XLS</p>
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
