"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import {
  Calendar, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Clock, Video, LayoutDashboard, FileText, CalendarDays, User, MapPin
} from 'lucide-react';

// --- CONFIGURACIÓN DEL NAVBAR ---
const navLinksDoctor = [
  { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
  { name: 'Agenda', href: '/doctor/agenda', icon: Calendar },
  { name: 'Historia Clínica', href: '/doctor/historia', icon: FileText },
];

// --- TIPOS DE DATOS ---
interface Cita {
  idCita: number;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm:ss"
  horaFin: string; // "HH:mm:ss"
  linkCita?: string | null;
  pacienteNombre: string;
  pacienteApellido: string;
  estado?: string;
}

interface AgendaData {
  citas: Cita[];
}

// --- CONSTANTES ---
const DIAS_SEMANA = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

// --- FUNCIONES DE AYUDA (CALENDARIO MENSUAL) ---
const getCalendarDays = (currentDate: Date) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Primer día del mes
  const firstDayOfMonth = new Date(year, month, 1);
  // Día de la semana del primer día (0 = Domingo)
  const startDayOfWeek = firstDayOfMonth.getDay();

  // Calcular el inicio de la cuadrícula (el domingo previo)
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  const days = [];
  // Generar 42 días (6 semanas) para cubrir cualquier mes
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

const isMismoDia = (d1: Date, d2: Date): boolean => {
  return d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();
};

const isMismoMes = (d1: Date, current: Date): boolean => {
  return d1.getMonth() === current.getMonth();
};

// --- COMPONENTE DE CITA EN EL CALENDARIO ---
const CitaMonthItem = ({ cita }: { cita: Cita }) => {
  // Color según estado
  const borderColor =
    cita.estado === 'Asistió' ? 'border-l-green-500' :
      cita.estado === 'Falta' ? 'border-l-red-500' : 'border-l-indigo-500';

  return (
    <div className={`bg-white border-l-4 ${borderColor} p-1.5 mb-1 rounded shadow-sm hover:shadow-md transition-all text-xs border border-gray-100`}>
      {/* 1. Nombre del Paciente */}
      <div className="font-bold text-gray-800 truncate" title={`${cita.pacienteNombre} ${cita.pacienteApellido}`}>
        {cita.pacienteNombre} {cita.pacienteApellido}
      </div>

      {/* 2. Rango de Horas */}
      <div className="flex items-center gap-1 text-gray-500 mt-0.5 font-medium">
        <Clock size={10} />
        <span>{cita.horaInicio.slice(0, 5)} - {cita.horaFin.slice(0, 5)}</span>
      </div>

      {/* 3. Link (si existe) */}
      {cita.linkCita && (
        <a
          href={cita.linkCita}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 p-0.5 rounded w-fit"
          onClick={(e) => e.stopPropagation()}
        >
          <Video size={10} /> <span className="text-[10px]">Unirse</span>
        </a>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const AgendaDoctorPage = () => {
  const { user, role, loading: authLoading } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendaData, setAgendaData] = useState<AgendaData>({ citas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generar los días de la cuadrícula
  const calendarDays = useMemo(() => getCalendarDays(currentDate), [currentDate]);
  const hoy = useMemo(() => new Date(), []);

  // --- Carga de Datos ---
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAgenda = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: citasDB, error: citasError } = await supabase
          .from('cita')
          .select(`
            idcita, fecha, horainicio, horafin, linkcita,
            paciente:perfiles!fk_cita_perfiles(nombres, apellidos),
            asistencia(estadoasistencia:idestadoasistencia(estadoasistencia))
          `)
          .eq('iddoctor', user.id); // Filtro seguro

        if (citasError) throw citasError;

        const citasFmt: Cita[] = (citasDB || []).map((c: any) => {
          const asistenciaObj = Array.isArray(c.asistencia) ? c.asistencia[0] : c.asistencia;
          const estado = asistenciaObj?.estadoasistencia?.estadoasistencia || 'Pendiente';

          return {
            idCita: c.idcita,
            fecha: c.fecha,
            horaInicio: c.horainicio,
            horaFin: c.horafin || c.horainicio, // Fallback si es nulo
            linkCita: c.linkcita,
            pacienteNombre: c.paciente?.nombres || 'Desconocido',
            pacienteApellido: c.paciente?.apellidos || '',
            estado: estado
          };
        });

        setAgendaData({ citas: citasFmt });

      } catch (err: any) {
        console.error("Error agenda:", err);
        setError("No se pudo cargar la agenda.");
      } finally {
        setLoading(false);
      }
    };

    fetchAgenda();
  }, [user, role, authLoading]);

  // --- Organizar citas por fecha (Optimización) ---
  const citasPorDia = useMemo(() => {
    const map = new Map<string, Cita[]>();
    // Inicializar mapa vacío no es necesario, lo llenamos dinámicamente
    for (const cita of agendaData.citas) {
      // Ajuste de zona horaria simple (fecha string viene YYYY-MM-DD)
      const fechaKey = cita.fecha;
      if (!map.has(fechaKey)) {
        map.set(fechaKey, []);
      }
      map.get(fechaKey)?.push(cita);
    }
    return map;
  }, [agendaData.citas]);

  // --- Citas Próximas para la Lista Lateral ---
  const citasProximas = useMemo(() => {
    return [...agendaData.citas]
      .filter(c => new Date(c.fecha + 'T' + c.horaInicio) >= new Date())
      .sort((a, b) => new Date(a.fecha + 'T' + a.horaInicio).getTime() - new Date(b.fecha + 'T' + b.horaInicio).getTime())
      .slice(0, 10);
  }, [agendaData.citas]);

  // --- Navegación ---
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Navbar navLinks={navLinksDoctor} principal="/doctor" />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Agenda Mensual</h1>
              <p className="text-slate-500 mt-1 capitalize">
                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Controles de Navegación */}
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
              <button onClick={goToday} className="text-sm font-medium px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">Hoy</button>
              <div className="w-px h-6 bg-gray-200"></div>
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={20} /></button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={20} /></button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

            {/* --- CALENDARIO MENSUAL (3 Columnas) --- */}
            <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
              {/* Cabecera Días Semana */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
                {DIAS_SEMANA.map(day => (
                  <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid de Días */}
              {loading ? (
                <div className="flex-1 flex justify-center items-center">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-7 grid-rows-6 flex-1">
                  {calendarDays.map((day, idx) => {
                    // Formatear fecha para buscar en el mapa (YYYY-MM-DD)
                    // Importante: usar toISOString().split('T')[0] puede fallar por zona horaria.
                    // Mejor construir "YYYY-MM-DD" localmente.
                    const year = day.getFullYear();
                    const month = String(day.getMonth() + 1).padStart(2, '0');
                    const d = String(day.getDate()).padStart(2, '0');
                    const dateKey = `${year}-${month}-${d}`;

                    const citasDelDia = citasPorDia.get(dateKey) || [];
                    const esMesActual = isMismoMes(day, currentDate);
                    const esHoyDia = isMismoDia(day, hoy);

                    return (
                      <div
                        key={idx}
                        className={`border-b border-r border-gray-100 p-2 flex flex-col relative transition-colors
                           ${!esMesActual ? 'bg-slate-50/50 text-gray-400' : 'bg-white'}
                           ${esHoyDia ? 'bg-indigo-50/30' : ''}
                         `}
                      >
                        {/* Número de Día */}
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full 
                             ${esHoyDia ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700'}`}>
                            {day.getDate()}
                          </span>
                          {citasDelDia.length > 0 && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                              {citasDelDia.length}
                            </span>
                          )}
                        </div>

                        {/* Lista de Citas en el Día */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mt-1 pr-1" style={{ maxHeight: '100px' }}>
                          {citasDelDia.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)).map(cita => (
                            <CitaMonthItem key={cita.idCita} cita={cita} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* --- LISTA LATERAL (1 Columna) --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[800px] overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <CalendarDays className="text-indigo-600" size={20} />
                  Próximas Citas
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {citasProximas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Calendar className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">No hay citas futuras</p>
                  </div>
                ) : (
                  citasProximas.map(cita => (
                    <div key={cita.idCita} className="relative group p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cita.estado === 'Asistió' ? 'bg-green-500' :
                        cita.estado === 'Falta' ? 'bg-red-500' : 'bg-indigo-500'
                        }`}></div>

                      <div className="flex justify-between items-start pl-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{cita.pacienteNombre} {cita.pacienteApellido}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <User size={12} /> Paciente
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 text-indigo-600 font-bold text-sm">
                            <Clock size={14} /> {cita.horaInicio.slice(0, 5)}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 capitalize">
                            {new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {cita.linkCita && (
                        <div className="mt-3 pt-2 border-t border-slate-50 pl-3">
                          <a href={cita.linkCita} target="_blank" className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium">
                            <Video size={14} /> Unirse
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default AgendaDoctorPage;