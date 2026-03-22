
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
            className="w-full bg-slate-50 dark:bg-black/20 p-2 rounded-lg border border-transparent focus:border-brand-300 focus:bg-white dark:focus:bg-slate-800 outline-none text-xs transition-all placeholder:text-slate-400"
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
    const [exportType, setExportType] = useState<'Completo' | 'Solo Notas'>('Completo');
    const [isSending, setIsSending] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [showExitModal, setShowExitModal] = useState(false);
    const [exitModalStep, setExitModalStep] = useState<'main' | 'export_type'>('main');
    const [exportAction, setExportAction] = useState<'download' | 'send' | null>(null);
    
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
        else logout();
    };

    const handleSaveAndExit = async () => {
        if (!user) return;
        
        const existingSession = await getSession(user.id);
        if (existingSession) {
            setShowExitModal(false);
            setShowOverwriteModal(true);
        } else {
            await performSave();
        }
    };

    const handleExitWithoutSaving = () => {
        setShowExitModal(false);
        if (onBack) onBack();
        else logout();
    };

    const handleExitClick = () => {
        setExitModalStep('main');
        setShowExitModal(true);
    };

    const executeExportAction = async (type: 'Completo' | 'Solo Notas') => {
        setExportType(type);
        if (exportAction === 'download') {
            handleDownloadCSV(type);
        } else if (exportAction === 'send') {
            await handleSendToAdmin(type);
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
            const refStr = String(art.Referencia ?? '').replace(/^\uFEFF/, '').replace(/["']/g, '').trim().toLowerCase();
            if (!art || !art.Referencia || refStr === 'referencia' || refStr === 'cód.' || refStr === 'codigo' || refStr === 'código' || refStr === 'cód. art.' || refStr === 'cod. art.') return false;
            
            const desc = String(art.Descripción ?? '').toLowerCase();
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
        setCurrentPage(1);
    }, [searchTerm, zonaFilter, showOffers, showNoPrice, seccionFilter, familiaFilter, isComparing, selectedCompareZones]);

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    const handleSaveNote = (ref: string | number | undefined, val: string) => {
        setNotes(prev => ({ ...prev, [String(ref ?? '')]: val }));
    };

    const toggleAllZones = () => setSelectedCompareZones(prev => prev.length === posList.length ? [] : posList.map(p => p.zona));
    const toggleZone = (zona: string) => setSelectedCompareZones(prev => prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona]);

    const generateCSV = (type: 'Completo' | 'Solo Notas') => {
        const dataToExport = type === 'Completo' ? filteredData : filteredData.filter(a => notes[String(a.Referencia ?? '')]);
        
        const priceHeaders = isComparing 
            ? selectedCompareZones.map(z => `;${z}`).join('') 
            : ';PVP;Oferta;Inicio;Fin';
            
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
                row += `;${t?.['P.V.P.'] || '-'};${t?.['PVP Oferta'] || '-'};${t?.['Fec.Ini.Ofe.'] || '-'};${t?.['Fec.Fin.Ofe.'] || '-'}`;
            }

            row += `;${notes[String(art.Referencia ?? '')] || ''}`;
            return row;
        }).filter(row => !row.startsWith('Referencia;Descripción;Coste'));
        
        return [headerRow, ...rows].join("\n");
    };

    const handleDownloadCSV = (type: 'Completo' | 'Solo Notas') => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob(['\uFEFF' + generateCSV(type)], { type: 'text/csv;charset=utf-8;' }));
        link.download = `listado_${type.replace(' ', '_')}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        setShowExitModal(false);
        if (onBack) onBack();
        else logout();
    };

    const handleSendToAdmin = async (type: 'Completo' | 'Solo Notas') => {
        setIsSending(true);
        const supervisorRealName = user?.nombre || 'Supervisor';
        
        const newReport: Report = {
            id: Date.now().toString(),
            date: new Date().toLocaleString(),
            supervisorName: supervisorRealName,
            zoneFilter: isComparing ? selectedCompareZones.join(', ') : zonaFilter,
            type: type,
            csvContent: generateCSV(type),
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
            setShowExitModal(false);
            if (onBack) onBack();
            else logout();
        }
    };

    const aiContext = useMemo(() => {
        return articulos.map(art => {
            const t = getTariffForZone(art.Referencia, zonaFilter);
            return {
                ...art,
                Precio: t?.['P.V.P.'] || 'No disponible',
                Oferta: t?.['PVP Oferta'] || '',
                InicioOferta: t?.['Fec.Ini.Ofe.'] || '',
                FinOferta: t?.['Fec.Fin.Ofe.'] || '',
                Tienda: t?.Tienda || zonaFilter
            };
        });
    }, [articulos, tariffsByArticle, zonaFilter]);

    if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;

    return (
        <div className="flex flex-col h-screen bg-[#f3f4f6] dark:bg-slate-950">
            {showSessionModal && (
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[100]">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">¿Continuar sesión anterior?</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Se ha encontrado una sesión de trabajo guardada. ¿Desea continuarla o empezar una nueva?</p>
                        <div className="flex gap-3">
                            <button onClick={handleNewSession} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200">Nueva</button>
                            <button onClick={handleContinueSession} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg">Continuar</button>
                        </div>
                    </div>
                </div>
            )}
            <header className="glass-panel p-4 border-b dark:border-slate-800/50 flex items-center gap-4 shadow-xl z-40 overflow-x-auto min-h-[90px] whitespace-nowrap sticky top-0 backdrop-blur-3xl border-white/20">
                <div className="flex items-center gap-3 mr-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 dynamic-icon">
                        <ChatIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="hidden lg:block">
                        <h1 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Panel de</h1>
                        <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest leading-none">Supervisión</h2>
                    </div>
                </div>

                <div className="relative flex-grow max-w-md group">
                    <input 
                        type="text" 
                        placeholder="Buscar por descripción o referencia..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-11 pr-4 py-3 bg-white/40 dark:bg-slate-800/40 rounded-2xl w-full text-sm outline-none focus:ring-4 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all border border-slate-200/50 dark:border-slate-700/50 focus:border-brand-500 shadow-inner" 
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                
                <div className="flex items-center gap-3">
                    <select value={seccionFilter} onChange={e => setSeccionFilter(e.target.value)} className="bg-white/40 dark:bg-slate-800/40 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-brand-500/20 cursor-pointer border border-slate-200/50 dark:border-slate-700/50 focus:border-brand-500 transition-all shadow-sm">
                        <option>Todas</option>
                        <option>Carnicería</option>
                        <option>Charcutería</option>
                    </select>

                    <select value={familiaFilter} onChange={e => setFamiliaFilter(e.target.value)} className="bg-white/40 dark:bg-slate-800/40 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-brand-500/20 max-w-[200px] cursor-pointer border border-slate-200/50 dark:border-slate-700/50 focus:border-brand-500 transition-all shadow-sm">
                        <option value="Todas">Familias</option>
                        {families.map(f => (
                            <option key={f.id} value={f.id}>{f.nombre}</option>
                        ))}
                    </select>

                    <select value={zonaFilter} disabled={isComparing} onChange={e => setZonaFilter(e.target.value)} className="bg-white/40 dark:bg-slate-800/40 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50 cursor-pointer border border-slate-200/50 dark:border-slate-700/50 focus:border-brand-500 transition-all shadow-sm">
                        <option>Todas</option>
                        {(posList || []).map(p=> p ? <option key={p.id}>{p.zona}</option> : null)}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-200/30 dark:bg-slate-800/30 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                    <button onClick={() => setShowOffers(!showOffers)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${showOffers ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Ofertas</button>
                    <button onClick={() => setShowNoPrice(!showNoPrice)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${showNoPrice ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Sin PVP</button>
                    <button onClick={() => setIsComparing(!isComparing)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${isComparing ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/40 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Comparar</button>
                </div>

                <div className="ml-auto flex items-center gap-6 pl-6 border-l border-slate-200/50 dark:border-slate-700/50">
                    <button onClick={() => setIsBotOpen(!isBotOpen)} className="dynamic-icon text-slate-400 hover:text-brand-500 transition-all"><SparklesIcon className="w-6 h-6"/></button>
                    <ThemeToggle/>
                    <button onClick={handleExitClick} className="dynamic-icon text-slate-400 hover:text-rose-500 transition-all"><LogoutIcon className="w-6 h-6"/></button>
                </div>
            </header>

            {showOverwriteModal && (
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[100]">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">¿Sobrescribir sesión?</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Ya existe una sesión guardada. Si guarda esta, la anterior se perderá.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowOverwriteModal(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200">Cancelar</button>
                            <button onClick={performSave} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg">Sobrescribir</button>
                        </div>
                    </div>
                </div>
            )}

            {showExitModal && (
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm z-[100]">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl p-6">
                        {exitModalStep === 'main' ? (
                            <>
                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 mb-4 mx-auto">
                                    <LogoutIcon className="w-6 h-6"/>
                                </div>
                                <h2 className="text-lg font-bold mb-6 text-center text-slate-800 dark:text-white">¿Qué deseas hacer?</h2>
                                <div className="flex flex-col gap-3">
                                    <button onClick={handleSaveAndExit} className="w-full px-4 py-3 bg-brand-600 text-white rounded-lg font-bold uppercase text-xs tracking-widest shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-colors">Guardar y Salir</button>
                                    <button onClick={() => { setExportAction('download'); setExitModalStep('export_type'); }} className="w-full px-4 py-3 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg font-bold uppercase text-xs tracking-widest border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">Descargar CSV</button>
                                    <button onClick={() => { setExportAction('send'); setExitModalStep('export_type'); }} className="w-full px-4 py-3 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg font-bold uppercase text-xs tracking-widest border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">Enviar a Admin</button>
                                    <button onClick={handleExitWithoutSaving} className="w-full px-4 py-3 bg-transparent text-red-600 dark:text-red-400 rounded-lg font-bold uppercase text-xs tracking-widest border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Salir sin Guardar</button>
                                    <button onClick={() => setShowExitModal(false)} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center text-brand-600 mb-4 mx-auto">
                                    {exportAction === 'download' ? <ArrowDownIcon className="w-6 h-6"/> : <MailIcon className="w-6 h-6"/>}
                                </div>
                                <h2 className="text-lg font-bold mb-2 text-center text-slate-800 dark:text-white">
                                    {exportAction === 'download' ? 'Descargar Listado' : 'Enviar a Admin'}
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">Selecciona qué artículos deseas incluir.</p>
                                
                                {isSending ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 animate-pulse">Enviando reporte...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3 mb-6">
                                            <button onClick={() => executeExportAction('Completo')} className="w-full flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-left group bg-white dark:bg-slate-800">
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-brand-500 flex items-center justify-center mr-4 shrink-0">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-brand-500 transition-colors"></div>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-slate-800 dark:text-slate-100 mb-1">Listado Completo</span>
                                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Exporta todos los artículos que coinciden con los filtros actuales.</span>
                                                </div>
                                            </button>
                                            
                                            <button onClick={() => executeExportAction('Solo Notas')} className="w-full flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-left group bg-white dark:bg-slate-800">
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-brand-500 flex items-center justify-center mr-4 shrink-0">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-brand-500 transition-colors"></div>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-slate-800 dark:text-slate-100 mb-1">Solo Artículos con Notas</span>
                                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Exporta únicamente los artículos donde hayas añadido una nota.</span>
                                                </div>
                                            </button>
                                        </div>
                                        
                                        <button onClick={() => setExitModalStep('main')} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                            Volver atrás
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {isComparing && <div className="bg-white dark:bg-slate-800 p-2 flex flex-wrap gap-2 border-b dark:border-slate-700 shadow-sm z-30"><label className="flex items-center gap-2 text-sm px-2"><input type="checkbox" onChange={toggleAllZones} className="rounded text-brand-600"/> Todas las Zonas</label>{(posList || []).map(p=> p ? <label key={p.id} className="flex items-center gap-2 text-sm px-2"><input type="checkbox" checked={selectedCompareZones.includes(p.zona)} onChange={()=>toggleZone(p.zona)} className="rounded text-brand-600"/>{p.zona}</label> : null)}</div>}

            <main className="flex-1 overflow-auto bg-[#f3f4f6] dark:bg-slate-950 relative custom-scrollbar">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-[60] shadow-sm">
                        <tr>
                            <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">Cód.</th>
                            <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">Descripción</th>
                            {user?.rol !== 'Normal' && <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">Coste</th>}
                            {!isComparing ? <>
                                <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">PVP</th>
                                <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">Oferta</th>
                                <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">Inicio</th>
                                <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">Fin</th>
                            </> : selectedCompareZones.map(z=><th key={z} className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] text-center tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">{z}</th>)}
                            <th className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] w-1/4 tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0">Nota de Supervisor</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/50">
                        {paginatedData.map(art => {
                            const t = getTariffForZone(art.Referencia, zonaFilter);
                            const hasOffer = t && t['PVP Oferta'] && t['PVP Oferta'] !== '';
                            
                            return (
                                <tr key={art.Referencia || Math.random()} className={`transition-all duration-500 group ${hasOffer ? 'bg-emerald-50/20 dark:bg-emerald-900/10 hover:bg-emerald-100/40 dark:hover:bg-emerald-900/20' : 'hover:bg-brand-50/20 dark:hover:bg-brand-900/10'}`}>
                                    <td className="p-4 font-mono text-[10px] font-black text-slate-400 dark:text-slate-500 group-hover:text-brand-500 transition-colors tracking-tighter">{String(art.Referencia ?? '').replace(/\D/g,'')}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all group-hover:translate-x-1 uppercase tracking-tight leading-tight">{art.Descripción}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{art.Familia}</span>
                                        </div>
                                    </td>
                                    {user?.rol !== 'Normal' && <td className="p-4 text-slate-500 dark:text-slate-400 font-black text-xs tabular-nums">{formatCurrency(art['Ult. Costo'])}</td>}
                                    
                                    {!isComparing ? <>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                {hasOffer && (
                                                    <span className="line-through text-rose-400/70 dark:text-rose-500/50 text-[10px] font-black italic">
                                                        {formatCurrency(t?.['P.V.P.'])}
                                                    </span>
                                                )}
                                                <span className={`font-black text-lg tabular-nums tracking-tighter ${hasOffer ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {formatCurrency(hasOffer ? t!['PVP Oferta'] : t?.['P.V.P.'])}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {hasOffer ? (
                                                <div className="relative inline-flex">
                                                    <span className="absolute inset-0 bg-emerald-500 blur-md opacity-40 animate-pulse rounded-full"></span>
                                                    <span className="relative inline-flex items-center justify-center font-black text-white text-[9px] bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 uppercase tracking-[0.2em]">
                                                        Oferta
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300"></span>
                                            )}
                                        </td>
                                        <td className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t?.['Fec.Ini.Ofe.']||'-'}</td>
                                        <td className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">{t?.['Fec.Fin.Ofe.']||'-'}</td>
                                    </> : selectedCompareZones.map(z => {
                                        const tz = getTariffForZone(art.Referencia, z);
                                        const isOffer = tz && tz['PVP Oferta'] && tz['PVP Oferta'] !== '';
                                        return (
                                            <td key={z} className={`p-4 text-center border-l border-slate-100 dark:border-slate-800/50 transition-colors ${isOffer ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'group-hover:bg-white/50 dark:group-hover:bg-slate-800/50'}`}>
                                                <div className="flex flex-col items-center">
                                                    {isOffer && <span className="text-[10px] text-rose-400/70 line-through mb-0.5 font-black italic tabular-nums">{formatCurrency(tz?.['P.V.P.'])}</span>}
                                                    <span className={`font-black text-base tabular-nums tracking-tighter ${isOffer ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {formatCurrency(isOffer ? tz!['PVP Oferta'] : tz?.['P.V.P.'])}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-3">
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
                    <div className="flex items-center justify-between px-6 py-4 glass-panel border-t dark:border-slate-800/50 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all backdrop-blur-sm"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all backdrop-blur-sm"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Mostrando <span className="font-bold text-slate-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-bold text-slate-900 dark:text-white">{filteredData.length}</span> resultados
                                </p>
                                <select 
                                    value={itemsPerPage} 
                                    onChange={e => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 outline-none text-slate-500 focus:ring-2 focus:ring-brand-500/50 transition-all backdrop-blur-sm cursor-pointer"
                                >
                                    <option value={25}>25 por página</option>
                                    <option value={50}>50 por página</option>
                                    <option value={100}>100 por página</option>
                                    <option value={filteredData.length}>Ver todos</option>
                                </select>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm overflow-hidden" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-700/50 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-all backdrop-blur-sm"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-700/50 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-all backdrop-blur-sm"
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
            
            {isBotOpen && <div className="fixed bottom-20 right-5 w-96 h-[500px] shadow-lg rounded-lg z-50 bg-white dark:bg-slate-800 border dark:border-slate-700 overflow-hidden"><Chatbot contextData={JSON.stringify(aiContext)}/></div>}
        </div>
    );
};

export default UserDashboard;
