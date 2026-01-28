"use client";
import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../../../lib/supabaseClient';
import {
  Users, Stethoscope, Calendar, FileText,
  Calendar as CalendarIcon,
  Clock, X, CheckCircle2, XCircle, Edit, Trash2, User, Save, AlertCircle, Loader2,
  ChevronDown, DollarSign, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// --- NAVBAR LINKS ---
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

// --- INTERFACES ---
interface CitaAdmin {
  id: number;
  fecha: string;
  horainicio: string;
  linkcita: string | null;
  paciente_nombre: string;
  paciente_email?: string;
  paciente_telefono?: string;
  paciente_id_telegram?: string;
  doctor_nombre: string;
  id_doctor: string;
  especialidad: string;
  id_estado_asistencia: number;
  nombre_estado_asistencia: string;
  google_event_id?: string;
}

// Tipo para controlar qué modal está abierto
type ModalType = 'reprogramar' | 'eliminar' | null;

export default function AgendaPage() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false); // Para spinners en botones
  const [citas, setCitas] = useState<CitaAdmin[]>([]);

  // Filtros
  const [filtroDoctor, setFiltroDoctor] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');

  const router = useRouter();

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados del Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaAdmin | null>(null);

  // Datos temporales para edición
  const [editFecha, setEditFecha] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editEstado, setEditEstado] = useState<number>(1);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // --- CARGAR CITAS ---
  const fetchCitas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cita')
        .select(`
          idcita, fecha, horainicio, linkcita, iddoctor,
          paciente:perfiles!fk_cita_perfiles ( nombres, apellidos, email, telefono, idtelegram ),
          doctor:doctor!iddoctor (
              iddoctor,
              especialidad:especialidad (especialidad),
              perfil:perfiles!fk_doctor_perfil (nombres, apellidos) 
          ),
          asistencia ( idestadoasistencia, estadoasistencia:idestadoasistencia (estadoasistencia) )
        `)
        .order('fecha', { ascending: false });

      if (error) throw error;

      if (data) {
        // Obtener mapeos de Google Event
        const idsCitas = data.map((c: any) => c.idcita);
        const { data: mappings } = await supabase
          .from('google_event_map')
          .select('idcita, google_event_id')
          .in('idcita', idsCitas);

        const mapGoogleIds = new Map();
        (mappings || []).forEach(m => mapGoogleIds.set(m.idcita, m.google_event_id));

        const hoy = new Date().toISOString().split('T')[0];
        const citasFormateadas = data.map((item: any) => {
          // Manejar el caso donde asistencia puede ser un objeto o un array
          const asistData = Array.isArray(item.asistencia) ? item.asistencia[0] : item.asistencia;
          let idEstado = asistData?.idestadoasistencia || 1;
          let nombreEstado = asistData?.estadoasistencia?.estadoasistencia || 'Pendiente';

          // Lógica visual para "No Asistió" si la fecha ya pasó y sigue pendiente
          if (item.fecha < hoy && idEstado === 1) {
            idEstado = 3;
            nombreEstado = 'No Asistió';
          }

          return {
            id: item.idcita,
            fecha: item.fecha,
            horainicio: item.horainicio,
            linkcita: item.linkcita,
            paciente_nombre: item.paciente ? `${item.paciente.nombres} ${item.paciente.apellidos}` : 'Desconocido',
            paciente_email: item.paciente?.email || 'No registrado',
            paciente_telefono: item.paciente?.telefono || '',
            paciente_id_telegram: item.paciente?.idtelegram || '',
            doctor_nombre: `Dr. ${item.doctor.perfil.nombres} ${item.doctor.perfil.apellidos}`,
            id_doctor: item.doctor.iddoctor,
            especialidad: item.doctor?.especialidad?.especialidad || 'General',
            id_estado_asistencia: idEstado,
            nombre_estado_asistencia: nombreEstado,
            google_event_id: mapGoogleIds.get(item.idcita)
          };
        });
        setCitas(citasFormateadas);
      }
    } catch (err: any) {
      console.error("Error al cargar citas:", err);
      setErrorMsg("No se pudieron cargar las citas");
      setTimeout(() => setErrorMsg(''), 5000);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCitas(); }, []);

  // --- FILTROS ---
  const citasFiltradas = citas.filter(c => {
    const matchDoctor = filtroDoctor ? c.doctor_nombre.toLowerCase().includes(filtroDoctor.toLowerCase()) : true;
    const matchEspecialidad = filtroEspecialidad ? c.especialidad.includes(filtroEspecialidad) : true;
    return matchDoctor && matchEspecialidad;
  });
  const listaDoctores = Array.from(new Set(citas.map(c => c.doctor_nombre)));
  const listaEspecialidades = Array.from(new Set(citas.map(c => c.especialidad)));

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroDoctor, filtroEspecialidad]);

  const totalPages = Math.ceil(citasFiltradas.length / itemsPerPage);
  const paginatedCitas = citasFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- HANDLERS DE MODALES ---

  const abrirModalEditar = (cita: CitaAdmin) => {
    setCitaSeleccionada(cita);
    setEditFecha(cita.fecha);
    setEditHora(cita.horainicio);
    setEditEstado(cita.id_estado_asistencia);
    setModalType('reprogramar');
  };

  const abrirModalEliminar = (cita: CitaAdmin) => {
    setCitaSeleccionada(cita);
    setModalType('eliminar');
  };

  const cerrarModal = () => {
    setModalType(null);
    setCitaSeleccionada(null);
  };

  // --- LÓGICA DE ACTUALIZACIÓN ---

  const guardarReprogramacion = async () => {
    if (!citaSeleccionada) return;
    setProcessing(true);
    console.log("Iniciando actualización de cita:", citaSeleccionada.id);

    try {
      // 1. Actualizar en DB (Cita)
      const { error: citaError } = await supabase
        .from('cita')
        .update({ fecha: editFecha, horainicio: editHora })
        .eq('idcita', citaSeleccionada.id);

      if (citaError) throw new Error(`Error en tabla 'cita': ${citaError.message}`);

      // 2. Actualizar Estado de Asistencia
      console.log("Actualizando asistencia para cita:", citaSeleccionada.id, "Estado:", editEstado);

      // Intentamos upsert con onConflict
      const { error: asistError } = await supabase
        .from('asistencia')
        .upsert({
          idcita: citaSeleccionada.id,
          idestadoasistencia: editEstado
        }, { onConflict: 'idcita' });

      if (asistError) {
        console.error("Error en upsert asistencia:", asistError);
        // Si falla el upsert, intentamos update directo
        const { error: updateError } = await supabase
          .from('asistencia')
          .update({ idestadoasistencia: editEstado })
          .eq('idcita', citaSeleccionada.id);

        if (updateError) {
          // Si también falla el update, intentamos insert (por si no existe)
          const { error: insertError } = await supabase
            .from('asistencia')
            .insert({ idcita: citaSeleccionada.id, idestadoasistencia: editEstado });

          if (insertError) throw new Error(`Error en asistencia: ${insertError.message}`);
        }
      }

      // 3. Sincronizar con n8n/Google Calendar
      fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "update",
          p_nueva_fecha: editFecha,
          p_nueva_hora: editHora,
          p_id_cita_actual: citaSeleccionada.id,
          p_nuevo_doctor_id: citaSeleccionada.id_doctor,
          google_event_id_VIEJO: citaSeleccionada.google_event_id,
          id_evento_google: citaSeleccionada.google_event_id,
          nombre_paciente: citaSeleccionada.paciente_nombre,
          email_paciente: citaSeleccionada.paciente_email,
          telefono: citaSeleccionada.paciente_telefono,
          id_telegram: citaSeleccionada.paciente_id_telegram
        })
      }).catch(e => console.warn("Sincronización falló:", e));

      setSuccessMsg("Cita actualizada con éxito");
      cerrarModal();
      await fetchCitas();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error("Error completo:", err);
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!citaSeleccionada) return;
    setProcessing(true);
    try {
      await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "delete",
          id_cita: citaSeleccionada.id,
          google_event_id: citaSeleccionada.google_event_id,
          id_doctor: citaSeleccionada.id_doctor,
          nombre_paciente: citaSeleccionada.paciente_nombre,
          email_paciente: citaSeleccionada.paciente_email
        })
      });

      const { error: dbError } = await supabase.rpc('eliminar_cita_rpc', {
        p_id_cita_actual: citaSeleccionada.id
      });

      if (dbError) throw dbError;

      setSuccessMsg("Cita eliminada correctamente");
      cerrarModal();
      await fetchCitas();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const renderEstadoEtiqueta = (id: number, nombre: string) => {
    switch (id) {
      case 1: return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold border border-yellow-200 flex items-center gap-1 w-fit"><Clock size={12} /> Pendiente</span>;
      case 2: return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1 w-fit"><CheckCircle2 size={12} /> Asistió</span>;
      case 3: return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1 w-fit"><XCircle size={12} /> No asistió</span>;
      default: return <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-full text-xs font-bold border border-slate-200 w-fit">{nombre}</span>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Navbar navLinks={navLinks} principal="/admin" />

      <div className="flex-1 p-4 md:p-8 space-y-6 w-full relative overflow-y-auto h-screen">

        {/* HEADER */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Agenda Médica</h1>
            <p className="text-slate-500 text-sm">Programación y gestión de citas</p>
          </div>
          {successMsg && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 size={16} /> {successMsg}
            </div>)}
          {errorMsg && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
              <AlertCircle size={16} /> {errorMsg}
            </div>)}
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[600px]">

          {/* BARRA DE HERRAMIENTAS */}
          <div className="flex flex-wrap gap-4 mb-6 justify-end items-center">
            <div className="flex flex-wrap gap-2">
              <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)}>
                <option value="">Todas las Especialidades</option>
                {listaEspecialidades.map((e, i) => <option key={i} value={e}>{e}</option>)}
              </select>
              <select className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={filtroDoctor} onChange={e => setFiltroDoctor(e.target.value)}>
                <option value="">Todos los Doctores</option>
                {listaDoctores.map((d, i) => <option key={i} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* VISTA LISTA */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Doctor / Especialidad</th>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedCitas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-700">{c.paciente_nombre}</div>
                      <div className="text-slate-400 text-xs">{c.paciente_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-700 font-medium">{c.doctor_nombre}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold">{c.especialidad}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarIcon size={14} className="text-slate-400" /> {new Date(c.fecha + 'T00:00:00').toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <Clock size={14} className="text-slate-400" /> {c.horainicio.substring(0, 5)}
                      </div>
                    </td>
                    <td className="p-4">
                      {renderEstadoEtiqueta(c.id_estado_asistencia, c.nombre_estado_asistencia)}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => router.push(`/admin/citas/control?idcita=${c.id}`)}
                        className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-lg transition hover:bg-green-100"
                        title="Ver/Gestionar Pago"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => abrirModalEditar(c)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg transition hover:bg-indigo-100"
                        title="Editar Cita / Estado"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => abrirModalEliminar(c)}
                        className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition hover:bg-red-100"
                        title="Eliminar Cita"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedCitas.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">No se encontraron citas con estos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="bg-slate-50/30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 mt-4">
              <p className="text-xs text-slate-500 font-medium">
                Mostrando <span className="text-slate-900 font-bold">{paginatedCitas.length}</span> de <span className="text-slate-900 font-bold">{citasFiltradas.length}</span> citas
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
                    if (totalPages > 5 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
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

        {/* --- MODALES --- */}
        <AnimatePresence>
          {modalType === 'reprogramar' && citaSeleccionada && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={cerrarModal}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Edit size={22} /> Editar Cita
                  </h3>
                  <button onClick={cerrarModal} className="text-white/80 hover:text-white transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <div className="bg-white h-12 w-12 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Paciente</p>
                      <p className="text-indigo-950 font-bold text-lg">{citaSeleccionada.paciente_nombre}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="date"
                          value={editFecha}
                          onChange={e => setEditFecha(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hora</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="time"
                          value={editHora}
                          onChange={e => setEditHora(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado de Asistencia</label>
                      <div className="relative">
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <select
                          value={editEstado}
                          onChange={e => setEditEstado(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                        >
                          <option value={1}>Pendiente</option>
                          <option value={2}>Asistió</option>
                          <option value={3}>No asistió</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={cerrarModal} className="flex-1 py-3 px-6 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
                      Cancelar
                    </button>
                    <button
                      onClick={guardarReprogramacion}
                      disabled={processing}
                      className="flex-[1.5] py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Actualizar Cita
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {modalType === 'eliminar' && citaSeleccionada && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={cerrarModal}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-10 text-center space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertCircle size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900">¿Eliminar Cita?</h3>
                    <p className="text-slate-500">
                      Estás a punto de cancelar la cita de <br />
                      <span className="text-slate-900 font-bold">"{citaSeleccionada.paciente_nombre}"</span>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 flex gap-4 border-t border-slate-100">
                  <button onClick={cerrarModal} className="flex-1 py-3 px-6 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-all">
                    No, Volver
                  </button>
                  <button
                    onClick={confirmarEliminacion}
                    disabled={processing}
                    className="flex-1 py-3 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                    Sí, Eliminar
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