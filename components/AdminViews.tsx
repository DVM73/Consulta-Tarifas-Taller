
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, PointOfSale, Group, Report, AppData, UserRole, Departamento, Backup, Articulo, Tarifa, Family } from '../types';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import UploadIcon from './icons/UploadIcon';
import ExportIcon from './icons/ExportIcon';
import MailIcon from './icons/MailIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import HistoryIcon from './icons/HistoryIcon';
import SettingsIcon from './icons/SettingsIcon';
import HelpIcon from './icons/HelpIcon';
import SparklesIcon from './icons/SparklesIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import { getAppData, saveAllData, overwriteAllData } from '../services/dataService';

// --- VISTAS DE SOLO LECTURA PARA SUPERVISOR ---

export const ReadOnlyUsersList: React.FC<{ users: User[], posList: PointOfSale[] }> = ({ users, posList }) => {
    // Ordenamiento Numérico Estricto por Cód. Tienda
    const sortedUsers = useMemo(() => {
        const sorted = [...users];
        return sorted.sort((a, b) => {
            // Buscamos la tienda asociada a la zona de cada usuario
            const posA = posList.find(p => p.zona.toUpperCase() === a.zona.toUpperCase());
            const posB = posList.find(p => p.zona.toUpperCase() === b.zona.toUpperCase());
            
            // Extraemos el código numérico. 
            // Si no tiene tienda (ej. Admin, Supervisor General), usamos 99999 para que vaya al final.
            const codeA = posA && posA.código ? parseInt(posA.código, 10) : 99999;
            const codeB = posB && posB.código ? parseInt(posB.código, 10) : 99999;

            // Si los códigos son iguales (ej: dos empleados en la misma tienda)
            if (codeA === codeB) {
                // Ordenar alfabéticamente por nombre
                return a.nombre.localeCompare(b.nombre);
            }

            // Orden ascendente por código de tienda (1, 2, 7, 10...)
            return codeA - codeB;
        });
    }, [users, posList]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in max-h-[80vh] flex flex-col">
            <div className="p-6 border-b dark:border-slate-700 shrink-0">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Usuarios</h2>
            </div>
            <div className="overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Cód. Tienda</th>
                            <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Zona</th>
                            <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Nombre</th>
                            <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Departamento</th>
                            <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Grupo</th>
                            <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Ver PVP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                        {sortedUsers.map(u => {
                            const uPos = posList.find(p => p.zona === u.zona);
                            return (
                                <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="p-4 font-bold">{uPos?.código || '--'}</td>
                                    <td className="p-4 font-medium">{u.zona}</td>
                                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{u.nombre}</td>
                                    <td className="p-4 text-slate-500">{u.departamento}</td>
                                    <td className="p-4 text-slate-500">{u.grupo}</td>
                                    <td className="p-4 font-bold">{u.verPVP ? 'Sí' : 'No'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const ReadOnlyPOSList: React.FC<{ pos: PointOfSale[] }> = ({ pos }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in max-h-[80vh] flex flex-col">
        <div className="p-6 border-b dark:border-slate-700 shrink-0">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Puntos de Venta</h2>
        </div>
        <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Cód</th>
                        <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Zona</th>
                        <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Grupo</th>
                        <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Dirección</th>
                        <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Población</th>
                    </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                    {pos.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="p-4 font-bold">{p.código}</td>
                            <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{p.zona}</td>
                            <td className="p-4 text-slate-500">{p.grupo}</td>
                            <td className="p-4 text-slate-500 text-xs">{p.dirección}</td>
                            <td className="p-4 text-slate-500">{p.población}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export const ReadOnlyGroupsList: React.FC<{ groups: Group[] }> = ({ groups }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 max-w-2xl mx-auto overflow-hidden animate-fade-in">
        <div className="p-6 border-b dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 uppercase font-bold text-sm tracking-widest text-slate-700 dark:text-white">Grupos</div>
        <div className="p-4 divide-y dark:divide-slate-700">
            {groups.map(g => (
                <div key={g.id} className="py-4 flex justify-between items-center px-4 hover:bg-gray-50/50 dark:hover:bg-slate-900/30 transition-all">
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm tracking-wide">{g.nombre}</span>
                </div>
            ))}
        </div>
    </div>
);

// --- MODAL DE CONFIRMACIÓN ---
const ConfirmModal: React.FC<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel: () => void 
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all">
                <div className="p-8">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-6 mx-auto">
                        <TrashIcon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 text-center">{title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed text-center">{message}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-6 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-all uppercase tracking-widest">No, cancelar</button>
                    <button onClick={onConfirm} className="px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-600/20 transition-all uppercase tracking-widest">Sí, borrar</button>
                </div>
            </div>
        </div>
    );
};

interface ViewProps {
    onUpdate: (newData: Partial<AppData>) => void;
}

export const UsersList: React.FC<{ users: User[], posList: PointOfSale[] } & ViewProps> = ({ users, posList, onUpdate }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: '', name: '' });
    const [showPassword, setShowPassword] = useState(false);
    
    const [formData, setFormData] = useState({ 
        nombre: '', 
        clave: '', 
        zona: '', 
        grupo: '', 
        departamento: 'Carnicero/a' as Departamento, 
        rol: 'Normal' as UserRole, 
        verPVP: false 
    });

    const sortedUsers = useMemo(() => {
        const sorted = [...users];
        return sorted.sort((a, b) => {
            const posA = posList.find(p => p.zona.toUpperCase() === a.zona.toUpperCase());
            const posB = posList.find(p => p.zona.toUpperCase() === b.zona.toUpperCase());
            const codeA = posA && posA.código ? parseInt(posA.código, 10) : 99999;
            const codeB = posB && posB.código ? parseInt(posB.código, 10) : 99999;
            if (codeA === codeB) return a.nombre.localeCompare(b.nombre);
            return codeA - codeB;
        });
    }, [users, posList]);

    const handleZonaChange = (zona: string) => {
        const foundPos = posList.find(p => p.zona === zona);
        setFormData(prev => ({
            ...prev,
            zona,
            grupo: foundPos ? foundPos.grupo : ''
        }));
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormData({ 
            nombre: '', 
            clave: '', 
            zona: posList[0]?.zona || '', 
            grupo: posList[0]?.grupo || '', 
            departamento: 'Carnicero/a', 
            rol: 'Normal', 
            verPVP: false 
        });
        setIsFormOpen(true);
    };

    const openEdit = (u: User) => {
        setEditingUser(u);
        setFormData({ ...u });
        setIsFormOpen(true);
    };

    const handleSave = () => {
        if (!formData.nombre || !formData.clave) return;
        let updated = [...users];
        if (editingUser) updated = users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u);
        else updated.push({ id: Date.now().toString(), ...formData });
        onUpdate({ users: updated });
        setIsFormOpen(false);
    };

    if (isFormOpen) return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-10 animate-fade-in max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-8 uppercase tracking-tight">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Usuario</label>
                    <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium" placeholder="Nombre y apellidos..." />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contraseña</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={formData.clave} onChange={e => setFormData({...formData, clave: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-brand-600">
                            {showPassword ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Zona</label>
                    <select value={formData.zona} onChange={e => handleZonaChange(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium">
                        {posList.map(p => (
                            <option key={p.id} value={p.zona}>{p.zona}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grupo</label>
                    <input type="text" value={formData.grupo} disabled className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 font-bold outline-none cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Departamento</label>
                    <select value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium">
                        <option value="Carnicero/a">Carnicero/a</option>
                        <option value="Charcutero/a">Charcutero/a</option>
                        <option value="Carnicero/a y Charcutero/a">Carnicero/a y Charcutero/a</option>
                        <option value="Supervisor">Supervisor</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rol</label>
                    <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value as UserRole})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium">
                        <option value="Normal">Normal</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ver Precios (PVP)</label>
                    <select value={formData.verPVP ? "Si" : "No"} onChange={e => setFormData({...formData, verPVP: e.target.value === "Si"})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium">
                        <option value="No">No</option>
                        <option value="Si">Si</option>
                    </select>
                </div>
            </div>
            <div className="mt-12 flex justify-end gap-4">
                <button onClick={() => setIsFormOpen(false)} className="px-8 py-3 bg-gray-400 text-white font-bold rounded-lg uppercase text-xs tracking-widest hover:bg-gray-500 transition-all">Cancelar</button>
                <button onClick={handleSave} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-lg uppercase text-xs tracking-widest shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all">Guardar Usuario</button>
            </div>
        </div>
    );

    return (
        <>
            <ConfirmModal 
                isOpen={deleteConfig.isOpen} 
                title="¿Desea eliminar el usuario?" 
                message={`Esta acción borrará permanentemente a "${deleteConfig.name}" del sistema.`} 
                onConfirm={() => { onUpdate({ users: users.filter(u => u.id !== deleteConfig.id) }); setDeleteConfig({isOpen: false, id: '', name: ''}); }} 
                onCancel={() => setDeleteConfig({isOpen: false, id: '', name: ''})} 
            />
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
                <div className="p-6 flex justify-between items-center border-b dark:border-slate-700 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Administración de Usuarios</h2>
                    <button onClick={openCreate} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2"><PlusIcon className="w-4 h-4"/> Nuevo Usuario</button>
                </div>
                <div className="overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Cód. Tienda</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Zona</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Nombre</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Departamento</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Grupo</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Ver PVP</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {sortedUsers.map(u => {
                                const uPos = posList.find(p => p.zona === u.zona);
                                return (
                                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="p-4 font-bold">{uPos?.código || '--'}</td>
                                        <td className="p-4 font-medium">{u.zona}</td>
                                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{u.nombre}</td>
                                        <td className="p-4 text-slate-500">{u.departamento}</td>
                                        <td className="p-4 text-slate-500">{u.grupo}</td>
                                        <td className="p-4 font-bold">{u.verPVP ? 'SÍ' : 'NO'}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-4">
                                                <button onClick={() => openEdit(u)} className="text-brand-600 hover:scale-125 transition-all"><EditIcon className="w-5 h-5"/></button>
                                                <button onClick={() => setDeleteConfig({isOpen: true, id: u.id, name: u.nombre})} className="text-red-500 hover:scale-125 transition-all"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export const POSList: React.FC<{ pos: PointOfSale[] } & ViewProps> = ({ pos, onUpdate }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPOS, setEditingPOS] = useState<PointOfSale | null>(null);
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: '', name: '' });
    const [formData, setFormData] = useState({ código: '', zona: '', grupo: '', población: '', dirección: '' });
    
    const [groupsList, setGroupsList] = useState<Group[]>([]);

    useEffect(() => {
        getAppData().then(data => {
            setGroupsList(data.groups || []);
        });
    }, []);

    const openCreate = () => {
        setEditingPOS(null);
        setFormData({ código: '', zona: '', grupo: '', población: '', dirección: '' });
        setIsFormOpen(true);
    };

    const openEdit = (p: PointOfSale) => {
        setEditingPOS(p);
        setFormData({ ...p });
        setIsFormOpen(true);
    };

    const handleSave = () => {
        if (!formData.código || !formData.zona || !formData.grupo) {
             alert("Código, Zona y Grupo son obligatorios.");
             return;
        }

        const currentId = editingPOS?.id || '';
        const codeExists = pos.some(p => p.código === formData.código && p.id !== currentId);
        const zoneExists = pos.some(p => p.zona === formData.zona && p.id !== currentId);

        if (codeExists) {
            alert(`El código "${formData.código}" ya está asignado a otra tienda.`);
            return;
        }
        if (zoneExists) {
            alert(`La zona "${formData.zona}" ya existe.`);
            return;
        }

        let updated = [...pos];
        if (editingPOS) updated = pos.map(p => p.id === editingPOS.id ? { ...p, ...formData } : p);
        else updated.push({ id: Date.now().toString(), ...formData });
        onUpdate({ pos: updated });
        setIsFormOpen(false);
    };

    if (isFormOpen) return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-10 animate-fade-in max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-8 uppercase tracking-tight">Datos del Punto de Venta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Código (01-99)</label>
                    <input type="text" maxLength={2} value={formData.código} onChange={e => setFormData({...formData, código: e.target.value.replace(/\D/g,'')})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-bold" placeholder="01" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Zona (3 Dígitos)</label>
                    <input type="text" maxLength={3} value={formData.zona} onChange={e => setFormData({...formData, zona: e.target.value.toUpperCase()})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-bold uppercase" placeholder="CH2" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grupo</label>
                    <select value={formData.grupo} onChange={e => setFormData({...formData, grupo: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium">
                        <option value="">-- Seleccionar Grupo --</option>
                        {groupsList.map(g => (
                            <option key={g.id} value={g.nombre}>{g.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Población</label>
                    <input type="text" value={formData.población} onChange={e => setFormData({...formData, población: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium" placeholder="Ciudad..." />
                </div>
                <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dirección</label>
                    <input type="text" value={formData.dirección} onChange={e => setFormData({...formData, dirección: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-medium" placeholder="Calle, número..." />
                </div>
            </div>
            <div className="mt-10 flex justify-end gap-3">
                <button onClick={() => setIsFormOpen(false)} className="px-8 py-3 bg-gray-400 text-white font-bold rounded-lg uppercase text-xs tracking-widest hover:bg-gray-500 transition-all">Cancelar</button>
                <button onClick={handleSave} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-lg uppercase text-xs tracking-widest shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all">Guardar Tienda</button>
            </div>
        </div>
    );

    return (
        <>
            <ConfirmModal 
                isOpen={deleteConfig.isOpen} 
                title="¿Desea borrar este punto de venta?" 
                message={`Esta acción eliminará la zona "${deleteConfig.name}" definitivamente.`} 
                onConfirm={() => { onUpdate({ pos: pos.filter(p => p.id !== deleteConfig.id) }); setDeleteConfig({isOpen: false, id: '', name: ''}); }} 
                onCancel={() => setDeleteConfig({isOpen: false, id: '', name: ''})} 
            />
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
                <div className="p-6 flex justify-between items-center border-b dark:border-slate-700 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Administración de Puntos de Venta</h2>
                    <button onClick={openCreate} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2"><PlusIcon className="w-4 h-4"/> Añadir Tienda</button>
                </div>
                <div className="overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Cód</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Zona</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Grupo</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Dirección</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Población</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {pos.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="p-4 font-bold">{p.código}</td>
                                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{p.zona}</td>
                                    <td className="p-4 text-slate-500">{p.grupo}</td>
                                    <td className="p-4 text-slate-500 text-xs">{p.dirección}</td>
                                    <td className="p-4 text-slate-500">{p.población}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-4">
                                            <button onClick={() => openEdit(p)} className="text-brand-600 hover:scale-125 transition-all"><EditIcon className="w-5 h-5"/></button>
                                            <button onClick={() => setDeleteConfig({isOpen: true, id: p.id, name: p.zona})} className="text-red-500 hover:scale-125 transition-all"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export const GroupsList: React.FC<{ groups: Group[] } & ViewProps> = ({ groups, onUpdate }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [name, setName] = useState('');
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: '', name: '' });

    const openCreate = () => { setEditingGroup(null); setName(''); setIsFormOpen(true); };
    const openEdit = (g: Group) => { setEditingGroup(g); setName(g.nombre); setIsFormOpen(true); };

    const handleSave = () => {
        if (!name.trim()) return;
        let updated = [...groups];
        if (editingGroup) updated = groups.map(g => g.id === editingGroup.id ? { ...g, nombre: name } : g);
        else updated.push({ id: Date.now().toString(), nombre: name });
        onUpdate({ groups: updated });
        setIsFormOpen(false);
    };

    if (isFormOpen) return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 animate-fade-in max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-tight">{editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Grupo</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-bold" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setIsFormOpen(false)} className="px-6 py-2.5 bg-gray-400 text-white font-bold rounded-lg uppercase text-xs tracking-widest">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-lg uppercase text-xs tracking-widest shadow-lg shadow-brand-600/20">Guardar</button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <ConfirmModal 
                isOpen={deleteConfig.isOpen} 
                title="¿Eliminar Grupo?" 
                message={`Se borrará el grupo "${deleteConfig.name}".`} 
                onConfirm={() => { onUpdate({ groups: groups.filter(g => g.id !== deleteConfig.id) }); setDeleteConfig({isOpen: false, id: '', name: ''}); }} 
                onCancel={() => setDeleteConfig({isOpen: false, id: '', name: ''})} 
            />
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in max-w-2xl mx-auto flex flex-col max-h-[80vh]">
                <div className="p-6 flex justify-between items-center border-b dark:border-slate-700 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Gestión de Grupos</h2>
                    <button onClick={openCreate} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2"><PlusIcon className="w-4 h-4"/> Nuevo Grupo</button>
                </div>
                <div className="overflow-auto custom-scrollbar p-4 divide-y dark:divide-slate-700">
                    {groups.map(g => (
                        <div key={g.id} className="py-4 flex justify-between items-center px-4 hover:bg-gray-50/50 dark:hover:bg-slate-900/30 transition-all rounded-lg">
                            <span className="font-bold text-slate-700 dark:text-slate-200">{g.nombre}</span>
                            <div className="flex gap-4">
                                <button onClick={() => openEdit(g)} className="text-brand-600 hover:scale-110"><EditIcon className="w-4 h-4"/></button>
                                <button onClick={() => setDeleteConfig({isOpen: true, id: g.id, name: g.nombre})} className="text-red-500 hover:scale-110"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export const FamiliesList: React.FC<{ families: Family[] } & ViewProps> = ({ families, onUpdate }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingFamily, setEditingFamily] = useState<Family | null>(null);
    const [formData, setFormData] = useState({ id: '', nombre: '' });
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: '', name: '' });

    const openCreate = () => { setEditingFamily(null); setFormData({ id: '', nombre: '' }); setIsFormOpen(true); };
    const openEdit = (f: Family) => { setEditingFamily(f); setFormData({ ...f }); setIsFormOpen(true); };

    const handleSave = () => {
        if (!formData.id || !formData.nombre) return;
        let updated = [...families];
        if (editingFamily) {
             updated = families.map(f => f.id === editingFamily.id ? formData : f);
        } else {
             if (families.some(f => f.id === formData.id)) { alert("El código ya existe"); return; }
             updated.push(formData);
        }
        updated.sort((a,b) => parseInt(a.id) - parseInt(b.id));
        onUpdate({ families: updated });
        setIsFormOpen(false);
    };

    if (isFormOpen) return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 animate-fade-in max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-tight">{editingFamily ? 'Editar Familia' : 'Nueva Familia'}</h2>
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Código (Ej: 05)</label>
                    <input type="text" value={formData.id} disabled={!!editingFamily} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre</label>
                    <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-bold" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setIsFormOpen(false)} className="px-6 py-2.5 bg-gray-400 text-white font-bold rounded-lg uppercase text-xs tracking-widest">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-lg uppercase text-xs tracking-widest shadow-lg shadow-brand-600/20">Guardar</button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <ConfirmModal 
                isOpen={deleteConfig.isOpen} 
                title="¿Eliminar Familia?" 
                message={`Se borrará la familia "${deleteConfig.name}".`} 
                onConfirm={() => { onUpdate({ families: families.filter(f => f.id !== deleteConfig.id) }); setDeleteConfig({isOpen: false, id: '', name: ''}); }} 
                onCancel={() => setDeleteConfig({isOpen: false, id: '', name: ''})} 
            />
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in max-w-3xl mx-auto flex flex-col max-h-[80vh]">
                <div className="p-6 flex justify-between items-center border-b dark:border-slate-700 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Familias de Artículos</h2>
                    <button onClick={openCreate} className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2"><PlusIcon className="w-4 h-4"/> Nueva Familia</button>
                </div>
                <div className="overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Cód</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px] w-full">Descripción</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {families.map(f => (
                                <tr key={f.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-500">{f.id}</td>
                                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{f.nombre}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-4">
                                            <button onClick={() => openEdit(f)} className="text-brand-600 hover:scale-110"><EditIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setDeleteConfig({isOpen: true, id: f.id, name: f.nombre})} className="text-red-500 hover:scale-110"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export const DataUploadView: React.FC = () => {
    const artInputRef = useRef<HTMLInputElement>(null);
    const tarInputRef = useRef<HTMLInputElement>(null);
    
    // Estados separados para cada tipo de dato (Diseño Original)
    const [pendingArticulos, setPendingArticulos] = useState<Articulo[] | null>(null);
    const [pendingTarifas, setPendingTarifas] = useState<Tarifa[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const processFile = (content: string, type: 'articulos' | 'tarifas') => {
        const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(';');
            if (row.length < headers.length) continue;

            const obj: any = {};
            headers.forEach((h, index) => {
                let val = row[index] ? row[index].trim() : '';
                val = val.replace(/^"|"$/g, '').trim();
                
                // IMPORTANTE: Mapeo de Uni.Med a UniMed para la nueva estructura
                if (h === 'Uni.Med') {
                    obj['UniMed'] = val;
                } else {
                    obj[h] = val;
                }
            });
            result.push(obj);
        }
        return result;
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'articulos' | 'tarifas') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            try {
                const data = processFile(text, type);
                if (type === 'articulos') {
                    if (!data[0].Referencia) throw new Error("CSV Artículos inválido");
                    setPendingArticulos(data as Articulo[]);
                } else {
                    if (!data[0].Tienda) throw new Error("CSV Tarifas inválido");
                    setPendingTarifas(data as Tarifa[]);
                }
            } catch (error) {
                alert("Error procesando archivo: Formato incorrecto.");
            }
        };
        reader.readAsText(file, 'ISO-8859-1');
    };

    const handleUpdateDB = async () => {
        if (!pendingArticulos && !pendingTarifas) return;
        setLoading(true);
        
        const updates: Partial<AppData> = {};
        if (pendingArticulos) updates.articulos = pendingArticulos;
        if (pendingTarifas) updates.tarifas = pendingTarifas;
        
        await saveAllData(updates);
        
        setLoading(false);
        setPendingArticulos(null);
        setPendingTarifas(null);
        setSuccessMsg("¡Base de datos actualizada correctamente!");
        setTimeout(() => setSuccessMsg(''), 3000);
        
        if (artInputRef.current) artInputRef.current.value = '';
        if (tarInputRef.current) tarInputRef.current.value = '';
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-10 animate-fade-in max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center text-brand-600 mb-6 mx-auto">
                <UploadIcon className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-8 uppercase tracking-tight">Carga de Datos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* CAJA ARTÍCULOS */}
                <div className={`border-2 border-dashed rounded-xl p-8 transition-colors ${pendingArticulos ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-slate-600'}`}>
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-sm uppercase">Archivo de Artículos (CSV)</h3>
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={artInputRef}
                        onChange={(e) => handleFile(e, 'articulos')} 
                        className="hidden" 
                        id="file-art"
                    />
                    <label htmlFor="file-art" className="bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-brand-300 px-6 py-3 rounded-lg font-bold text-xs uppercase cursor-pointer hover:bg-brand-100 dark:hover:bg-slate-600 transition-colors inline-block">
                        Seleccionar Archivo
                    </label>
                    {pendingArticulos && (
                        <p className="mt-4 text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">
                            ✓ {pendingArticulos.length} artículos leídos
                        </p>
                    )}
                </div>

                {/* CAJA TARIFAS */}
                <div className={`border-2 border-dashed rounded-xl p-8 transition-colors ${pendingTarifas ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-slate-600'}`}>
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-sm uppercase">Archivo de Tarifas (CSV)</h3>
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={tarInputRef}
                        onChange={(e) => handleFile(e, 'tarifas')} 
                        className="hidden" 
                        id="file-tar"
                    />
                    <label htmlFor="file-tar" className="bg-brand-50 dark:bg-slate-700 text-brand-600 dark:text-brand-300 px-6 py-3 rounded-lg font-bold text-xs uppercase cursor-pointer hover:bg-brand-100 dark:hover:bg-slate-600 transition-colors inline-block">
                        Seleccionar Archivo
                    </label>
                    {pendingTarifas && (
                        <p className="mt-4 text-green-600 dark:text-green-400 text-xs font-bold animate-pulse">
                            ✓ {pendingTarifas.length} tarifas leídas
                        </p>
                    )}
                </div>
            </div>

            <button 
                onClick={handleUpdateDB}
                disabled={(!pendingArticulos && !pendingTarifas) || loading}
                className="w-full bg-brand-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all uppercase text-xs tracking-widest"
            >
                {loading ? 'ACTUALIZANDO...' : 'ACTUALIZAR BASE DE DATOS'}
            </button>
            
            {successMsg && (
                <div className="mt-6 p-4 bg-green-100 text-green-700 rounded-lg font-bold text-sm animate-fade-in">
                    {successMsg}
                </div>
            )}
        </div>
    );
};

// Componente Unificado de Gestión de Datos (Exportación e Importación)
export const DataManagementView: React.FC = () => {
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-10 text-center flex flex-col justify-center h-full">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 mb-6 mx-auto">
                    <ExportIcon className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Exportar Base de Datos</h2>
                <p className="text-slate-500 mb-8">Descarga una copia completa de todos los datos en formato JSON para seguridad o migración.</p>
                <button onClick={handleExport} className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                    <ExportIcon className="w-5 h-5"/> Descargar Copia JSON
                </button>
            </div>

            {/* SECCIÓN DE IMPORTACIÓN */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-10 text-center flex flex-col justify-center h-full">
                <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 mb-6 mx-auto">
                    <ArrowDownIcon className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Importar Base de Datos</h2>
                <p className="text-slate-500 mb-8">Restaura el sistema completo cargando un archivo JSON previamente exportado.</p>
                
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
                    className={`w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <UploadIcon className="w-5 h-5"/> {loading ? 'Restaurando...' : 'Seleccionar Archivo JSON'}
                </label>
            </div>
        </div>
    );
};

export const ReportsInboxView: React.FC<{ reports: Report[], onUpdate: any, onRefresh: any }> = ({ reports, onUpdate, onRefresh }) => {
    const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, id: '', name: '' });

    const markAsRead = (r: Report) => {
        const updated = reports.map(rep => rep.id === r.id ? { ...rep, read: true } : rep);
        onUpdate({ reports: updated });
    };

    const downloadCSV = (r: Report) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([r.csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `reporte_${r.supervisorName}_${r.date.replace(/\//g,'-')}.csv`;
        link.click();
        markAsRead(r);
    };

    const handleDelete = () => {
        const updated = reports.filter(r => r.id !== deleteConfig.id);
        onUpdate({ reports: updated });
        setDeleteConfig({ isOpen: false, id: '', name: '' });
    };

    return (
        <>
            <ConfirmModal 
                isOpen={deleteConfig.isOpen} 
                title="¿Eliminar Reporte?" 
                message={`Se borrará el reporte de ${deleteConfig.name}.`} 
                onConfirm={handleDelete} 
                onCancel={() => setDeleteConfig({isOpen: false, id: '', name: ''})} 
            />
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
                <div className="p-6 border-b dark:border-slate-700 shrink-0 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2"><MailIcon className="w-5 h-5"/> Buzón de Reportes</h2>
                    <button onClick={onRefresh} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Actualizar</button>
                </div>
                <div className="overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Estado</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Fecha</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Supervisor</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Zona</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px]">Tipo</th>
                                <th className="p-4 bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 text-slate-500 font-bold uppercase text-[10px] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-700">
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-400 italic">No hay reportes recibidos.</td>
                                </tr>
                            )}
                            {reports.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="p-4">
                                        {r.read ? (
                                            <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-[10px] uppercase bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-100 dark:border-green-800 w-fit">
                                                ✓ DESCARGADO
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase border border-dashed border-slate-300 px-2 py-1 rounded w-fit">
                                                ○ PENDIENTE
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{r.date}</td>
                                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{r.supervisorName}</td>
                                    <td className="p-4 text-slate-500">{r.zoneFilter}</td>
                                    <td className="p-4">
                                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-yellow-200">{r.type}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-4">
                                            <button onClick={() => downloadCSV(r)} className="text-green-600 hover:scale-125 transition-all" title="Descargar CSV">
                                                <ExportIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => setDeleteConfig({isOpen: true, id: r.id, name: r.supervisorName})} className="text-red-500 hover:scale-125 transition-all" title="Borrar Reporte">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export const BackupView: React.FC<{ backups: Backup[], currentData: AppData, onUpdate: any }> = ({ backups, currentData, onUpdate }) => {
    const createBackup = () => {
        const newBackup: Backup = {
            id: Date.now().toString(),
            nombre: `Backup ${new Date().toLocaleString()}`,
            fecha: new Date().toLocaleString(),
            data: currentData
        };
        onUpdate({ backups: [newBackup, ...backups] });
    };

    const restoreBackup = (b: Backup) => {
        if (confirm("¿Estás seguro? Se sobrescribirán todos los datos actuales con esta copia.")) {
            overwriteAllData(b.data);
            alert("Sistema restaurado. Se recargará la página.");
            window.location.reload();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 text-center h-fit">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 mb-4 mx-auto">
                    <HistoryIcon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Crear Punto de Restauración</h3>
                <p className="text-xs text-slate-500 mb-6">Guarda el estado actual del sistema antes de hacer cambios importantes.</p>
                <button onClick={createBackup} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-green-600/20 transition-all">Crear Backup Ahora</button>
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col max-h-[600px]">
                <div className="p-6 border-b dark:border-slate-700 font-bold uppercase text-sm tracking-widest text-slate-700 dark:text-white">Historial de Copias</div>
                <div className="overflow-auto custom-scrollbar p-4 space-y-3">
                    {backups.length === 0 && <div className="text-center p-10 text-slate-400 italic">No hay copias de seguridad.</div>}
                    {backups.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-100 dark:border-slate-700">
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{b.nombre}</h4>
                                <p className="text-xs text-slate-400">{b.fecha}</p>
                            </div>
                            <button onClick={() => restoreBackup(b)} className="text-xs font-bold text-brand-600 hover:underline uppercase tracking-widest">Restaurar</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const SettingsView: React.FC<{ companyName?: string, onUpdate: any }> = ({ companyName, onUpdate }) => {
    const [name, setName] = useState(companyName || '');
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-slate-400"/> Configuración General
            </h2>
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre de la Empresa</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 focus:border-brand-500 outline-none font-bold" />
                </div>
                <button onClick={() => onUpdate({ companyName: name })} className="w-full bg-brand-600 text-white font-bold py-3 rounded-lg uppercase text-xs tracking-widest shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all mt-4">
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
};
