
import { AppData } from '../types';
import { db } from './firebase';
import { 
    doc, 
    getDoc, 
    setDoc, 
    getDocs, 
    collection, 
    Timestamp as FirestoreTimestamp 
} from "firebase/firestore";
import { usuariosRawData } from '../data/usuarios';
import { articulosRawData } from '../data/articulos';
import { tarifasRawData } from '../data/tarifas';
import { familiesRawData } from '../data/families';

const DATA_KEY = 'appData';
const DB_NAME = 'ConsultaTarifasDB_v11'; // BUMP VERSION DB
const STORE_NAME = 'appDataStore';

let appDataPromise: Promise<AppData> | null = null;
let dbInstance: IDBDatabase | null = null;

// --- INDEXED DB HELPERS (Caché Local) ---

const openDB = (): Promise<IDBDatabase> => {
    if (dbInstance) return Promise.resolve(dbInstance);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };
        request.onerror = () => reject(request.error);
    });
};

const dbGet = async (key: string): Promise<any> => {
    try {
        const idb = await openDB();
        return new Promise((res, rej) => {
            const tx = idb.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
            tx.onsuccess = () => res(tx.result);
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn("Error leyendo IndexedDB:", e);
        return null;
    }
};

const dbPut = async (key: string, value: any): Promise<void> => {
    try {
        const idb = await openDB();
        return new Promise((res, rej) => {
            const tx = idb.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(value, key);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn("Error escribiendo IndexedDB:", e);
    }
};

// --- DATA SANITIZATION ---

const sanitizeAppData = (data: any): AppData => {
    const s = (v: any) => String(v || '').trim();
    return {
        users: data.users?.map((u: any) => ({...u, id: s(u.id || Math.random()), nombre: s(u.nombre)})) || [],
        pos: data.pos?.map((p: any) => ({...p, id: s(p.id || Math.random()), zona: s(p.zona)})) || [],
        articulos: data.articulos || [],
        tarifas: data.tarifas || [],
        groups: data.groups || [],
        families: data.families || familiesRawData, // Si no existen familias, usar las raw por defecto
        companyName: s(data.companyName) || "Paraíso de la Carne Selección, S.L.U.",
        lastUpdated: s(data.lastUpdated) || new Date().toLocaleString(),
        reports: data.reports || [],
        backups: data.backups || [],
    };
};

// --- MAIN LOAD FUNCTION ---

async function loadAndInitializeData(): Promise<AppData> {
    // 1. CARGA DIRECTA DE FIREBASE (Prioridad Absoluta - Modo Producción)
    if (db) {
        try {
            console.log("🌐 Conectando a Firebase...");
            
            const [usersSnap, posSnap, artSnap, tarSnap, groupSnap, mainDocSnap] = await Promise.all([
                getDocs(collection(db, "users")),
                getDocs(collection(db, "pos")),
                getDocs(collection(db, "articulos")),
                getDocs(collection(db, "tarifas")),
                getDocs(collection(db, "groups")),
                getDoc(doc(db, "appData", "main")) 
            ]);

            if (!usersSnap.empty || !artSnap.empty || !posSnap.empty) {
                console.log(`✅ Datos nube: ${artSnap.size} arts, ${tarSnap.size} tarifas.`);
                
                const cloudData: any = {
                    users: usersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    pos: posSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    articulos: artSnap.docs.map(d => d.data()),
                    tarifas: tarSnap.docs.map(d => d.data()),
                    groups: groupSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    ...(mainDocSnap.exists() ? mainDocSnap.data() : {}),
                    lastUpdated: new Date().toLocaleString()
                };

                const sanitized = sanitizeAppData(cloudData);
                await dbPut(DATA_KEY, sanitized);
                return sanitized;
            }

            if (mainDocSnap.exists()) {
                const mainData = sanitizeAppData(mainDocSnap.data());
                await dbPut(DATA_KEY, mainData);
                return mainData;
            }

        } catch (e) {
            console.error("❌ Error red Firebase. Pasando a local.", e);
        }
    } else {
        console.warn("🟡 MODO LOCAL: Firebase no configurado.");
    }

    // 2. FALLBACK A CACHÉ LOCAL (Modo Offline o Recarga en Preview)
    const cachedLocal = await dbGet(DATA_KEY);
    if (cachedLocal && cachedLocal.users && cachedLocal.users.length > 0) {
        console.log("📂 Usando datos locales persistentes.");
        return sanitizeAppData(cachedLocal);
    }

    // 3. DATOS DE DEMO INICIALES (Primera carga en Preview)
    console.log("🚀 Inicializando BD Local con Datos Demo.");

    const demoData = sanitizeAppData({
        users: usuariosRawData.users,
        pos: usuariosRawData.pos,
        groups: usuariosRawData.groups,
        articulos: articulosRawData,
        tarifas: tarifasRawData,
        families: familiesRawData,
        companyName: "Paraíso de la Carne (DEMO LOCAL / PREVIEW)",
        lastUpdated: "Modo Local Inicial"
    });
    
    await dbPut(DATA_KEY, demoData);
    
    return demoData;
}

export function getAppData(): Promise<AppData> {
    if (!appDataPromise) appDataPromise = loadAndInitializeData();
    return appDataPromise;
}

export async function saveAllData(updates: Partial<AppData>): Promise<void> {
    const current = await getAppData();
    const now = Date.now();
    
    // Solo actualizamos la fecha si hay cambios en artículos o tarifas
    const shouldUpdateDate = updates.articulos || updates.tarifas;
    const lastUpdated = shouldUpdateDate ? new Date().toLocaleString() : current.lastUpdated;

    const updated = sanitizeAppData({ 
        ...current, 
        ...updates, 
        lastUpdated 
    });
    
    // 1. Guardar LOCAL (IndexedDB) - Esto permite trabajar en la Preview
    await dbPut(DATA_KEY, updated);
    appDataPromise = Promise.resolve(updated);
    console.log("💾 Datos guardados en navegador (Modo Local).");

    // 2. Guardar NUBE (Firebase) - Solo si hay conexión real
    if (db) {
        try {
            console.log("☁️ Subiendo a la nube...");
            await setDoc(doc(db, "appData", "main"), { 
                ...updated, 
                serverTimestamp: FirestoreTimestamp.fromMillis(now) 
            });
            console.log("✅ Sincronizado con nube.");
        } catch (e) {
            console.warn("⚠️ Sin conexión a nube. Los datos solo están en este dispositivo.", e);
        }
    }
}

export async function overwriteAllData(newData: AppData): Promise<void> {
    const now = Date.now();
    const updated = sanitizeAppData({ ...newData, lastUpdated: new Date().toLocaleString() });
    
    await dbPut(DATA_KEY, updated);
    appDataPromise = Promise.resolve(updated);
    console.log("🔄 Restauración completa en modo local.");
    
    if (db) {
        try {
            await setDoc(doc(db, "appData", "main"), { 
                ...updated, 
                serverTimestamp: FirestoreTimestamp.fromMillis(now) 
            });
        } catch (e) {
            console.warn("⚠️ Error restaurando en nube:", e);
        }
    }
}

export const saveSession = async (userId: string, sessionData: any) => {
    await dbPut(`session_${userId}`, sessionData);
};

export const getSession = async (userId: string) => {
    return await dbGet(`session_${userId}`);
};

export const deleteSession = async (userId: string) => {
    try {
        const idb = await openDB();
        return new Promise<void>((res, rej) => {
            const tx = idb.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(`session_${userId}`);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    } catch (e) {
        console.warn("Error borrando sesión en IndexedDB:", e);
    }
};
