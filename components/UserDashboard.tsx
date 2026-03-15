
import React, { useContext, useState, useEffect, useMemo, memo } from 'react';
import { AppContext } from '../context/AppContext';
import Chatbot from './Chatbot';
import ThemeToggle from './ThemeToggle';
import { Save } from 'lucide-react';
import SearchIcon from './icons/SearchIcon';
import SparklesIcon from './icons/SparklesIcon';
import LogoutIcon from './icons/LogoutIcon';
import ExportIcon from './icons/ExportIcon';
import ChatIcon from './icons/ChatIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import UploadIcon from './icons/UploadIcon';
import MailIcon from './icons/MailIcon';
import CloseIcon from './icons/CloseIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import { Tarifa, Articulo, PointOfSale, Report, Family } from '../types';
import { getAppData, saveAllData, saveSession, getSession, deleteSession } from '../services/dataService';
import emailjs from '@emailjs/browser';

const formatCurrency = (value: string | number | null | undefined): string => {
    if (value === undefined || value === null || value === '' || value === 0 || value === '0') return '';
    let num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.').replace(/[^0-9.-]/g, ''));
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') + '€';
};

const NoteInput = memo(({ 
    initialValue, 
    onSave 
}: { 
    initialValue: string, 
    onSave: (val: string) => void 
}) => {
    const [val, setVal] = useState(initialValue);

    useEffect(() => {
        setVal(initialValue);
    }, [initialValue]);

    const handleBlur = () => {
        if (val !== initialValue) {
            onSave(val);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <input 
            type="text" 
            value={val} 
            onChange={e => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-50 dark:bg-black/20 p-2 rounded-lg border border-transparent focus:border-brand-300 focus:bg-white dark:focus:bg-slate-800 outline-none text-xs transition-all placeholder:text-slate-400"
            placeholder="Añadir nota..."
        />
    );
});

const UserDashboard: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { user, logout } = useContext(AppContext);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [articulos, setArticulos] = useState<Articulo[]>([]);
    const [posList, setPosList] = useState<PointOfSale[]>([]);
    const [families, setFamilies] = useState<Family[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [seccionFilter, setSeccionFilter] = useState('Todas');
    const [familiaFilter, setFamiliaFilter] = useState('Todas');
    const [zonaFilter, setZonaFilter] = useState<string>(user?.zona || 'Todas');
    const [showOffers, setShowOffers] = useState(false);
    const [showNoPrice, setShowNoPrice] = useState(false);
    
    const [isComparing, setIsComparing] = useState(false);
    const [selectedCompareZones, setSelectedCompareZones] = useState<string[]>([]);
    
    const [notes, setNotes] = useState<Record<string, string>>({});
    
    const [isBotOpen, setIsBotOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState<'Completo' | 'Solo Notas'>('Completo');
    const [isSending, setIsSending] = useState(false);
    
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [showOverwriteModal, setShowOverwriteModal] = useState(false);
    const [previousSession, setPreviousSession] = useState<any>(null);

    useEffect(() => {
        getAppData().then(data => {
            setTarifas(data?.tarifas || []);
            setArticulos(data?.articulos || []);
            setPosList(data?.pos || []);
            setFamilies(data?.families || []);
            setLoading(false);
        }).catch(err => {
            console.error("Error al cargar los datos del panel de usuario:", err);
            setLoading(false);
        });

        if (user) {
            getSession(user.id).then(session => {
                if (session) {
                    setPreviousSession(session);
                    setShowSessionModal(true);
                }
            });
        }
    }, [user]);

    const handleContinueSession = () => {
        if (previousSession) {
            setSearchTerm(previousSession.searchTerm || '');
            setSeccionFilter(previousSession.seccionFilter || 'Todas');
            setFamiliaFilter(previousSession.familiaFilter || 'Todas');
            setZonaFilter(previousSession.zonaFilter || user?.zona || 'Todas');
            setNotes(previousSession.notes || {});
        }
        setShowSessionModal(false);
    };

    const handleNewSession = () => {
        if (user) deleteSession(user.id);
        setShowSessionModal(false);
    };

    const performSave = async () => {
        if (user) {
            await saveSession(user.id, {
                searchTerm,
                seccionFilter,
                familiaFilter,
                zonaFilter,
                notes
            });
        }
        setShowOverwriteModal(false);
        setShowExitModal(false);
        if (onBack) onBack();
    };

    const handleSaveAndExit = async () => {
        if (!user) return;
        
        const existingSession = await getSession(user.id);
        if (existingSession) {
            setShowOverwriteModal(true);
        } else {
            await performSave();
        }
    };

    const tariffsByArticle = useMemo(() => {
        const map = new Map<string, Tarifa[]>();
        (tarifas || []).forEach(t => {
            if (!t) return;
            // Normalizamos: quitamos espacios, ceros a la izquierda y convertimos a string
            const ref = String(t['Cód. Art.'] ?? '').trim().replace(/^0+/, '');
            if (!map.has(ref)) map.set(ref, []);
            map.get(ref)!.push(t);
        });
        return map;
    }, [tarifas]);

    const getTariffForZone = (ref: string | number | undefined, zona: string): Tarifa | undefined => {
        // Normalizamos la referencia del artículo igual que en tariffsByArticle
        const refNormalizada = String(ref ?? '').trim().replace(/^0+/, '');
        const articleTariffs = tariffsByArticle.get(refNormalizada);
        if (!articleTariffs) return undefined;
        
        if (zona === 'Todas') {
            return articleTariffs[0];
        }
        return articleTariffs.find(t => t.Tienda === zona);
    };

    const filteredData = useMemo(() => {
        return (articulos || []).filter(art => {
            if (!art || !art.Referencia || String(art.Referencia).toLowerCase() === 'referencia') return false;
            const desc = String(art.Descripción ?? '').toLowerCase();
            const refStr = String(art.Referencia ?? '').toLowerCase();
            const search = searchTerm.toLowerCase();
            const matchesSearch = desc.includes(search) || refStr.includes(search);
            if (!matchesSearch) return false;

            const sec = String(art.Sección ?? '');
            let seccionStr = sec === '1' ? 'Carnicería' : (sec === '2' ? 'Charcutería' : sec);
            const matchesSeccion = seccionFilter === 'Todas' || seccionStr === seccionFilter;
            if (!matchesSeccion) return false;

            if (familiaFilter !== 'Todas') {
                 const artFam = parseInt(String(art.Familia ?? ''));
                 const filterFam = parseInt(familiaFilter);
                 if (isNaN(artFam) || isNaN(filterFam) || artFam !== filterFam) {
                     return false;
                 }
            }
            
            const ref = String(art.Referencia ?? '').trim();
            const articleTariffs = tariffsByArticle.get(ref) || [];

            if (!isComparing && zonaFilter !== 'Todas') {
                const t = articleTariffs.find(at => at.Tienda === zonaFilter);
                if (!t) return false; 
                const precioRaw = t['P.V.P.'] ? String(t['P.V.P.']).replace(',', '.') : '0';
                const precio = parseFloat(precioRaw);
                if (isNaN(precio) || precio <= 0) return false; 
            }

            if (showOffers) {
                const hasOffer = articleTariffs.some(t => 
                    t['PVP Oferta'] && t['PVP Oferta'] !== '' && 
                    (isComparing ? selectedCompareZones.includes(t.Tienda) : (zonaFilter === 'Todas' || t.Tienda === zonaFilter))
                );
                if (!hasOffer) return false;
            }

            if (showNoPrice) {
                const hasAnyPrice = articleTariffs.some(t => t['P.V.P.'] && t['P.V.P.'] !== '');
                if (hasAnyPrice) return false;
            }
            return true;
        });
    }, [articulos, tariffsByArticle, searchTerm, zonaFilter, showOffers, showNoPrice, seccionFilter, familiaFilter, isComparing, selectedCompareZones]);

    // Reset page when filters change
    useEffect(() => {
        // No pagination
    }, [searchTerm, zonaFilter, showOffers, showNoPrice, seccionFilter, familiaFilter, isComparing, selectedCompareZones]);

    const paginatedData = filteredData; // No pagination

    const totalPages = 1; // No pagination

    const handleSaveNote = (ref: string | number | undefined, val: string) => {
        setNotes(prev => ({ ...prev, [String(ref ?? '')]: val }));
    };

    const toggleAllZones = () => setSelectedCompareZones(prev => prev.length === posList.length ? [] : posList.map(p => p.zona));
    const toggleZone = (zona: string) => setSelectedCompareZones(prev => prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona]);

    const generateCSV = () => {
        const dataToExport = exportType === 'Completo' ? filteredData : filteredData.filter(a => notes[String(a.Referencia ?? '')]);
        
        const priceHeaders = isComparing 
            ? selectedCompareZones.map(z => `;${z}`).join('') 
            : ';PVP';
            
        const headerRow = `Referencia;Descripción;Coste${priceHeaders};Nota`;

        const rows = dataToExport.map(art => {
            let row = `${art.Referencia};${art.Descripción};${art['Ult. Costo']}`;
            
            if (isComparing) {
                selectedCompareZones.forEach(z => {
                    const t = getTariffForZone(art.Referencia, z);
                    row += `;${t?.['P.V.P.'] || '-'}`;
                });
            } else {
                const t = getTariffForZone(art.Referencia, zonaFilter);
                row += `;${t?.['P.V.P.'] || '-'}`;
            }

            row += `;${notes[String(art.Referencia ?? '')] || ''}`;
            return row;
        });
        
        return [headerRow, ...rows].join("\n");
    };

    const handleDownloadCSV = () => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([generateCSV()], { type: 'text/csv;charset=utf-8;' }));
        link.download = `listado_${exportType.replace(' ', '_')}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        setIsExportModalOpen(false);
    };

    const handleSendToAdmin = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        
        setIsSending(true);
        const supervisorRealName = user?.nombre || 'Supervisor';
        
        const newReport: Report = {
            id: Date.now().toString(),
            date: new Date().toLocaleString(),
            supervisorName: supervisorRealName,
            zoneFilter: isComparing ? selectedCompareZones.join(', ') : zonaFilter,
            type: exportType,
            csvContent: generateCSV(),
            read: false
        };

        try {
            const currentData = await getAppData();
            await saveAllData({ reports: [newReport, ...(currentData.reports || [])] });

            const serviceID = 'service_egg3xws';
            const templateID = 'template_aogq9fr';
            const publicKey = 's0Y3v_8CMdSiSPqVz';

            const templateParams = {
                supervisor: supervisorRealName,
                from_name: supervisorRealName,
                user_name: supervisorRealName,
                zona: newReport.zoneFilter,
                tipo: newReport.type,
                fecha: newReport.date,
                message: `Nuevo reporte enviado por: ${supervisorRealName}`
            };

            await emailjs.send(serviceID, templateID, templateParams, publicKey);
            alert("✅ Listado enviado y administrador notificado por correo.");

        } catch (error) {
            console.error("❌ Error en el proceso de envío:", error);
            alert("✅ Listado guardado en la App.\n(Nota: El aviso por email ha fallado, pero el admin verá el listado en su panel).");
        } finally {
            setIsSending(false);
            setIsExportModalOpen(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;

    return (
        <div className="flex flex-col h-screen bg-[#f3f4f6] dark:bg-slate-950">
            {showSessionModal && (
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[100]">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">¿Continuar sesión anterior?</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Se ha encontrado una sesión de trabajo guardada. ¿Desea continuarla o empezar una nueva?</p>
                        <div className="flex gap-3">
                            <button onClick={handleNewSession} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200">Nueva</button>
                            <button onClick={handleContinueSession} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg">Continuar</button>
                        </div>
                    </div>
                </div>
            )}
            <header className="bg-white dark:bg-slate-900 p-4 border-b dark:border-slate-800 flex items-center gap-4 shadow-sm z-40 overflow-x-auto min-h-[72px] whitespace-nowrap">
                <div className="relative flex-grow min-w-[200px]"><input type="text" placeholder="Buscar por descripción o referencia..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-lg w-full text-sm outline-none focus:ring-2 focus:ring-brand-500" /><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
                
                <select value={seccionFilter} onChange={e => setSeccionFilter(e.target.value)} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 font-medium cursor-pointer">
                    <option>Todas</option>
                    <option>Carnicería</option>
                    <option>Charcutería</option>
                </select>

                <select value={familiaFilter} onChange={e => setFamiliaFilter(e.target.value)} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 font-medium max-w-[150px] cursor-pointer">
                    <option value="Todas">Todas las Familias</option>
                    {families.map(f => (
                        <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                </select>

                <select value={zonaFilter} disabled={isComparing} onChange={e => setZonaFilter(e.target.value)} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 font-medium cursor-pointer"><option>Todas</option>{(posList || []).map(p=> p ? <option key={p.id}>{p.zona}</option> : null)}</select>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none"><input type="checkbox" checked={showOffers} onChange={e => setShowOffers(e.target.checked)} className="rounded text-brand-600"/> Ofertas</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none"><input type="checkbox" checked={showNoPrice} onChange={e => setShowNoPrice(e.target.checked)} className="rounded text-brand-600"/> Sin Precio</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none"><input type="checkbox" checked={isComparing} onChange={e => setIsComparing(e.target.checked)} className="rounded text-brand-600"/> Comparar</label>
                <div className="ml-auto flex items-center gap-4 pl-4 border-l dark:border-slate-700">
                    <button onClick={() => setIsBotOpen(!isBotOpen)} className="text-slate-500 hover:text-brand-600 transition-colors"><SparklesIcon/></button>
                    <button onClick={() => setIsExportModalOpen(true)} className="text-slate-500 hover:text-brand-600 transition-colors"><UploadIcon/></button>
                    <ThemeToggle/>
                    <button onClick={logout} className="text-slate-500 hover:text-red-500 transition-colors"><LogoutIcon/></button>
                </div>
            </header>

            {showOverwriteModal && (
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[100]">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">¿Sobrescribir sesión?</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Ya existe una sesión guardada. Si guarda esta, la anterior se perderá.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowOverwriteModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200">Cancelar</button>
                            <button onClick={performSave} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Sobrescribir</button>
                        </div>
                    </div>
                </div>
            )}

            {isComparing && <div className="bg-white dark:bg-slate-800 p-2 flex flex-wrap gap-2 border-b dark:border-slate-700 shadow-sm z-30"><label className="flex items-center gap-2 text-sm px-2"><input type="checkbox" onChange={toggleAllZones} className="rounded text-brand-600"/> Todas las Zonas</label>{(posList || []).map(p=> p ? <label key={p.id} className="flex items-center gap-2 text-sm px-2"><input type="checkbox" checked={selectedCompareZones.includes(p.zona)} onChange={()=>toggleZone(p.zona)} className="rounded text-brand-600"/>{p.zona}</label> : null)}</div>}

            <main className="flex-1 overflow-auto bg-[#f3f4f6] dark:bg-slate-950 relative custom-scrollbar">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-[60] shadow-md">
                        <tr>
                            <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">Cód.</th>
                            <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">Descripción</th>
                            {user?.rol !== 'Normal' && <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">Coste</th>}
                            {!isComparing ? <>
                                <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">PVP</th>
                                <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">Oferta</th>
                                <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">Inicio</th>
                                <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">Fin</th>
                            </> : selectedCompareZones.map(z=><th key={z} className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] text-center tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">{z}</th>)}
                            <th className="p-3 bg-white dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] w-1/4 tracking-wider border-b border-gray-200 dark:border-slate-700 sticky top-0">Nota de Supervisor</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y dark:divide-slate-800">
                        {paginatedData.map(art => {
                            const t = getTariffForZone(art.Referencia, zonaFilter);
                            const hasOffer = t && t['PVP Oferta'] && t['PVP Oferta'] !== '';
                            
                            return (
                                <tr key={art.Referencia || Math.random()} className={`transition-colors border-b dark:border-slate-800 ${hasOffer ? 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                    <td className="p-3 font-mono text-xs text-slate-500">{String(art.Referencia ?? '').replace(/\D/g,'')}</td>
                                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{art.Descripción}</td>
                                    {user?.rol !== 'Normal' && <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">{formatCurrency(art['Ult. Costo'])}</td>}
                                    
                                    {!isComparing ? <>
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                {hasOffer && (
                                                    <span className="line-through text-slate-400 dark:text-slate-500 text-[10px]">
                                                        {formatCurrency(t?.['P.V.P.'])}
                                                    </span>
                                                )}
                                                <span className={`font-bold ${hasOffer ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {formatCurrency(hasOffer ? t!['PVP Oferta'] : t?.['P.V.P.'])}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            {hasOffer ? (
                                                <span className="font-extrabold text-green-700 dark:text-green-400 text-base bg-green-200/50 px-2 py-0.5 rounded-md border border-green-200 dark:border-green-800">
                                                    {formatCurrency(t!['PVP Oferta'])}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300"></span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs font-medium text-slate-600">{t?.['Fec.Ini.Ofe.']||'-'}</td>
                                        <td className="p-3 text-xs font-medium text-slate-600">{t?.['Fec.Fin.Ofe.']||'-'}</td>
                                    </> : selectedCompareZones.map(z => {
                                        const tz = getTariffForZone(art.Referencia, z);
                                        const isOffer = tz && tz['PVP Oferta'] && tz['PVP Oferta'] !== '';
                                        return (
                                            <td key={z} className={`p-3 text-center border-l dark:border-slate-800 ${isOffer ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                                <div className="flex flex-col items-center">
                                                    {isOffer && <span className="text-[10px] text-red-500 line-through mb-0.5">{formatCurrency(tz?.['P.V.P.'])}</span>}
                                                    <span className={`font-bold ${isOffer ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {formatCurrency(isOffer ? tz!['PVP Oferta'] : tz?.['P.V.P.'])}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-2">
                                        <NoteInput 
                                            initialValue={notes[String(art.Referencia ?? '')] || ''} 
                                            onSave={(val) => handleSaveNote(art.Referencia, val)} 
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-t dark:border-slate-800 sticky bottom-0 z-20">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Mostrando <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-medium">{filteredData.length}</span> resultados
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:outline-offset-0">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Siguiente</span>
                                        <ArrowLeftIcon className="h-5 w-5 rotate-180" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {isExportModalOpen && (
                <div 
                    className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
                    style={{ zIndex: 99999 }}
                >
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <ExportIcon className="w-6 h-6 text-brand-600"/>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Exportar Listado</h2>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <CloseIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">Selecciona el tipo de exportación:</h3>
                                <div className="space-y-3">
                                    <label onClick={() => setExportType('Completo')} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${exportType === 'Completo' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-brand-300'}`}>
                                        <input type="radio" name="export-type" checked={exportType === 'Completo'} readOnly className="h-4 w-4 text-brand-600 border-gray-300 focus:ring-brand-500" />
                                        <div className="ml-4">
                                            <span className="font-bold text-slate-800 dark:text-slate-100">Listado Completo</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Exporta todos los artículos que coinciden con los filtros actuales.</p>
                                        </div>
                                    </label>
                                     <label onClick={() => setExportType('Solo Notas')} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${exportType === 'Solo Notas' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-brand-300'}`}>
                                        <input type="radio" name="export-type" checked={exportType === 'Solo Notas'} readOnly className="h-4 w-4 text-brand-600 border-gray-300 focus:ring-brand-500" />
                                        <div className="ml-4">
                                            <span className="font-bold text-slate-800 dark:text-slate-100">Solo Artículos con Notas</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Exporta únicamente los artículos donde hayas añadido una nota.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-6 flex flex-wrap justify-end gap-3">
                            <button onClick={() => setIsExportModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-all uppercase tracking-widest">
                                Cancelar
                            </button>
                            <button onClick={handleDownloadCSV} className="px-5 py-2.5 text-xs font-bold text-brand-700 bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-900 rounded-lg transition-all uppercase tracking-widest flex items-center gap-2">
                                <ArrowDownIcon className="w-4 h-4" />
                                Descargar
                            </button>
                            <button onClick={handleSaveAndExit} className="px-5 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-lg shadow-green-600/20 transition-all uppercase tracking-widest flex items-center gap-2">
                                <Save className="w-4 h-4"/>
                                Guardar y Salir
                            </button>
                            <button 
                                onClick={handleSendToAdmin} 
                                disabled={isSending}
                                type="button"
                                className="px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-lg shadow-brand-600/20 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MailIcon className="w-4 h-4"/>
                                {isSending ? 'Enviando...' : 'Enviar a Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {isBotOpen && <div className="fixed bottom-20 right-5 w-96 h-[500px] shadow-lg rounded-lg z-50 bg-white dark:bg-slate-800 border dark:border-slate-700 overflow-hidden"><Chatbot contextData={JSON.stringify(filteredData)}/></div>}
        </div>
    );
};

export default UserDashboard;
