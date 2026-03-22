
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { AdminView, AppData } from '../types';
import { getAppData, saveAllData } from '../services/dataService';
import ThemeToggle from './ThemeToggle';
import BuildingIcon from './icons/BuildingIcon';
import UserIcon from './icons/UserIcon';
import SettingsIcon from './icons/SettingsIcon';
import LogoutIcon from './icons/LogoutIcon';
import UploadIcon from './icons/UploadIcon';
import ExportIcon from './icons/ExportIcon';
import MailIcon from './icons/MailIcon';
import HistoryIcon from './icons/HistoryIcon';
import ChatIcon from './icons/ChatIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import FlagIcon from './icons/FlagIcon';
import TagIcon from './icons/TagIcon';
import { UsersList, POSList, GroupsList, DataUploadView, ReportsInboxView, BackupView, SettingsView, FamiliesList } from './AdminViews';
import { DataManagementView } from './DataManagementView';
import FileConverter from './FileConverter';
import SparklesIcon from './icons/SparklesIcon';

const AdminDashboard = () => {
    const { logout, user } = useContext(AppContext);
    const [view, setView] = useState<AdminView>('menu');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AppData | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setLoading(true);
        getAppData().then(res => {
            setData(res);
            
            // Lógica de Notificación de Actualización (POR USUARIO)
            if (res?.lastUpdated && user?.id) {
                const cleanDate = res.lastUpdated.replace(/[^a-zA-Z0-9]/g, '');
                const storageKey = `admin_update_ack_${user.id}_${cleanDate}`;
                const hasSeenThisUpdate = localStorage.getItem(storageKey);
                
                if (!hasSeenThisUpdate) {
                    setTimeout(() => setShowUpdateModal(true), 1000);
                }
            }
            
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    const handleCloseUpdateModal = () => {
        if (data?.lastUpdated && user?.id) {
            const cleanDate = data.lastUpdated.replace(/[^a-zA-Z0-9]/g, '');
            const storageKey = `admin_update_ack_${user.id}_${cleanDate}`;
            localStorage.setItem(storageKey, 'true');
        }
        setShowUpdateModal(false);
    };

    const handleUpdateData = async (updates: Partial<AppData>) => {
        if (!data) return;
        const newData = { ...data, ...updates };
        setData(newData);
        await saveAllData(updates);
    };

    const renderContent = () => {
        if (!data) return <div className="text-center p-10 font-bold text-red-500 uppercase text-xs tracking-widest">Error de base de datos</div>;
        switch (view) {
            case 'users': return <UsersList users={data.users || []} posList={data.pos || []} onUpdate={handleUpdateData} />;
            case 'pos': return <POSList pos={data.pos || []} onUpdate={handleUpdateData} />;
            case 'groups': return <GroupsList groups={data.groups || []} onUpdate={handleUpdateData} />;
            case 'families': return <FamiliesList families={data.families || []} onUpdate={handleUpdateData} />;
            case 'upload': return <FileConverter />;
            case 'data_io': return <DataManagementView />;
            case 'reports': return <ReportsInboxView reports={data.reports || []} onUpdate={handleUpdateData} onRefresh={refreshData} />;
            case 'backup': return <BackupView backups={data.backups || []} currentData={data} onUpdate={handleUpdateData} />;
            case 'settings': return (
                <SettingsView 
                    companyName={data.companyName} 
                    onUpdate={handleUpdateData} 
                />
            );
            default: return null;
        }
    };

    if (loading && view === 'menu') return (
        <div className="h-screen flex items-center justify-center bg-[#f3f4f6] dark:bg-slate-950">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const menuItems = [
        { id: 'users', label: 'Administración de usuarios', desc: 'Crear, modificar y eliminar usuarios.', icon: UserIcon },
        { id: 'pos', label: 'Administración de P. Venta', desc: 'Gestionar los puntos de venta.', icon: HistoryIcon },
        { id: 'groups', label: 'Administración de Grupos', desc: 'Gestionar los grupos de tiendas.', icon: BuildingIcon },
        { id: 'families', label: 'Administración de Familias', desc: 'Gestionar códigos y nombres de familias.', icon: TagIcon },
        { id: 'upload', label: 'Cargar Artículos y Tarifas', desc: 'Cargar y convertir archivos de artículos y tarifas.', icon: UploadIcon },
        { 
            id: 'data_io', 
            label: 'Exportación / Importación Datos', 
            desc: 'Gestionar copias JSON completas del sistema.', 
            // Icono combinado personalizado para este caso
            icon: (props: any) => (
                <div className="relative w-12 h-12 flex justify-center items-center">
                    <ExportIcon {...props} className="w-6 h-6 absolute top-0 left-0 text-brand-600" />
                    <ArrowDownIcon {...props} className="w-6 h-6 absolute bottom-0 right-0 text-brand-400" />
                </div>
            ),
            isCustomIcon: true
        },
        { id: 'reports', label: 'Buzón de Reportes', desc: 'Ver informes enviados por supervisores.', icon: MailIcon },
        { id: 'backup', label: 'Copia de Seguridad', desc: 'Crear una copia de la aplicación.', icon: HistoryIcon },
        { id: 'settings', label: 'Configuración General', desc: 'Personalizar nombre de empresa.', icon: SettingsIcon },
    ];

    // Contar reportes sin leer
    const unreadReports = data?.reports?.filter(r => !r.read).length || 0;

    return (
        <div className="h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 font-sans overflow-hidden">
            <header className="glass-panel h-16 px-8 flex justify-between items-center z-20 border-b-0 shadow-lg shadow-brand-500/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/30">
                        <SettingsIcon className="w-5 h-5 text-white animate-spin-slow" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                        <span className="vibrant-gradient bg-clip-text text-transparent">Panel de Administrador</span>
                    </h1>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700">
                        <div className="w-6 h-6 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center text-brand-600">
                            <UserIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{user?.nombre}</span>
                        <span className="text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded-full font-bold">{user?.rol}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button className="p-2 text-slate-400 hover:text-brand-600 transition-all hover:scale-110 dynamic-icon">
                            <ChatIcon className="w-5 h-5" />
                        </button>
                        <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-all hover:scale-110 dynamic-icon">
                            <LogoutIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-8 custom-scrollbar bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
                <div className="max-w-7xl mx-auto">
                    {view === 'menu' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id as AdminView)}
                                    className="glass-panel p-10 rounded-2xl flex flex-col items-center text-center group hover:shadow-2xl hover:shadow-brand-500/10 transition-all relative border-white/20 hover:scale-[1.03] active:scale-[0.98] interactive-card"
                                >
                                    {/* NOTIFICACIÓN CON BANDERA ROJA */}
                                    {item.id === 'reports' && unreadReports > 0 && (
                                        <div className="absolute top-6 right-6 animate-bounce">
                                            <div className="relative">
                                                <FlagIcon className="w-10 h-10 text-red-600 fill-red-600 drop-shadow-xl" />
                                                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-red-50 shadow-lg">
                                                    {unreadReports}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="mb-8 p-5 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all duration-500 shadow-inner group-hover:shadow-lg group-hover:shadow-brand-600/30 dynamic-icon">
                                        {/* @ts-ignore: Manejo de iconos personalizados vs componentes */}
                                        {item.isCustomIcon ? <item.icon /> : <item.icon className="w-12 h-12 stroke-[1.5]" />}
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-3 uppercase tracking-tight group-hover:text-brand-600 transition-colors">{item.label}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">{item.desc}</p>
                                    
                                    {item.id === 'upload' && data?.lastUpdated && (
                                        <div className="mb-2 px-3 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-full border border-brand-100 dark:border-brand-800/50">
                                            <p className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                                                Última actualización: {data.lastUpdated}
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-6 w-10 h-1 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:w-20 group-hover:bg-brand-500 transition-all duration-500"></div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <button 
                                onClick={() => setView('menu')} 
                                className="flex items-center gap-2 text-brand-600 font-bold text-xs mb-10 hover:gap-4 transition-all uppercase tracking-widest bg-brand-50 dark:bg-brand-900/20 px-5 py-2.5 rounded-full w-fit shadow-sm hover:shadow-md"
                            >
                                <ArrowLeftIcon className="w-4 h-4" /> Volver al menú principal
                            </button>
                            <div className="animate-scale-in">
                                {renderContent()}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL DE AVISO DE ACTUALIZACIÓN */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 text-center">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-brand-600 mb-4 mx-auto animate-bounce">
                            <HistoryIcon className="w-8 h-8" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                            Aviso de Actualización
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 font-medium leading-relaxed">
                            Hola {user?.nombre || 'Administrador'}, se han cargado nuevos datos en el sistema.
                        </p>
                        <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-3 mb-6">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de actualización</p>
                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{data?.lastUpdated}</p>
                        </div>
                        <button 
                            onClick={handleCloseUpdateModal}
                            className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all"
                        >
                            ENTENDIDO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
