"use client";
import { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar'; // Ajusta la ruta si es necesario
import { supabase } from '../../../../../lib/supabaseClient'; // Ajusta la ruta
import {
    Users, Stethoscope, Calendar, FileText, Search, ArrowLeft,
    FileBarChart, Clipboard, Activity, Pill, Weight, Ruler, Thermometer, HeartPulse
} from 'lucide-react';

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

export default function HistoriaPage() {
    const [filtroPaciente, setFiltroPaciente] = useState('');
    const [historias, setHistorias] = useState<any[]>([]);
    const [expedientesDetalle, setExpedientesDetalle] = useState<any[]>([]);
    const [historiaSeleccionada, setHistoriaSeleccionada] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchHistoria = async () => {
        setLoading(true);
        // No reseteamos historiaSeleccionada aquí para permitir búsquedas sin cerrar el detalle si quisieras
        try {
            // Asegúrate que 'vista_historia' sea el nombre correcto en tu Supabase
            let query = supabase.from('vista_historia').select('*').order('nombres', { ascending: true });

            if (filtroPaciente) {
                query = query.ilike('nombres', `%${filtroPaciente}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setHistorias(data || []);
        } catch (error) {
            console.error("Error cargando historias:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- ESTO ES LO QUE FALTABA ---
    // Cargar los datos automáticamente al entrar a la página
    useEffect(() => {
        fetchHistoria();
    }, []);
    // -----------------------------

    const verDetalleHistoria = async (idHistoria: number) => {
        setLoading(true);
        setHistoriaSeleccionada(idHistoria);
        try {
            const { data: exps } = await supabase
                .from('vista_detalle_expediente')
                .select('*')
                .eq('idhistoriamedica', idHistoria)
                .order('fecha_atencion', { ascending: false });

            const { data: recetas } = await supabase
                .from('vista_recetas_admin')
                .select('*')
                .eq('idhistoriamedica', idHistoria);

            const completos = exps?.map((exp: any) => ({
                ...exp,
                recetas: recetas?.filter((r: any) => r.idexpediente === exp.idexpediente) || []
            }));

            setExpedientesDetalle(completos || []);
        } catch (error) {
            console.error("Error detalles:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
            <Navbar navLinks={navLinks} principal="/admin" />
            <div className="flex-1 p-8 w-full">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Historia Clínica</h1>
                </div>

                {!historiaSeleccionada ? (
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar paciente..."
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    value={filtroPaciente}
                                    onChange={e => setFiltroPaciente(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchHistoria()} // Buscar al dar Enter
                                />
                            </div>
                            <button onClick={fetchHistoria} className="bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 transition">
                                {loading ? '...' : 'Buscar'}
                            </button>
                        </div>

                        {loading && historias.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">Cargando pacientes...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {historias.map((h) => (
                                    <div key={h.idhistoriamedica} onClick={() => verDetalleHistoria(h.idhistoriamedica)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md cursor-pointer transition group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 group-hover:text-indigo-700">{h.nombres} {h.apellidos}</h3>
                                                <p className="text-xs text-slate-500">Expediente: #{h.idhistoriamedica}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {historias.length === 0 && !loading && (
                                    <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                                        No se encontraron pacientes con historia clínica.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // VISTA DE DETALLE (Igual a la que ya tenías diseñada)
                    <div className="animate-in slide-in-from-right-4">
                        <button onClick={() => setHistoriaSeleccionada(null)} className="mb-4 flex items-center text-slate-500 hover:text-indigo-600 transition">
                            <ArrowLeft size={18} className="mr-1" /> Volver a lista
                        </button>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <FileBarChart className="text-indigo-600" /> Historial Clínico
                            </h2>

                            {expedientesDetalle.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                                    Este paciente tiene carpeta pero aún no tiene consultas registradas.
                                </div>
                            ) : (
                                <div className="space-y-12 relative border-l-2 border-slate-100 ml-4 pl-8 py-2">
                                    {expedientesDetalle.map((exp) => (
                                        <div key={exp.idexpediente} className="relative">
                                            {/* Bolita Timeline */}
                                            <div className="absolute -left-[41px] top-0 w-5 h-5 bg-indigo-600 rounded-full border-4 border-white shadow-sm"></div>

                                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                                {/* Header Expediente */}
                                                <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
                                                    <div>
                                                        <h4 className="font-bold text-lg text-slate-800">{new Date(exp.fecha_atencion).toLocaleDateString()}</h4>
                                                        <p className="text-sm text-indigo-600 font-medium">{exp.doctor_nombre}</p>
                                                    </div>
                                                    <span className="bg-white px-2 py-1 rounded text-xs border border-slate-200 font-mono text-slate-500">EXP-{exp.idexpediente}</span>
                                                </div>

                                                {/* Triaje */}
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                                                    <h5 className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3"><Activity size={16} /> Triaje</h5>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                        <div className="flex items-center gap-2"><Weight size={16} className="text-blue-500" /> <b>{exp.peso || '-'} kg</b></div>
                                                        <div className="flex items-center gap-2"><Ruler size={16} className="text-blue-500" /> <b>{exp.talla || '-'} m</b></div>
                                                        <div className="flex items-center gap-2"><Thermometer size={16} className="text-red-500" /> <b>{exp.temperatura || '-'} °C</b></div>
                                                        <div className="flex items-center gap-2"><HeartPulse size={16} className="text-purple-500" /> <b>{exp.presion_arterial || '-'}</b></div>
                                                    </div>
                                                </div>

                                                {/* Anamnesis y Diagnóstico */}
                                                <div className="grid lg:grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <h5 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><Clipboard size={14} /> Anamnesis</h5>
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm space-y-1">
                                                            <p><span className="font-semibold">Motivo:</span> {exp.motivo_consulta}</p>
                                                            <p><span className="font-semibold">Síntomas:</span> {exp.sintomas}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <h5 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><FileText size={14} /> Diagnóstico</h5>
                                                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-sm">
                                                            <p className="font-bold text-green-800">{exp.diagnostico}</p>
                                                            <p className="text-xs text-green-700 mt-1">{exp.resumen_tratamiento}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Receta */}
                                                {exp.recetas && exp.recetas.length > 0 && (
                                                    <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300">
                                                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500"></div>
                                                            <h5 className="text-xl font-bold flex items-center gap-2 mb-4"><Pill className="text-indigo-600" /> Receta Médica</h5>
                                                            <div className="pl-4 space-y-2">
                                                                {exp.recetas.map((rec: any, i: number) => (
                                                                    <div key={i}>
                                                                        <span className="font-bold text-indigo-700 block">{rec.medicamento}</span>
                                                                        <span className="text-slate-500 italic text-sm">{rec.indicaciones}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}