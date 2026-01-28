"use client";
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import { supabase } from '../../../../../lib/supabaseClient';
import {
    Users, Stethoscope, Calendar, FileText, Wallet,
    DollarSign, CheckCircle2, Edit3, Ban, Save, X,
    CreditCard, Banknote, AlertTriangle, Loader2,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBeer, FaMizuni } from 'react-icons/fa';

const navLinks = [
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Médicos', href: '/admin/medicos', icon: Stethoscope },
    {
        name: 'Citas Médicas', href: '/admin/citas', icon: Calendar,
        subItems: [
            { name: 'Agenda', href: '/admin/citas' },
            { name: 'Historia Médica', href: '/admin/citas/historia' },
            { name: 'Control de Pagos', href: '/admin/citas/control' }
        ]
    },
    { name: 'Reportes', href: '/admin/reportes', icon: FileText },
];

type ModalType = 'cobrar' | 'anular' | null;

interface PagoRecord {
    id: number;
    idPago?: number;
    fecha: string;
    paciente: string;
    estado: string;
    monto: number;
    metodo: string;
}

export default function ControlPagosPage() {
    const [pagos, setPagos] = useState<PagoRecord[]>([]);
    const [ingresoTotal, setIngresoTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [modalType, setModalType] = useState<ModalType>(null);
    const [selectedItem, setSelectedItem] = useState<PagoRecord | null>(null);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editMonto, setEditMonto] = useState<number>(0);
    const [montoCobro, setMontoCobro] = useState<number>(50); // Valor por defecto
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchPagos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cita')
                .select(`
                    id:idcita, fecha, 
                    paciente:perfiles!fk_cita_perfiles ( nombres, apellidos ),
                    pago ( idpago, estado_pago, monto, metodo_pago )
                `)
                .order('fecha', { ascending: false });

            if (error) throw error;

            if (data) {
                let total = 0;
                const pagosFmt: PagoRecord[] = (data as any[]).map((item) => {
                    const infoPago = Array.isArray(item.pago) ? item.pago[0] : item.pago;
                    const estado = infoPago?.estado_pago || 'Pendiente';
                    const monto = Number(infoPago?.monto || 0);

                    if (estado === 'Pagado') total += monto;

                    return {
                        id: item.id,
                        idPago: infoPago?.idpago,
                        fecha: item.fecha,
                        paciente: item.paciente ? `${item.paciente.nombres} ${item.paciente.apellidos}` : '?',
                        estado: estado,
                        monto: monto,
                        metodo: infoPago?.metodo_pago || '-'
                    };
                });
                setPagos(pagosFmt);
                setIngresoTotal(total);
            }
        } catch (err: any) {
            console.error("Error fetching pagos:", err);
            setMessage({ type: 'error', text: "Error al cargar pagos" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPagos();
    }, []);

    const handleCobrar = async (metodo: string) => {
        if (!selectedItem) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('pago')
                .upsert({
                    idcita: selectedItem.id,
                    monto: montoCobro,
                    metodo_pago: metodo,
                    estado_pago: 'Pagado',
                    fecha_pago: new Date().toISOString()
                }, { onConflict: 'idcita' });

            if (error) throw error;

            await fetchPagos();
            setMessage({ type: 'success', text: "Pago registrado exitosamente" });
            setTimeout(() => setMessage(null), 3000);
            closeModal();
        } catch (error: any) {
            console.error("Error en handleCobrar:", error);
            setMessage({ type: 'error', text: "Error: " + error.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleAnular = async () => {
        if (!selectedItem) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('pago')
                .upsert({
                    idcita: selectedItem.id,
                    monto: 0,
                    metodo_pago: '-',
                    estado_pago: 'Anulado'
                }, { onConflict: 'idcita' });

            if (error) throw error;

            await fetchPagos();
            closeModal();
        } catch (error: any) {
            console.error("Error en handleAnular:", error);
            alert("Error: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleEditClick = (pago: any) => {
        setEditingId(pago.id);
        setEditMonto(pago.monto);
    };

    const guardarEdicion = async (idCita: number) => {
        try {
            const { error } = await supabase.from('pago')
                .update({ monto: editMonto })
                .eq('idcita', idCita);

            if (error) throw error;

            setEditingId(null);
            await fetchPagos();
        } catch (err: any) {
            alert("Error al actualizar: " + err.message);
        }
    };

    const openModal = (type: ModalType, item: any) => {
        setSelectedItem(item);
        setModalType(type);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedItem(null);
    };

    const totalPages = Math.ceil(pagos.length / itemsPerPage);
    const paginatedPagos = pagos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
            <Navbar navLinks={navLinks} principal="/admin" />

            <div className="flex-1 p-4 md:p-8 space-y-6 w-full relative overflow-y-auto h-screen">

                {/* HEADER COHERENTE */}
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Wallet className="text-indigo-600" /> Control de Pagos
                        </h1>
                        <p className="text-slate-500 text-sm">Gestión de cobros y estados financieros de citas</p>
                    </div>

                    {message && (
                        <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in duration-300 ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <div className="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100 flex items-center gap-4 w-full md:w-auto">
                        <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm">
                            <Banknote size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Ingresos Globales</p>
                            <p className="text-2xl font-bold text-indigo-900">S/. {ingresoTotal.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* TABLA DE REGISTROS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                                                <p className="text-slate-400 text-sm font-medium">Cargando registros...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedPagos.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                                            No hay registros de pagos disponibles.
                                        </td>
                                    </tr>
                                ) : paginatedPagos.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                    {p.paciente.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-700">{p.paciente}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            {p.estado === 'Pagado' ? (
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[11px] font-bold border border-green-200 flex items-center gap-1.5 w-fit">
                                                    <CheckCircle2 size={12} /> Pagado
                                                </span>
                                            ) : p.estado === 'Anulado' ? (
                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[11px] font-bold border border-red-200 flex items-center gap-1.5 w-fit">
                                                    <Ban size={12} /> Anulado
                                                </span>
                                            ) : (
                                                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[11px] font-bold border border-orange-100 flex items-center gap-1.5 w-fit">
                                                    <AlertTriangle size={12} /> Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 font-semibold">
                                            {editingId === p.id ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400">S/. </span>
                                                    <input
                                                        type="number"
                                                        value={editMonto}
                                                        onChange={e => setEditMonto(Number(e.target.value))}
                                                        className="border border-indigo-200 rounded-lg p-1 text-sm w-24 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                    />
                                                </div>
                                            ) : (
                                                <span className={p.estado === 'Pagado' ? 'text-slate-900' : 'text-slate-400'}>
                                                    S/. {p.monto.toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {p.estado === 'Pendiente' ? (
                                                    <>
                                                        <button
                                                            onClick={() => openModal('cobrar', p)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-indigo-100 active:scale-95"
                                                        >
                                                            <Wallet size={14} /> Cobrar
                                                        </button>
                                                        <button
                                                            onClick={() => openModal('anular', p)}
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                            title="Anular"
                                                        >
                                                            <Ban size={18} />
                                                        </button>
                                                    </>
                                                ) : p.estado === 'Pagado' ? (
                                                    editingId === p.id ? (
                                                        <>
                                                            <button onClick={() => guardarEdicion(p.id)} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-xl shadow-sm shadow-green-100 transition-all active:scale-95"><Save size={18} /></button>
                                                            <button onClick={() => setEditingId(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-xl transition-all"><X size={18} /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleEditClick(p)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl transition-all border border-transparent hover:border-indigo-100" title="Editar Monto">
                                                                <Edit3 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => openModal('anular', p)}
                                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                                title="Anular Pago"
                                                            >
                                                                <Ban size={18} />
                                                            </button>
                                                        </>
                                                    )
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest px-2">Sin acciones</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN COHERENTE */}
                    {totalPages > 1 && (
                        <div className="bg-slate-50/30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                            <p className="text-xs text-slate-500 font-medium">
                                Mostrando <span className="text-slate-900 font-bold">{paginatedPagos.length}</span> de <span className="text-slate-900 font-bold">{pagos.length}</span> registros
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <div className="flex gap-1 mx-2">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        // Mostrar solo algunas páginas si hay muchas
                                        if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                                            if (pageNum === 2 || pageNum === totalPages - 1) return <span key={i} className="px-1 text-slate-300">...</span>;
                                            return null;
                                        }
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${currentPage === pageNum
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-110'
                                                    : 'text-slate-500 hover:bg-white border border-transparent hover:border-slate-200 hover:text-indigo-600'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* MODALES COHERENTES */}
                <AnimatePresence>
                    {modalType === 'cobrar' && selectedItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                                onClick={closeModal}
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                            >
                                <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center text-white">
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <Wallet size={24} /> Registrar Pago
                                        </h3>
                                        <p className="text-indigo-100 text-xs mt-1">Seleccione el método de pago del paciente</p>
                                    </div>
                                    <button onClick={closeModal} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-8">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-xl">
                                            {selectedItem.paciente.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-lg leading-tight">{selectedItem.paciente}</p>
                                            <p className="text-slate-500 text-xs font-medium">Cita: {new Date(selectedItem.fecha + 'T00:00:00').toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monto a Cobrar (S/.)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="number"
                                                value={montoCobro}
                                                onChange={e => setMontoCobro(Number(e.target.value))}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={() => handleCobrar('Efectivo')}
                                            disabled={processing}
                                            className="group w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-green-500 hover:bg-green-50/50 transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-slate-100 group-hover:bg-green-100 text-slate-500 group-hover:text-green-600 rounded-xl transition-colors">
                                                    <Banknote size={24} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-slate-800 group-hover:text-green-900">Efectivo</p>
                                                    <p className="text-xs text-slate-500">Pago directo en caja</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-green-500" size={20} />
                                        </button>

                                        <button
                                            onClick={() => handleCobrar('Tarjeta')}
                                            disabled={processing}
                                            className="group w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 rounded-xl transition-colors">
                                                    <CreditCard size={24} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-slate-800 group-hover:text-blue-900">Tarjeta / Digital</p>
                                                    <p className="text-xs text-slate-500">Débito, Crédito o Transferencia</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={20} />
                                        </button>
                                    </div>

                                    {processing && (
                                        <div className="mt-6 flex justify-center">
                                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {modalType === 'anular' && selectedItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                                onClick={closeModal}
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center"
                            >
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 mb-6 text-red-600 shadow-inner">
                                    <AlertTriangle size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Anular Pago?</h3>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    ¿Estás seguro de que quieres anular el pago de <strong className="text-slate-800">{selectedItem.paciente}</strong>? Esta acción no se puede deshacer fácilmente.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAnular}
                                        disabled={processing}
                                        className="flex-1 py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 flex justify-center items-center gap-2 transition-all active:scale-95"
                                    >
                                        {processing ? <Loader2 className="animate-spin" size={20} /> : "Confirmar"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}