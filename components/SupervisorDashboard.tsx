
import React, { useContext, useState, useEffect, Suspense } from 'react';
import { AppContext } from '../context/AppContext';
import { getAppData } from '../services/dataService';
import { AppData, PointOfSale } from '../types';
import { ReadOnlyPOSList, ReadOnlyGroupsList, ReadOnlyUsersList } from './AdminViews';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import LogoutIcon from './icons/LogoutIcon';
import ThemeToggle from './ThemeToggle';
import BuildingIcon from './icons/BuildingIcon';
import SearchIcon from './icons/SearchIcon';
import UserIcon from './icons/UserIcon';
import TagIcon from './icons/TagIcon';
import ExportIcon from './icons/ExportIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CloseIcon from './icons/CloseIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import HistoryIcon from './icons/HistoryIcon';

// Carga perezosa del dashboard de usuario para evitar bloqueos síncronos
const UserDashboard = React.lazy(() => import('./UserDashboard'));

type SupervisorView = 'menu' | 'tarifas' | 'pos' | 'users' | 'groups' | 'inventarios' | 'tarifas_impreso';

const SupervisorDashboard: React.FC = () => {
  const { user, logout } = useContext(AppContext);
  const [view, setView] = useState<SupervisorView>('menu');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para Inventarios
  const [invMonth, setInvMonth] = useState(new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date()).toUpperCase());
  const [invYear, setInvYear] = useState(new Date().getFullYear().toString());
  const [selectedPosIds, setSelectedPosIds] = useState<string[]>([]);

  // Estados para Tarifas
  const [tarPosId, setTarPosId] = useState('');
  const [tarHeaderColor, setTarHeaderColor] = useState('#1e1b4b');
  const [tarMarginColor, setTarMarginColor] = useState('#7c2d12');
  const [tarShowPvp, setTarShowPvp] = useState('Si');
  const [tarRevisionDate, setTarRevisionDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
      getAppData().then(appData => {
          setData(appData);
          if (appData.pos && appData.pos.length > 0) {
              setTarPosId(appData.pos[0].id);
          }
          setLoading(false);
      });
  }, []);

  if (loading) return (
      <div className="h-screen flex items-center justify-center bg-[#f3f4f6]">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
  );

  // --- LÓGICA DE GENERACIÓN DE INVENTARIOS ---
  const handleGenerateInventory = async () => {
      if (selectedPosIds.length === 0) {
          alert("⚠️ Debes seleccionar al menos una tienda para generar los inventarios.");
          return;
      }
      
      const FAMILIAS_ANEXO = ['13', '14', '19']; // Envases, Especias, Limpieza

      let generatedCount = 0;

      for (const posId of selectedPosIds) {
          const pos = data?.pos.find(p => p.id === posId);
          if (!pos) continue;

          await new Promise(resolve => setTimeout(resolve, 300));

          const doc = new jsPDF();
          
          const mainArticles = (data?.articulos || []).filter(art => {
              const tarifa = data?.tarifas.find(t => 
                  t.Tienda === pos.zona && 
                  String(t['Cód. Art.']).trim() === String(art.Referencia).trim()
              );
              return tarifa && tarifa['P.V.P.'] && !FAMILIAS_ANEXO.includes(art.Familia);
          });

          mainArticles.sort((a, b) => {
              const secA = parseInt(a.Sección) || 99;
              const secB = parseInt(b.Sección) || 99;
              if (secA !== secB) return secA - secB;
              return a.Descripción.localeCompare(b.Descripción);
          });

          const appendixArticles = (data?.articulos || []).filter(art => 
              FAMILIAS_ANEXO.includes(art.Familia)
          );
          appendixArticles.sort((a, b) => a.Descripción.localeCompare(b.Descripción));

          generateInventoryTable(doc, pos, mainArticles, `INVENTARIO CARNICERÍA/CHARCUTERÍA - ${invMonth} ${invYear}`);

          if (appendixArticles.length > 0) {
              if (mainArticles.length > 0) doc.addPage();
              generateInventoryTable(doc, pos, appendixArticles, `INVENTARIO ESPECIAS / ENVASES / LIMPIEZA - ${invMonth} ${invYear}`);
          }

          const pageCount = doc.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
          }

          doc.save(`Inventario_${pos.zona}_${invMonth}_${invYear}.pdf`);
          generatedCount++;
      }

      alert(`✅ Proceso finalizado. Se han enviado a descargar ${generatedCount} archivos.`);
  };

  const generateInventoryTable = (doc: jsPDF, pos: PointOfSale, articles: any[], title: string) => {
        const headerText = `${title}   -   TIENDA: ${pos.zona} (${pos.código}) - ${pos.población}`;

        autoTable(doc, {
            body: [[{ 
                content: headerText, 
                styles: { halign: 'center', valign: 'middle', fontSize: 10, fontStyle: 'bold' } 
            }]],
            theme: 'plain',
            styles: { 
                lineWidth: 0.3, 
                lineColor: [0, 0, 0],
                minCellHeight: 12 
            },
            margin: { top: 10, left: 10, right: 10 },
            pageBreak: 'avoid'
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY, 
            head: [['C.Art', 'Secc.', 'Descripción', 'EXISTENCIAS', 'NOTA']],
            body: articles.map(art => [
                art.Referencia,
                art.Sección,
                art.Descripción,
                '',
                ''
            ]),
            theme: 'grid',
            styles: { 
                fontSize: 8,
                cellPadding: 1.5, 
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                textColor: [0,0,0],
                valign: 'middle', 
                minCellHeight: 6 
            },
            headStyles: { 
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.2, 
                lineColor: [0, 0, 0],
                halign: 'center',
                valign: 'middle',
                minCellHeight: 8
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 'auto', halign: 'left' },
                3: { cellWidth: 25 },
                4: { cellWidth: 40 }
            },
            margin: { left: 10, right: 10, bottom: 15 }
        });
  };

  // --- LÓGICA DE GENERACIÓN DE TARIFAS (CORREGIDA) ---
  const handleGenerateTariff = () => {
      if (!tarPosId) {
          alert("⚠️ Selecciona una tienda válida.");
          return;
      }
      
      const selectedPos = data?.pos.find(p => p.id === tarPosId);
      if (!selectedPos) return;

      try {
        const doc = new jsPDF();
        const companyName = data?.companyName || "Paraíso de la Carne Selección, S.L.U.";
        const fechaRev = new Date(tarRevisionDate).toLocaleDateString('es-ES');
        const showPvp = tarShowPvp === 'Si';

        // 1. OBTENER NOMBRE COMERCIAL
        let nombreTienda = `Carnicería ${selectedPos.zona}`;
        // Mapeo manual según ejemplos solicitados (esto idealmente iría en BD)
        const zoneMap: Record<string, string> = {
            'ATA': 'Carnicería El Buen Corte',
            'TO3': 'Carnicería Villalba',
            'EC2': 'Carnicería Medina',
            // Añadir más mapeos aquí si se conocen
        };
        if (zoneMap[selectedPos.zona]) {
            nombreTienda = zoneMap[selectedPos.zona];
        }

        // 2. DEFINIR COLUMNAS
        // Si no se muestra PVP, eliminamos la columna completamente.
        const headers = [['Mostrador', 'Familia', 'Código', 'Uni.Med', 'Artículo']];
        if (showPvp) {
            headers[0].push('PVP');
        }

        // 3. OBTENER Y PROCESAR DATOS
        const allArticles = (data?.articulos || []).filter(art => {
            const hasTariff = data?.tarifas.some(t => 
                t.Tienda === selectedPos.zona && 
                String(t['Cód. Art.']).trim() === String(art.Referencia).trim() &&
                t['P.V.P.']
            );
            return hasTariff;
        });

        if (allArticles.length === 0) {
            alert("⚠️ No hay artículos con precio asignado para esta tienda.");
            return;
        }

        // 4. ORDENAR: 1º Sección (Mostrador), 2º Alfabético
        allArticles.sort((a, b) => {
            const secA = parseInt(a.Sección) || 99;
            const secB = parseInt(b.Sección) || 99;
            if (secA !== secB) return secA - secB;
            return a.Descripción.localeCompare(b.Descripción);
        });

        // 5. AGRUPAR POR MOSTRADOR (SECCIÓN)
        // Esto es necesario para separar la paginación y cortar página entre mostradores.
        const sections: Record<string, any[]> = {};
        allArticles.forEach(art => {
            const sec = art.Sección || 'Otros';
            if (!sections[sec]) sections[sec] = [];
            
            const tariff = data?.tarifas.find(t => 
                t.Tienda === selectedPos.zona && 
                String(t['Cód. Art.']).trim() === String(art.Referencia).trim()
            );
            
            let precioStr = '-';
            if (tariff && tariff['P.V.P.']) {
                const num = parseFloat(String(tariff['P.V.P.']).replace(',', '.'));
                if (!isNaN(num)) precioStr = num.toLocaleString('es-ES', {minimumFractionDigits: 2}) + ' €';
            }

            const row = [
                art.Sección, 
                art.Familia, 
                art.Referencia, 
                art.UniMed || 'U', // Default U si no tiene
                art.Descripción
            ];
            if (showPvp) row.push(precioStr);
            
            sections[sec].push(row);
        });

        // 6. GENERAR TABLAS
        const sortedSectionKeys = Object.keys(sections).sort((a, b) => (parseInt(a)||99) - (parseInt(b)||99));
        
        let isFirstTable = true;

        for (const secKey of sortedSectionKeys) {
            const rows = sections[secKey];
            
            // Si no es la primera tabla, añadimos página nueva para separar mostrador
            if (!isFirstTable) {
                doc.addPage();
            }
            isFirstTable = false;

            // Guardamos la página donde empieza este mostrador
            const startPage = doc.getNumberOfPages();

            autoTable(doc, {
                head: headers,
                body: rows,
                theme: 'grid',
                startY: 35, // Espacio para cabecera fija
                styles: {
                    fontSize: 9,
                    cellPadding: 1,
                    lineColor: [0, 0, 0], 
                    lineWidth: 0.1,
                    textColor: [0, 0, 0],
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [255, 228, 196], 
                    textColor: [100, 50, 0], 
                    fontStyle: 'bold',
                    halign: 'center',
                    lineWidth: 0.2, 
                    lineColor: [0, 0, 0]
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center' }, // Mostrador
                    1: { cellWidth: 15, halign: 'center' }, // Familia
                    2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Código
                    3: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Uni.Med
                    4: { cellWidth: 'auto' }, // Artículo
                    5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } // PVP
                },
                // DIBUJAR CABECERAS Y PIES DE PÁGINA
                didDrawPage: (data) => {
                    const pageNumber = doc.getNumberOfPages();
                    
                    // --- CABECERA (Repetida en cada página) ---
                    // Línea 1: TIENDA ### EMPRESA
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(150, 75, 0); 
                    doc.text(`${nombreTienda.toUpperCase()} ### ${companyName.toUpperCase()}`, 105, 15, { align: 'center' });
                    
                    // Línea 2: FECHA REVISIÓN (Debajo, separada)
                    doc.setFontSize(10);
                    doc.setTextColor(0);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Fecha Revisión: ${fechaRev}`, 105, 22, { align: 'center' }); // Centrado debajo del título

                    // --- PIE DE PÁGINA ---
                    const footerY = doc.internal.pageSize.height - 10;
                    doc.setFontSize(8);
                    
                    // Izquierda: Carnicería // [ZONA]
                    doc.text(`Carnicería // ${selectedPos.zona}`, 14, footerY);
                    
                    // Derecha: Página X de Y (Calculado posteriormente o aquí si es global, 
                    // pero para "por mostrador" necesitamos saber cuantas páginas ocupa la tabla actual)
                    // Como autoTable no nos dice el total de páginas de la tabla actual FÁCILMENTE durante el dibujo,
                    // usaremos un marcador temporal o lógica post-proceso.
                    // ESTRATEGIA SIMPLE Y ROBUSTA: Escribimos el pie de página AL FINAL del bucle de sección.
                }
            });

            // LÓGICA DE NUMERACIÓN DE PÁGINA POR MOSTRADOR
            // Recorremos las páginas que ocupó esta sección y escribimos el número
            const endPage = doc.getNumberOfPages();
            const totalPagesInSection = endPage - startPage + 1;
            
            for (let i = startPage; i <= endPage; i++) {
                doc.setPage(i);
                const currentPageInSection = i - startPage + 1;
                const footerY = doc.internal.pageSize.height - 10;
                doc.setFontSize(8);
                doc.setTextColor(0);
                doc.text(`Página ${currentPageInSection} de ${totalPagesInSection}`, 196, footerY, { align: 'right' });
            }
        }

        doc.save(`Tarifa_${selectedPos.zona}_${tarRevisionDate}.pdf`);
        
      } catch (error) {
          console.error(error);
          alert("❌ Error generando el PDF de tarifas.");
      }
  };

  const renderViewContent = () => {
    if (!data) return null;
    switch(view) {
        case 'tarifas': return (
            <Suspense fallback={<div className="p-10 text-center">Cargando Tarifas...</div>}>
                <UserDashboard onBack={() => setView('menu')} />
            </Suspense>
        );
        case 'pos': return <ReadOnlyPOSList pos={data.pos} />;
        case 'groups': return <ReadOnlyGroupsList groups={data.groups} />;
        case 'users': return <ReadOnlyUsersList users={data.users} posList={data.pos} />;
        
        case 'inventarios': return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 flex justify-between items-center border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-2 rounded-lg text-brand-600"><ArrowUpIcon className="w-6 h-6 rotate-45"/></div>
                            <h2 className="text-2xl font-bold text-slate-800">Impresos Inventarios</h2>
                        </div>
                        <button onClick={() => setView('menu')} className="text-gray-400 hover:text-gray-600 transition-colors"><CloseIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto">
                        <div className="space-y-8">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Configuración de Fecha</h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase">Mes del Inventario</label>
                                    <select value={invMonth} onChange={e => setInvMonth(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 font-bold text-sm uppercase">
                                        {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-600 uppercase">Año</label>
                                    <input type="number" value={invYear} onChange={e => setInvYear(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 font-bold text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Puntos de Venta</h3>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={selectedPosIds.length === data.pos.length} onChange={e => setSelectedPosIds(e.target.checked ? data.pos.map(p => p.id) : [])} className="rounded text-brand-600" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Todas</span>
                                </label>
                            </div>
                            <div className="h-[240px] overflow-y-auto pr-2 custom-scrollbar space-y-2 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                                {data.pos.map(p => (
                                    <label key={p.id} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-brand-50 transition-colors border border-gray-100 hover:border-brand-200 shadow-sm">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPosIds.includes(p.id)} 
                                            onChange={e => setSelectedPosIds(e.target.checked ? [...selectedPosIds, p.id] : selectedPosIds.filter(id => id !== p.id))}
                                            className="rounded text-brand-600 w-4 h-4" 
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 font-bold w-8 text-center bg-gray-100 rounded">[{p.código}]</span>
                                            <span className="text-xs font-bold text-slate-700">{p.zona}</span>
                                            <span className="text-[10px] text-slate-400 font-medium ml-auto truncate max-w-[100px]">{p.población}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-100 flex flex-col items-center bg-gray-50/30 shrink-0">
                        <button onClick={handleGenerateInventory} className="bg-brand-600 hover:bg-brand-700 text-white px-10 py-4 rounded-xl font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-brand-600/20">
                            <ArrowUpIcon className="w-5 h-5 rotate-45"/> GENERAR {selectedPosIds.length > 0 ? selectedPosIds.length : ''} ARCHIVOS PDF
                        </button>
                        <p className="text-[10px] text-slate-400 mt-3 font-medium">Se descargará un archivo independiente por cada tienda seleccionada.</p>
                    </div>
                </div>
            </div>
        );

        case 'tarifas_impreso': return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 flex justify-between items-center border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-2 rounded-lg text-brand-600"><TagIcon className="w-6 h-6"/></div>
                            <h2 className="text-2xl font-bold text-slate-800">Impresos Tarifas</h2>
                        </div>
                        <button onClick={() => setView('menu')} className="text-gray-400 hover:text-gray-600 transition-colors"><CloseIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="p-8 space-y-8 overflow-y-auto">
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Selección de Tienda</h3>
                                <select value={tarPosId} onChange={e => setTarPosId(e.target.value)} className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50 font-bold text-sm">
                                    <option value="">-- Seleccionar Tienda --</option>
                                    {data.pos.map(p => (
                                        <option key={p.id} value={p.id}>{p.zona} - {p.población}</option>
                                    ))}
                                </select>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Personalización de Colores</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                                    <span className="text-xs font-bold">Texto Cabeceras</span>
                                    <input type="color" value={tarHeaderColor} onChange={e => setTarHeaderColor(e.target.value)} className="w-8 h-8 cursor-pointer rounded-full border-none"/>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                                    <span className="text-xs font-bold">Texto Info</span>
                                    <input type="color" value={tarMarginColor} onChange={e => setTarMarginColor(e.target.value)} className="w-8 h-8 cursor-pointer rounded-full border-none"/>
                                </div>
                            </div>
                        </section>
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Opciones de Listado</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-xs font-bold">¿Mostrar PVP?</label><select value={tarShowPvp} onChange={e => setTarShowPvp(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50"><option>Si</option><option>No</option></select></div>
                                <div className="space-y-1"><label className="text-xs font-bold">Fecha Revisión</label><input type="date" value={tarRevisionDate} onChange={e => setTarRevisionDate(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50"/></div>
                            </div>
                        </section>
                    </div>
                    <div className="p-8 border-t border-gray-100 flex justify-center shrink-0">
                        <button onClick={handleGenerateTariff} className="bg-[#4f46e5] hover:bg-brand-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95">
                            GENERAR LISTADO TARIFA
                        </button>
                    </div>
                </div>
            </div>
        );

        default: return null;
    }
  };

  const menuItems = [
    { id: 'tarifas', label: 'Consultar Tarifas', icon: SearchIcon, desc: 'Listado de artículos y gestión de precios.' },
    { id: 'pos', label: 'Listar Puntos de Venta', icon: HistoryIcon, desc: 'Ver listado de tiendas y zonas.' },
    { id: 'groups', label: 'Listar Grupos', icon: BuildingIcon, desc: 'Ver listado de grupos de tiendas.' },
    { id: 'users', label: 'Listar Usuarios', icon: UserIcon, desc: 'Ver listado de usuarios del sistema.' },
    { id: 'inventarios', label: 'Impresos Inventarios', icon: ExportIcon, desc: 'Generar listados de inventario en PDF.' },
    { id: 'tarifas_impreso', label: 'Impresos Tarifas', icon: TagIcon, desc: 'Generar listados de precios en PDF.' },
  ];

  if (view !== 'menu') {
      if (view === 'tarifas') return (
          <Suspense fallback={<div className="p-10 text-center">Cargando Tarifas...</div>}>
            <UserDashboard onBack={() => setView('menu')} />
          </Suspense>
      );
      return (
        <div className="h-screen bg-[#f3f4f6] dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
            <header className="bg-white dark:bg-slate-900 h-16 px-6 flex justify-between items-center shadow-sm border-b dark:border-slate-800 z-20">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Panel de Supervisor</h1>
                <div className="flex items-center gap-6"><ThemeToggle /><button onClick={logout} className="text-slate-400 hover:text-red-500"><LogoutIcon className="w-6 h-6" /></button></div>
            </header>
            <main className="flex-1 overflow-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <button onClick={() => setView('menu')} className="flex items-center gap-2 text-brand-600 font-bold text-xs mb-8 uppercase tracking-widest"><ArrowLeftIcon className="w-4 h-4" /> Volver al Panel</button>
                    {renderViewContent()}
                </div>
            </main>
        </div>
      );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f3f4f6] dark:bg-slate-950 font-sans overflow-hidden">
      <header className="bg-white dark:bg-slate-900 h-16 px-6 flex justify-between items-center shadow-sm border-b dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Panel de Supervisor</h1>
        <div className="flex items-center gap-6"><span className="font-bold text-sm">{user?.nombre}</span><ThemeToggle /><button onClick={logout} className="text-slate-400 hover:text-red-500"><LogoutIcon className="w-6 h-6" /></button></div>
      </header>
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems.map(item => (
                    <button key={item.id} onClick={() => setView(item.id as SupervisorView)} className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center group hover:shadow-xl hover:-translate-y-1 transition-all">
                        <div className="mb-6 text-brand-500 bg-brand-50 p-4 rounded-xl"><item.icon className="w-10 h-10" /></div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2 uppercase tracking-tight">{item.label}</h3>
                        <p className="text-slate-400 text-xs">{item.desc}</p>
                    </button>
                ))}
            </div>
        </div>
      </main>
    </div>
  );
};

export default SupervisorDashboard;
