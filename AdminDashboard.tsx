
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
import { UsersList, POSList, GroupsList, DataUploadView, DataManagementView, ReportsInboxView, BackupView, SettingsView, FamiliesList } from './AdminViews';

const AdminDashboard: React.FC = () => {
    const { logout, user } = useContext(AppContext);
    const [view, setView] = useState<AdminView>('menu');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AppData | null>(null);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setLoading(true);
        getAppData().then(res => {
            setData(res);
            setLoading(false);
        }).catch(() => setLoading(false));
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
            case 'upload': return <DataUploadView />;
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
        { id: 'upload', label: 'Carga de datos', desc: 'Subir archivos CSV de artículos y tarifas.', icon: UploadIcon },
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
        <div className="h-screen flex flex-col bg-[#f3f4f6] dark:bg-slate-950 font-sans overflow-hidden">
            <header className="bg-white dark:bg-slate-900 h-14 px-6 flex justify-between items-center border-b dark:border-slate-800 z-20">
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Panel de Administrador</h1>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                        <UserIcon className="w-4 h-4" />
                        <span>{user?.nombre} ({user?.rol})</span>
                    </div>
                    <ThemeToggle />
                    <button className="text-slate-400 hover:text-brand-600 transition-colors">
                        <ChatIcon className="w-5 h-5" />
                    </button>
                    <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors">
                        <LogoutIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {view === 'menu' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id as AdminView)}
                                    className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center group hover:shadow-md transition-all relative"
                                >
                                    {/* NOTIFICACIÓN CON BANDERA ROJA */}
                                    {item.id === 'reports' && unreadReports > 0 && (
                                        <div className="absolute top-4 right-4 animate-pulse">
                                            <div className="relative">
                                                <FlagIcon className="w-8 h-8 text-red-600 fill-red-600 drop-shadow-md" />
                                                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-red-100 shadow-sm">
                                                    {unreadReports}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="mb-6 text-brand-500">
                                        {/* @ts-ignore: Manejo de iconos personalizados vs componentes */}
                                        {item.isCustomIcon ? <item.icon /> : <item.icon className="w-12 h-12 stroke-[1.5]" />}
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-base mb-2">{item.label}</h3>
                                    <p className="text-slate-400 text-xs">{item.desc}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <button 
                                onClick={() => setView('menu')} 
                                className="flex items-center gap-2 text-brand-600 font-bold text-xs mb-8 hover:underline uppercase tracking-widest"
                            >
                                <ArrowLeftIcon className="w-4 h-4" /> Volver al menú principal
                            </button>
                            {renderContent()}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
