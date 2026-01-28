"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  Calendar, Clock, Edit3, Trash2, CalendarPlus, Stethoscope, User,
  Star, Video, Phone,
  CheckCircle, AlertCircle, Search, BookMarked, ShieldCheck, BarChart3,
  Lightbulb, UserCog, ArrowLeft, CalendarDays, LayoutDashboard, MapPin,
  Loader2, FileText, Download, Receipt, MoreHorizontal
} from 'lucide-react';

// --- CONFIGURACIÓN DEL NAVBAR ---
const navLinksPatient = [
  { name: 'Mis Citas', href: '/paciente', icon: Calendar },
  { name: 'Mi Perfil', href: '/paciente/perfil', icon: User },
];

// --- INTERFACES ---
interface Doctor {
  id: string;
  nombres: string;
  apellidos: string;
  especialidad: string;
}

interface Especialidad {
  id: number;
  nombre: string;
}

interface HorarioDisponible {
  id: string;
  doctor_id: string;
  doctor_nombres: string;
  doctor_apellidos: string;
  especialidad: string;
  fecha: string;
  hora_inicio: string;
}

interface CitaActual {
  id_cita: number;
  fecha_cita: string;
  hora_inicio: string;
  doctor_nombres: string;
  doctor_apellidos: string;
  id_doctor: string;
  google_event_id: string;
  linkcita?: string | null;
  doctor_telefono?: string;
  especialidad?: string;
}

interface DisponibilidadAgrupada {
  doctor: {
    id: string;
    nombres: string;
    apellidos: string;
    especialidad: string;
  };
  horarios: HorarioDisponible[];
}

interface PacienteData {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  id_telegram?: string;
  dni?: string;
}

interface HistorialItem {
  id_cita: number;
  fecha: string;
  hora: string;
  doctor: string;
  especialidad: string;
  diagnostico?: string;
  pago_monto?: number;
  pago_estado?: string;
  receta?: {
    medicamento: string;
    indicaciones: string;
  }[];
}

export default function CitasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [paciente, setPaciente] = useState<PacienteData | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  // Pestañas
  const [activeTab, setActiveTab] = useState<'dashboard' | 'historial' | 'medicos'>('dashboard');

  // Estados Citas
  const [especialidad, setEspecialidad] = useState('');
  const [fecha, setFecha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReservando, setIsReservando] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<HorarioDisponible[]>([]);
  const [disponibilidadAgrupada, setDisponibilidadAgrupada] = useState<DisponibilidadAgrupada[]>([]);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [citas, setCitas] = useState<CitaActual[]>([]);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Modales
  const [modalReservaVisible, setModalReservaVisible] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<HorarioDisponible | null>(null);
  const [modalModificarVisible, setModalModificarVisible] = useState(false);
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaActual | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');
  const [isModificando, setIsModificando] = useState(false);
  const [isEliminando, setIsEliminando] = useState(false);

  // Estados Directorio
  const [medicos, setMedicos] = useState<Doctor[]>([]);
  const [especialidadesList, setEspecialidadesList] = useState<Especialidad[]>([]);
  const [filtroEspecialidadMedico, setFiltroEspecialidadMedico] = useState('');
  const [loadingMedicos, setLoadingMedicos] = useState(false);

  // --- EFECTOS ---
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const fetchPerfil = async () => {
      try {
        const { data, error } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
        if (error) throw error;
        if (data) {
          setPaciente({
            id: data.id,
            nombres: data.nombres,
            apellidos: data.apellidos,
            email: data.email || user.email || '',
            telefono: data.telefono || '',
            id_telegram: data.idtelegram || '',
            dni: '12345678' // Ajustar con campo real si existe
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPerfil(false);
      }
    };
    fetchPerfil();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (paciente) {
      fetchCitasFuturas();
      fetchHistorialMedico();
      fetchEspecialidades();

      // --- TIEMPO REAL: Listener de Supabase ---
      const citasSubscription = supabase
        .channel('citas-cambios')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cita', filter: `idpaciente=eq.${paciente.id}` },
          () => {
            console.log("Cambio detectado en base de datos, actualizando...");
            fetchCitasFuturas();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(citasSubscription);
      };
    }
  }, [paciente]);

  useEffect(() => {
    if (activeTab === 'medicos') fetchMedicos();
  }, [activeTab, filtroEspecialidadMedico]);

  useEffect(() => {
    if (disponibilidad.length === 0) {
      setDisponibilidadAgrupada([]);
      return;
    }
    const agrupado = new Map<string, DisponibilidadAgrupada>();
    disponibilidad.forEach((horario) => {
      if (!agrupado.has(horario.doctor_id)) {
        agrupado.set(horario.doctor_id, {
          doctor: {
            id: horario.doctor_id,
            nombres: horario.doctor_nombres,
            apellidos: horario.doctor_apellidos,
            especialidad: horario.especialidad
          },
          horarios: []
        });
      }
      agrupado.get(horario.doctor_id)!.horarios.push(horario);
    });
    setDisponibilidadAgrupada(Array.from(agrupado.values()));
  }, [disponibilidad]);


  // --- DATOS SUPABASE DIRECTO ---
  const fetchEspecialidades = async () => {
    const { data } = await supabase.from('especialidad').select('*');
    if (data) setEspecialidadesList(data.map((e: any) => ({ id: e.idespecialidad, nombre: e.especialidad })));
  };

  const fetchMedicos = async () => {
    setLoadingMedicos(true);
    try {
      let query = supabase.from('doctor').select(`
            iddoctor,
            perfil:perfiles!fk_doctor_perfil(nombres, apellidos),
            especialidad:especialidad!doctor_idespecialidad_fkey(especialidad)
        `).eq('is_active', true);

      const { data } = await query;
      let docs: Doctor[] = (data || []).map((d: any) => ({
        id: d.iddoctor,
        nombres: d.perfil?.nombres || 'Sin Nombre',
        apellidos: d.perfil?.apellidos || '',
        especialidad: d.especialidad?.especialidad || 'General'
      }));
      if (filtroEspecialidadMedico) docs = docs.filter(d => d.especialidad === filtroEspecialidadMedico);
      setMedicos(docs);
    } finally {
      setLoadingMedicos(false);
    }
  };

  const fetchHistorialMedico = async () => {
    if (!paciente) return;
    try {
      const { data, error } = await supabase
        .from('cita')
        .select(`
          idcita, fecha, horainicio,
          doctor:doctor!iddoctor (
             perfil:perfiles!fk_doctor_perfil(nombres, apellidos),
             especialidad:especialidad(especialidad)
          ),
          expediente (
             diagnostico,
             receta (
                detallereceta (medicamento, indicaciones)
             )
          ),
          pago (monto, estado_pago)
        `)
        .eq('idpaciente', paciente.id)
        .order('fecha', { ascending: false });

      if (error) throw error;

      // const historialFmt: HistorialItem[] = (data || []).map((item: any) => {
      //   const expediente = item.expediente?.[0];
      //   const receta = expediente?.receta?.[0];
      //   const detallesReceta = receta?.detallereceta || [];
      //   const pago = item.pago?.[0];

      //   return {
      //     id_cita: item.idcita,
      //     fecha: item.fecha,
      //     hora: item.horainicio,
      //     doctor: `${item.doctor?.perfil?.nombres} ${item.doctor?.perfil?.apellidos}`,
      //     especialidad: item.doctor?.especialidad?.especialidad || 'General',
      //     diagnostico: expediente?.diagnostico,
      //     pago_monto: pago?.monto,
      //     pago_estado: pago?.estado_pago,
      //     receta: detallesReceta
      //   };
      // }); 
      // setHistorial(historialFmt);
      const historialFmt: HistorialItem[] = (data || []).map((item: any) => {

        // CORRECCIÓN: Verificamos si es array o es objeto directo
        const expedienteRaw = item.expediente;
        const expediente = Array.isArray(expedienteRaw) ? expedienteRaw[0] : expedienteRaw;

        // Lo mismo para la receta
        const recetaRaw = expediente?.receta;
        const receta = Array.isArray(recetaRaw) ? recetaRaw[0] : recetaRaw;

        const detallesReceta = receta?.detallereceta || [];
        const pago = Array.isArray(item.pago) ? item.pago[0] : item.pago;

        return {
          id_cita: item.idcita,
          fecha: item.fecha,
          hora: item.horainicio,
          // Acceso seguro a doctor (a veces Supabase devuelve null si no encuentra la relación)
          doctor: item.doctor ? `${item.doctor.perfil?.nombres || ''} ${item.doctor.perfil?.apellidos || ''}` : 'Doctor no asignado',
          especialidad: item.doctor?.especialidad?.especialidad || 'General',

          // Aquí es donde fallaba:
          diagnostico: expediente?.diagnostico,

          pago_monto: pago?.monto,
          pago_estado: pago?.estado_pago,
          receta: detallesReceta
        };
      });

      // DEBUG: Para ver en consola qué está llegando realmente
      console.log("Datos crudos Supabase:", data);
      console.log("Historial procesado:", historialFmt);

      setHistorial(historialFmt);
    } catch (err) {
      console.error("Error historial:", JSON.stringify(err, null, 2));
    }
  };

  // --- CRUD CITAS FUTURAS (Supabase Directo - Resiliente) ---
  const fetchCitasFuturas = async () => {
    if (!paciente) return;
    try {
      // Usamos la fecha LOCAL para evitar problemas de zona horaria (UTC suele ir adelantado)
      const ahora = new Date();
      const hoy = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0');

      console.log("Cargando citas para fecha base (Local):", hoy);
      // Log para depuración interna
      console.log("Cargando TODAS las citas para el paciente:", paciente.id);

      const { data, error } = await supabase
        .from('cita')
        .select(`
          *,
          doctor:doctor!iddoctor (
              perfil:perfiles!fk_doctor_perfil (nombres, apellidos, telefono),
              especialidad:especialidad (especialidad)
          )
        `)
        .eq('idpaciente', paciente.id)
        .order('fecha', { ascending: false }); // Las más recientes aparecerán primero

      if (error) throw error;

      if (data && data.length > 0) {
        // 1. Obtener los IDs de las citas para buscar sus mapeos de Google
        const idsCitas = data.map((c: any) => c.idcita);

        // 2. Consultar la tabla google_event_map por separado para evitar errores de join
        const { data: mappings, error: mapError } = await supabase
          .from('google_event_map')
          .select('idcita, google_event_id')
          .in('idcita', idsCitas);

        if (mapError) {
          console.warn("No se pudieron cargar los mapeos de Google:", mapError.message);
        }

        // Crear un mapa para búsqueda rápida
        const mapGoogleIds = new Map();
        (mappings || []).forEach(m => mapGoogleIds.set(m.idcita, m.google_event_id));

        // Log para depuración interna (no visible al usuario pero ayuda si hay errores de nombre)
        console.log("Citas recuperadas:", data);

        const citasFormateadas = data.map((item: any) => {
          // Buscamos el link en múltiples campos posibles por si acaso
          const linkReal = item.linkcita || item.link_cita || item.meet_link || item.google_meet;

          // Buscamos el ID en la tabla secundaria que consultamos
          const googleId = mapGoogleIds.get(item.idcita) || item.google_event_id || item.idgoogle;

          return {
            id_cita: item.idcita,
            fecha_cita: item.fecha,
            hora_inicio: item.horainicio,
            doctor_nombres: item.doctor?.perfil?.nombres || 'Dr(a)',
            doctor_apellidos: item.doctor?.perfil?.apellidos || '',
            id_doctor: item.iddoctor,
            google_event_id: googleId,
            linkcita: linkReal,
            doctor_telefono: item.doctor?.perfil?.telefono,
            especialidad: item.doctor?.especialidad?.especialidad || 'Médico Especialista'
          };
        });
        setCitas(citasFormateadas as CitaActual[]);
      } else {
        setCitas([]);
      }
    } catch (err: any) {
      console.error("Error al cargar citas futuras:", JSON.stringify(err, null, 2));
    }
  };

  const handleReservarCita = async () => {
    if (!horarioSeleccionado || !fecha || !paciente) return;
    setIsReservando(true);
    try {
      const response = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "create",
          paciente_id: paciente.id,
          doctor_id: horarioSeleccionado.doctor_id,
          fecha: fecha,
          hora: horarioSeleccionado.hora_inicio,
          especialidad_id: especialidad,
          nombre_paciente: `${paciente.nombres} ${paciente.apellidos}`,
          email_paciente: paciente.email,
          id_telegram: paciente.id_telegram || "",
          telefono: paciente.telefono || ""
        })
      });
      if (response.ok) {
        setMensajeExito('¡Cita reservada con éxito!');
        setDisponibilidad([]);
        setBusquedaRealizada(false);
        cerrarModalReserva();

        // Esperamos un momento para que n8n termine de procesar antes de pedir la lista nueva
        setTimeout(() => {
          fetchCitasFuturas();
        }, 1500);
      } else { throw new Error('Error al reservar'); }
    } catch (err: any) { setError(err.message); } finally { setIsReservando(false); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setDisponibilidad([]);
    setDisponibilidadAgrupada([]);
    setBusquedaRealizada(true);
    try {
      const response = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "search", especialidad: especialidad, fecha: fecha })
      });
      let data = await response.json();
      if (!Array.isArray(data)) data = [];
      setDisponibilidad(data as HorarioDisponible[]);
    } catch { setError('Error al buscar'); } finally { setIsLoading(false); }
  };

  // --- MODIFICAR / ELIMINAR (Híbrido: DB Directa + Sincronización Webhook) ---
  const handleModificar = async () => {
    if (!citaSeleccionada || !paciente) return;
    setIsModificando(true);
    setError('');
    try {
      // 1. ACTUALIZACIÓN DIRECTA EN SUPABASE (Prioridad 1: Persistencia)
      const { error: dbError } = await supabase
        .from('cita')
        .update({
          fecha: nuevaFecha,
          horainicio: nuevaHora
        })
        .eq('idcita', citaSeleccionada.id_cita);

      if (dbError) throw new Error("Error al actualizar en Base de Datos: " + dbError.message);

      // 2. SINCRONIZACIÓN CON GOOGLE CALENDAR / N8N (Prioridad 2)
      // Enviamos el ID en ambos formatos comunes para n8n
      fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "update",
          p_nueva_fecha: nuevaFecha,
          p_nueva_hora: nuevaHora,
          p_id_cita_actual: citaSeleccionada.id_cita,
          p_nuevo_doctor_id: citaSeleccionada.id_doctor,
          google_event_id_VIEJO: citaSeleccionada.google_event_id,
          id_evento_google: citaSeleccionada.google_event_id,
          nombre_paciente: `${paciente.nombres} ${paciente.apellidos}`,
          email_paciente: paciente.email,
          telefono: paciente.telefono,
          id_telegram: paciente.id_telegram
        })
      }).catch(e => console.warn("Sincronización Calendar falló, pero DB actualizada:", e));

      setMensajeExito('Cita modificada correctamente');
      setTimeout(() => {
        cerrarModalModificar();
        fetchCitasFuturas();
      }, 1000);

    } catch (err: any) {
      console.error("Error en Update:", err);
      setError(err.message);
    } finally {
      setIsModificando(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!citaSeleccionada || !paciente) return;
    setIsEliminando(true);
    setError('');
    try {
      // 1. AVISAR A N8N PRIMERO (Para Google Calendar)
      // Enviamos el ID en todos los formatos posibles para que el nodo de n8n lo encuentre sí o sí
      const n8nResponse = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "delete",
          id_cita: citaSeleccionada.id_cita,
          google_event_id: citaSeleccionada.google_event_id, // Nombre estándar
          google_event_id_VIEJO: citaSeleccionada.google_event_id, // Compatible con flujos antiguos
          id_evento_google: citaSeleccionada.google_event_id, // Variante común
          id_doctor: citaSeleccionada.id_doctor, // Crucial para identificar el calendario
          fecha_cita_eliminada: citaSeleccionada.fecha_cita,
          hora_cita_eliminada: citaSeleccionada.hora_inicio,
          nombre_paciente: `${paciente.nombres} ${paciente.apellidos}`,
          email_paciente: paciente.email
        })
      });

      if (!n8nResponse.ok) {
        console.warn("N8N respondió con error, pero procederemos a borrar de la DB local.");
      }

      // 2. ELIMINACIÓN EN BASE DE DATOS LOCAL (Tu función RPC)
      // Ahora sí borramos de Supabase, incluyendo asistencia y pagos
      const { error: dbError } = await supabase.rpc('eliminar_cita_rpc', {
        p_id_cita_actual: citaSeleccionada.id_cita
      });

      if (dbError) throw new Error("Error al limpiar Base de Datos: " + dbError.message);

      setMensajeExito('Cita cancelada y sincronizada correctamente');

      setTimeout(() => {
        setModalEliminarVisible(false);
        setCitaSeleccionada(null);
        fetchCitasFuturas();
      }, 1500);

    } catch (err: any) {
      console.error("Error en el proceso de cancelación:", err);
      setError(err.message);
    } finally {
      setIsEliminando(false);
    }
  };

  const handleEliminarCita = (cita: CitaActual) => {
    setCitaSeleccionada(cita);
    setModalEliminarVisible(true);
  };

  const abrirModalModificar = (cita: CitaActual) => { setCitaSeleccionada(cita); setNuevaFecha(cita.fecha_cita); setNuevaHora(cita.hora_inicio); setModalModificarVisible(true); };
  const cerrarModalModificar = () => { setModalModificarVisible(false); setCitaSeleccionada(null); };
  const cerrarModalEliminar = () => { setModalEliminarVisible(false); setCitaSeleccionada(null); };
  const abrirModalReserva = (h: any) => { setHorarioSeleccionado(h); setModalReservaVisible(true); };
  const cerrarModalReserva = () => { setHorarioSeleccionado(null); setModalReservaVisible(false); };

  // --- PDFs ---
  const downloadReceta = (item: HistorialItem) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(79, 70, 229); doc.text("RECETA MÉDICA", 105, 20, { align: "center" });
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    doc.text(`Paciente: ${paciente?.nombres} ${paciente?.apellidos}`, 14, 40);
    doc.text(`Fecha: ${item.fecha}`, 14, 46);
    doc.text(`Doctor: ${item.doctor}`, 14, 52);
    doc.text(`Especialidad: ${item.especialidad}`, 14, 58);
    if (item.diagnostico) doc.text(`Diagnóstico: ${item.diagnostico}`, 14, 70);

    if (item.receta && item.receta.length > 0) {
      const tableBody = item.receta.map(r => [r.medicamento, r.indicaciones]);
      autoTable(doc, { startY: 80, head: [['Medicamento', 'Indicaciones']], body: tableBody, theme: 'grid' });
    } else { doc.text("No se registraron medicamentos.", 14, 80); }
    doc.save(`Receta_${item.fecha}.pdf`);
  };

  const downloadBoleta = (item: HistorialItem) => {
    const doc = new jsPDF();
    doc.setFontSize(22); doc.text("BOLETA DE VENTA", 105, 20, { align: "center" });
    doc.setFontSize(10); doc.text("HOSPITAL CENTRAL", 105, 28, { align: "center" });
    doc.rect(14, 45, 182, 25);
    doc.text(`Cliente: ${paciente?.nombres} ${paciente?.apellidos}`, 18, 52);
    doc.text(`DNI: ${paciente?.dni || '---'}`, 18, 58);
    autoTable(doc, { startY: 80, head: [['Descripción', 'Precio']], body: [[`Consulta - ${item.especialidad}`, `$ ${Number(item.pago_monto).toFixed(2)}`]], theme: 'plain' });
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text(`TOTAL: $ ${Number(item.pago_monto).toFixed(2)}`, 140, finalY + 12);
    doc.save(`Boleta_${item.fecha}.pdf`);
  };

  const formatCardDate = (fechaStr: string) => { try { const [y, m, d] = fechaStr.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }); } catch { return fechaStr; } };

  if (authLoading || loadingPerfil) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>;
  if (!paciente) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Navbar navLinks={navLinksPatient} principal="/paciente" />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* BANNER */}
          <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl font-bold">Hola, {paciente.nombres}</h1>
              <p className="text-indigo-100 mt-1">Panel de Paciente</p>
            </div>
            <span className="text-6xl hidden sm:block opacity-80">👋</span>
            <div className="absolute top-0 right-0 w-64 h-full bg-white/10 skew-x-12 transform translate-x-20"></div>
          </div>

          {/* TABS */}
          <div className="flex gap-4 overflow-x-auto pb-2 border-b border-gray-200">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-white border-x border-t border-gray-200 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
              <LayoutDashboard size={20} /> Agendar y Próximas
            </button>
            <button onClick={() => setActiveTab('historial')} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-semibold transition-all ${activeTab === 'historial' ? 'bg-white border-x border-t border-gray-200 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
              <FileText size={20} /> Historial y Docs
            </button>
            <button onClick={() => setActiveTab('medicos')} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-semibold transition-all ${activeTab === 'medicos' ? 'bg-white border-x border-t border-gray-200 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Stethoscope size={20} /> Directorio
            </button>
          </div>

          {/* CONTENIDO */}

          {/* TAB 1: DASHBOARD (AGENDAR + LISTA PRÓXIMAS) */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95">

              {/* WIDGET AGENDAR (Izquierda) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><CalendarPlus className="text-indigo-600" /> Agendar Nueva Cita</h2>

                {!busquedaRealizada && (
                  <form onSubmit={handleSearch} className="flex flex-col gap-4">
                    {/* Mensajes de Estado Globales */}
                    {error && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">{error}</div>}
                    {mensajeExito && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">{mensajeExito}</div>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                        <select value={especialidad} onChange={e => setEspecialidad(e.target.value)} className="w-full border border-gray-300 p-3.5 rounded-lg bg-gray-50 outline-none" required>
                          <option value="">-- Seleccionar --</option>
                          {especialidadesList.map(esp => (<option key={esp.id} value={esp.id}>{esp.nombre}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 outline-none" required />
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="self-end px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:bg-indigo-300">
                      <Search size={18} /> {isLoading ? 'Buscando...' : 'Buscar Horarios'}
                    </button>
                  </form>
                )}

                {busquedaRealizada && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <button onClick={() => { setBusquedaRealizada(false); setDisponibilidad([]); }} className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"><ArrowLeft size={16} /> Volver a buscar</button>
                      <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{disponibilidadAgrupada.length} Médicos disponibles</span>
                    </div>

                    {disponibilidadAgrupada.length > 0 ? (
                      <div className="space-y-4">
                        {disponibilidadAgrupada.map((grupo) => (
                          <div key={grupo.doctor.id} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row gap-5">
                              {/* Avatar/Initialen con Gradiente */}
                              <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-100">
                                {grupo.doctor.nombres.charAt(0)}{grupo.doctor.apellidos.charAt(0)}
                              </div>

                              <div className="flex-1 space-y-1">
                                <h4 className="text-lg font-bold text-gray-900">Dr(a). {grupo.doctor.nombres} {grupo.doctor.apellidos}</h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                  <span className="flex items-center gap-1.5"><Stethoscope size={16} className="text-indigo-500" /> {grupo.doctor.especialidad}</span>
                                  <span className="flex items-center gap-1.5"><MapPin size={16} className="text-indigo-500" /> Consultorio {Math.floor(Math.random() * 200) + 100}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex items-center text-yellow-400">
                                    {[...Array(4)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                    <Star size={14} className="text-gray-300" />
                                  </div>
                                  <span className="text-xs font-bold text-gray-700">4.8</span>
                                  <span className="text-xs text-gray-400">• {Math.floor(Math.random() * 10) + 5} años de experiencia</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-50">
                              <p className="text-sm font-semibold text-gray-700 mb-4">Horarios disponibles:</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {grupo.horarios.map(h => (
                                  <button
                                    key={h.id}
                                    onClick={() => abrirModalReserva(h)}
                                    className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:border-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 group"
                                  >
                                    <Clock size={16} className="text-gray-400 group-hover:text-indigo-500" />
                                    {h.hora_inicio.substring(0, 5)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No se encontraron horarios disponibles para esta fecha.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* --- LISTA DE PRÓXIMAS CITAS (INCRUSTADA AQUÍ CON BOTONES) --- */}
                <div id="mis-citas" className="mt-12">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      Próximas Citas
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">
                        {citas.length}
                      </span>
                    </h2>
                  </div>

                  {citas.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                      <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">No tienes citas programadas próximamente.</p>
                      <button onClick={() => setActiveTab('dashboard')} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">Reserva una ahora</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                      {citas.map(cita => (
                        <div key={cita.id_cita} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                          <div className="p-6 space-y-5 flex-1">
                            {/* Cabecera Tarjeta */}
                            <div className="flex gap-4">
                              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-100 shrink-0">
                                {cita.doctor_nombres.charAt(0)}{cita.doctor_apellidos.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-lg font-bold text-gray-900 leading-tight truncate">
                                  Dr(a). {cita.doctor_nombres} {cita.doctor_apellidos}
                                </h4>
                                <p className="text-sm text-indigo-500 font-medium flex items-center gap-1.5 mt-0.5">
                                  <Stethoscope size={14} /> {cita.especialidad || 'Especialista'}
                                </p>
                              </div>
                            </div>

                            {/* Info de la Cita */}
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-indigo-500 shrink-0">
                                  <Calendar size={18} />
                                </div>
                                {formatCardDate(cita.fecha_cita)}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-600 font-medium">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-indigo-500 shrink-0">
                                  <Clock size={16} />
                                </div>
                                {cita.hora_inicio.substring(0, 5)}
                              </div>

                              {/* Link de Meet Dinámico */}
                              {cita.linkcita ? (
                                <a
                                  href={cita.linkcita.startsWith('http') ? cita.linkcita : `https://${cita.linkcita}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 text-sm text-indigo-600 font-bold hover:text-indigo-800 transition-colors group/link"
                                >
                                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center group-hover/link:bg-indigo-100 transition-colors shrink-0">
                                    <Video size={18} />
                                  </div>
                                  Unirse a videollamada
                                </a>
                              ) : (
                                <div className="flex items-center gap-3 text-sm text-gray-400 font-medium italic">
                                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                    <Video size={18} />
                                  </div>
                                  Link no disponible (se grabará automáticamente)
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                              onClick={() => abrirModalModificar(cita)}
                              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Edit3 size={16} /> Editar
                            </button>
                            <button
                              onClick={() => handleEliminarCita(cita)}
                              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Trash2 size={16} /> Cancelar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SIDEBAR DERECHA */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">Resumen</h3>
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <span className="text-gray-600 text-sm">Citas Programadas</span>
                    <span className="text-2xl font-bold text-indigo-600">{citas.length}</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><ShieldCheck /> Seguro Médico</h3>
                  <p className="text-sm text-blue-100 opacity-90">Recuerda presentar tu DNI al llegar a consulta.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORIAL Y DOCUMENTOS */}
          {activeTab === 'historial' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in zoom-in-95">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><FileText className="text-indigo-600" /> Historial Médico y Documentos</h2>
              {historial.length === 0 ? (
                <div className="text-center py-10 text-gray-500"><FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" /><p>Aún no tienes historial.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Médico / Especialidad</th>
                        <th className="px-6 py-3">Diagnóstico</th>
                        <th className="px-6 py-3 text-right">Descargas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {historial.map(item => (
                        <tr key={item.id_cita} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{item.fecha} <br /> <span className="text-xs text-gray-500">{item.hora}</span></td>
                          <td className="px-6 py-4"><div className="font-medium text-gray-900">{item.doctor}</div><div className="text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1">{item.especialidad}</div></td>
                          <td className="px-6 py-4 text-gray-600 italic">{item.diagnostico || 'Sin diagnóstico registrado'}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {item.receta && item.receta.length > 0 ? (
                              <button onClick={() => downloadReceta(item)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-100 transition"><Download size={14} /> Receta</button>
                            ) : <span className="text-xs text-gray-400 px-2">Sin Receta</span>}
                            {item.pago_estado === 'Pagado' ? (
                              <button onClick={() => downloadBoleta(item)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-xs font-bold hover:bg-green-100 transition"><Receipt size={14} /> Boleta</button>
                            ) : <span className="text-xs text-gray-400 px-2">Pendiente</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECTORIO MÉDICO */}
          {activeTab === 'medicos' && (
            <div className="animate-in fade-in zoom-in-95">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Directorio Médico</h2>
                <select value={filtroEspecialidadMedico} onChange={e => setFiltroEspecialidadMedico(e.target.value)} className="border p-2 rounded-lg text-sm bg-gray-50 outline-none">
                  <option value="">Todas las Especialidades</option>
                  {especialidadesList.map(esp => (<option key={esp.id} value={esp.nombre}>{esp.nombre}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {medicos.map(doc => (
                  <div key={doc.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center hover:shadow-md transition">
                    <div className="mx-auto h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold mb-3">{doc.nombres.charAt(0)}</div>
                    <h3 className="font-bold text-gray-900">{doc.nombres} {doc.apellidos}</h3>
                    <p className="text-xs text-gray-500 mt-1">{doc.especialidad}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODALES */}
      {modalReservaVisible && horarioSeleccionado && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 p-8 text-white text-center">
              <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm rotate-3">
                <BookMarked size={32} />
              </div>
              <h2 className="text-2xl font-black">Confirmar Reserva</h2>
              <p className="text-indigo-100 mt-1">Estás a un paso de tu consulta médica</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Médico</p>
                    <p className="text-sm font-bold text-gray-800">Dr(a). {horarioSeleccionado.doctor_nombres} {horarioSeleccionado.doctor_apellidos}</p>
                    <p className="text-xs text-indigo-600 font-medium">{horarioSeleccionado.especialidad}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</p>
                      <p className="text-sm font-bold text-gray-800">{fecha}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hora</p>
                      <p className="text-sm font-bold text-gray-800">{horarioSeleccionado.hora_inicio.substring(0, 5)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReservarCita}
                  disabled={isReservando}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isReservando ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  Agendar ahora
                </button>
                <button
                  onClick={cerrarModalReserva}
                  className="w-full py-3 text-gray-500 font-bold hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalModificarVisible && citaSeleccionada && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
              <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm">
                <Edit3 size={32} />
              </div>
              <h2 className="text-2xl font-black">Reagendar Cita</h2>
              <p className="text-indigo-100 text-sm mt-1">Dr(a). {citaSeleccionada.doctor_nombres} {citaSeleccionada.doctor_apellidos}</p>
            </div>

            <div className="p-8 space-y-6">
              {/* Alertas Internas del Modal */}
              {error && <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
              {mensajeExito && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle size={14} /> {mensajeExito}</div>}

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 transition-colors group-focus-within:text-indigo-600">Nueva Fecha</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="date"
                      value={nuevaFecha}
                      onChange={e => setNuevaFecha(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-gray-900"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 transition-colors group-focus-within:text-indigo-600">Nueva Hora</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="time"
                      value={nuevaHora}
                      onChange={e => setNuevaHora(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleModificar}
                  disabled={isModificando}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isModificando ? <Loader2 className="animate-spin" size={20} /> : <CalendarPlus size={20} />}
                  Confirmar Cambios
                </button>
                <button onClick={cerrarModalModificar} className="w-full py-3 text-gray-500 font-bold hover:text-gray-800 transition-colors">Tal vez después</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalEliminarVisible && citaSeleccionada && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              {/* Alertas Internas del Modal */}
              {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 justify-center"><AlertCircle size={14} /> {error}</div>}
              {mensajeExito && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2 justify-center"><CheckCircle size={14} /> {mensajeExito}</div>}

              <div className="mx-auto w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">¿Cancelar esta cita?</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Estás a punto de cancelar tu cita con el <span className="font-bold text-gray-800">Dr(a). {citaSeleccionada.doctor_nombres} {citaSeleccionada.doctor_apellidos}</span> el día <span className="font-bold text-gray-800">{formatCardDate(citaSeleccionada.fecha_cita)}</span>.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmarEliminacion}
                  disabled={isEliminando}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg shadow-rose-200 hover:bg-rose-600 hover:shadow-rose-300 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isEliminando ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  Sí, cancelar cita
                </button>
                <button
                  onClick={cerrarModalEliminar}
                  className="w-full py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                >
                  No, mantener cita
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}