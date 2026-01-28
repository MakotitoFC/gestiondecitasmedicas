"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Edit3,
  Trash2,
  CalendarPlus,
  Stethoscope,
  User,
  CheckCircle,
  AlertCircle,
  Search,
  BookMarked,
  ShieldCheck,
  BarChart3,
  Lightbulb, // Nuevo icono para el paso 1
  UserCog,   // Nuevo icono para el paso 2
  ArrowLeft, // Nuevo icono para botón "Cambiar Especialidad"
  CalendarDays // Nuevo icono para fecha en el modal
} from 'lucide-react';

// --- (Simulated Patient y Interfaces - Sin cambios) ---
const SIMULATED_PATIENT = {
  paciente_id: "4e092c6c-fdcc-44bb-a05a-6d69a1ddec54",
  nombre: "Paciente",
  email: "fcaffo18@gmail.com",
  telefono: "917654321",
  id_telegram: "6202308962"
};

interface HorarioDisponible {
  id: string;
  doctor_id: string;
  doctor_nombres: string;
  doctor_apellidos: string;
  especialidad: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

interface CitaActual {
  id_cita: number;
  fecha_cita: string;
  hora_inicio: string;
  doctor_nombres: string;
  doctor_apellidos: string;
  id_doctor: string;
  google_event_id: string;
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

const Navbar = ({ paciente }: { paciente: typeof SIMULATED_PATIENT }) => (
  <nav className="fixed top-0 left-0 w-full bg-white shadow-sm z-40 border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex-shrink-0 flex items-center">
          <span className="font-bold text-2xl text-indigo-600">MediCitas</span>
        </div>
        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
          <a
            href="#proximas-citas"
            className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
          >
            Mis Citas
          </a>
        </div>
        <div className="flex items-center">
          <div className="ml-3 text-right">
            <div className="text-sm font-medium text-gray-900">{paciente.nombre}</div>
            <div className="text-xs font-medium text-gray-500">{paciente.email}</div>
          </div>
          <div className="ml-3 relative">
            <button className="bg-white rounded-full flex text-sm focus:outline-none">
              <span className="sr-only">Abrir menú de usuario</span>
              <img
                className="h-9 w-9 rounded-full"
                src={`https://ui-avatars.com/api/?name=${paciente.nombre.charAt(0)}&background=0D8ABC&color=fff&bold=true`}
                alt="Avatar"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
);

export default function CitasPage() {
  const paciente = SIMULATED_PATIENT;
  const router = useRouter();

  const [especialidad, setEspecialidad] = useState('');
  const [fecha, setFecha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReservando, setIsReservando] = useState(false);

  const [disponibilidad, setDisponibilidad] = useState<HorarioDisponible[]>([]);
  const [disponibilidadAgrupada, setDisponibilidadAgrupada] = useState<DisponibilidadAgrupada[]>([]);

  const [busquedaRealizada, setBusquedaRealizada] = useState(false); // Para mostrar u ocultar resultados
  const [citas, setCitas] = useState<CitaActual[]>([]);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const [modalReservaVisible, setModalReservaVisible] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<HorarioDisponible | null>(null);

  const [modalModificarVisible, setModalModificarVisible] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaActual | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');

  // --- (useEffect y calcularHoraFin) ---
  useEffect(() => {
    fetchCitas();
  }, []);

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

  const calcularHoraFin = (horaInicio: string): string => {
    try {
      const [horas, minutos] = horaInicio.split(':').map(Number);
      const date = new Date();
      date.setHours(horas + 1, minutos, 0, 0);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '01:00';
    }
  };

  // --- LÓGICA CRUD ---
  const fetchCitas = async () => {
    setError('');
    try {
      const response = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "read",
          telefono: paciente.telefono
        })
      });
      let data = await response.json();
      if (!Array.isArray(data)) {
        console.warn('Advertencia: N8N devolvió un valor no array para las citas. Asumiendo array vacío.');
        data = [];
      }
      if (!response.ok) {
        throw new Error(data.error || 'Error en los datos recibidos');
      }
      setCitas(data as CitaActual[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar tus citas');
      setCitas([]);
    }
  };

  const handleReservarCita = async () => {
    if (!horarioSeleccionado || !fecha) return;

    setIsReservando(true);
    setError('');
    setMensajeExito('');

    try {
      const response = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "create",
          paciente_id: paciente.paciente_id,
          doctor_id: horarioSeleccionado.doctor_id,
          fecha: fecha,
          hora: horarioSeleccionado.hora_inicio,
          especialidad_id: especialidad,
          nombre_paciente: paciente.nombre,
          email_paciente: paciente.email,
          id_telegram: paciente.id_telegram,
          telefono: paciente.telefono
        })
      });

      let data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al reservar la cita');
      if (!Array.isArray(data)) data = [];

      setMensajeExito('¡Cita reservada con éxito!');
      setDisponibilidad([]);
      setBusquedaRealizada(false);
      cerrarModalReserva();
      setCitas(data as CitaActual[]);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsReservando(false);
    }
  };

  const handleModificar = async () => {
    if (!citaSeleccionada) return;
    setError('');
    setMensajeExito('');

    try {
      const response = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "update",
          p_nueva_fecha: nuevaFecha,
          p_nueva_hora: nuevaHora,
          p_id_cita_actual: citaSeleccionada.id_cita,
          p_nuevo_doctor_id: citaSeleccionada.id_doctor,
          google_event_id_VIEJO: citaSeleccionada.google_event_id,
          nombre_paciente: paciente.nombre,
          email_paciente: paciente.email,
          id_telegram: paciente.id_telegram,
          telefono: paciente.telefono
        })
      });

      let data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al modificar la cita');
      if (!Array.isArray(data)) data = [];
      setMensajeExito('¡Cita modificada con éxito!');
      cerrarModalModificar();
      setCitas(data as CitaActual[]);

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEliminarCita = async (cita: CitaActual) => {
    if (!window.confirm("¿Estás seguro de cancelar esta cita?")) return;
    setError('');
    setMensajeExito('');

    try {
      const response = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "delete",
          id_cita: cita.id_cita,
          google_event_id_VIEJO: cita.google_event_id,
          fecha_cita_eliminada: cita.fecha_cita,
          hora_cita_eliminada: cita.hora_inicio,
          nombre_paciente: paciente.nombre,
          email_paciente: paciente.email,
          id_telegram: paciente.id_telegram,
          telefono: paciente.telefono
        })
      });

      let data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar la cita');
      if (!Array.isArray(data)) data = [];
      setMensajeExito('¡Cita cancelada con éxito!');
      setCitas(data as CitaActual[]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const abrirModalModificar = (cita: CitaActual) => {
    setCitaSeleccionada(cita);
    setModalModificarVisible(true);
    setNuevaFecha(cita.fecha_cita);
    setNuevaHora(cita.hora_inicio);
  };
  const cerrarModalModificar = () => {
    setModalModificarVisible(false);
    setCitaSeleccionada(null);
  };

  const abrirModalReserva = (horario: HorarioDisponible) => {
    setHorarioSeleccionado(horario);
    setModalReservaVisible(true);
  };
  const cerrarModalReserva = () => {
    setHorarioSeleccionado(null);
    setModalReservaVisible(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setDisponibilidad([]);
    setDisponibilidadAgrupada([]);
    setBusquedaRealizada(true);
    setError('');
    setMensajeExito('');

    try {
      const response = await fetch('/api/citas/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "search",
          especialidad: especialidad,
          fecha: fecha
        })
      });

      let data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al buscar disponibilidad');
      if (!Array.isArray(data)) data = [];

      setDisponibilidad(data as HorarioDisponible[]);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- (Helpers para el RENDER) ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos Días';
    if (hour < 18) return 'Buenas Tardes';
    return 'Buenas Noches';
  };
  const greeting = getGreeting();
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const formatCardDate = (fechaStr: string) => {
    try {
      const [y, m, d] = fechaStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'short'
      });
    } catch {
      return fechaStr; // fallback
    }
  };


  // --- RENDER (Aquí está el cambio principal) ---
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar paciente={paciente} />

      <main className="pt-20 lg:pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

            {/* --- Columna Izquierda (Principal) --- */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* ... (Saludo y Tarjetas de Acceso Rápido) ... */}
              <div className="bg-indigo-500 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">{greeting}, {paciente.nombre}</h1>
                  <p className="text-indigo-100 mt-1">{currentDate}</p>
                </div>
                <span className="text-5xl hidden sm:block">👋</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a href="#agendar" className="bg-white p-4 rounded-xl shadow border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-lg"><CalendarPlus size={24} className="text-indigo-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Agendar Cita</h3>
                    <p className="text-sm text-gray-500">Busca y agenda tu consulta</p>
                  </div>
                </a>
                <a href="#proximas-citas" className="bg-white p-4 rounded-xl shadow border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-lg"><Calendar size={24} className="text-indigo-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mis Citas</h3>
                    <p className="text-sm text-gray-500">{citas.length} citas programadas</p>
                  </div>
                </a>
                <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center gap-4 opacity-70">
                  <div className="p-3 bg-gray-100 rounded-lg"><Stethoscope size={24} className="text-gray-600" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Ver Médicos</h3>
                    <p className="text-sm text-gray-500">Conoce especialistas</p>
                  </div>
                </div>
              </div>

              {/* *************************************************************** */}
              {/* --- 3. SECCIÓN DE AGENDAR CITA: Con diseño de pasos --- */}
              {/* *************************************************************** */}
              <div id="agendar" className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Agendar una nueva cita</h2>

                {/* Paso 1: Elegir Especialidad y Fecha */}
                {!busquedaRealizada && (
                  <div className="mb-8">
                    <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg mb-5 border border-indigo-200 flex items-start gap-3">
                      <Lightbulb size={24} className="text-indigo-600 mt-1" />
                      <div>
                        <p className="font-bold text-lg">Paso 1 de 2: Elige Especialidad y Fecha</p>
                        <p className="text-sm text-indigo-700">Selecciona el área médica y la fecha, luego te mostraremos los médicos disponibles.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSearch} className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                          <select
                            id="especialidad"
                            value={especialidad}
                            onChange={(e) => setEspecialidad(e.target.value)}
                            className="w-full border p-3 rounded-lg bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          >
                            <option value="">Seleccione Especialidad...</option>
                            <option value="1">Medicina General</option>
                            <option value="2">Cardiología</option>
                            <option value="3">Dermatología</option>
                            <option value="4">Pediatría</option>
                            <option value="5">Ginecología y Obstetricia</option>
                            <option value="6">Oftalmología</option>
                            <option value="7">Traumatólogía y Ortopedia</option>
                            <option value="8">Psiquiatría</option>
                            <option value="9">Neurología</option>
                            <option value="10">Endocrinología</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                          <input
                            id="fecha"
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full border p-3 rounded-lg bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full sm:w-auto sm:self-end px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition duration-150 flex items-center justify-center gap-2"
                      >
                        <Search size={18} />
                        {isLoading ? 'Buscando...' : 'Buscar Horarios'}
                      </button>
                    </form>
                  </div>
                )}


                {/* Paso 2: Médicos Disponibles y Horarios */}
                {busquedaRealizada && (
                  <div>
                    <div className="bg-green-50 text-green-800 p-4 rounded-lg mb-5 border border-green-200 flex items-start gap-3">
                      <UserCog size={24} className="text-green-600 mt-1" />
                      <div>
                        <p className="font-bold text-lg">Paso 2 de 2: Selecciona tu médico y hora</p>
                        <p className="text-sm text-green-700">Encontramos {disponibilidadAgrupada.length} especialista(s) disponible(s) en <span className="font-semibold">{especialidad === "1" ? "Medicina General" : especialidad === "2" ? "Cardiología" : "Otras Especialidades"}</span> para el <strong>{fecha}</strong>.</p>
                      </div>
                    </div>

                    <button
                      onClick={() => { setBusquedaRealizada(false); setDisponibilidad([]); setDisponibilidadAgrupada([]); }}
                      className="mb-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition duration-150 flex items-center gap-2"
                    >
                      <ArrowLeft size={18} /> Cambiar Especialidad/Fecha
                    </button>

                    {isLoading ? (
                      <p className="text-gray-500">Buscando horarios...</p>
                    ) : disponibilidadAgrupada.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {disponibilidadAgrupada.map((grupo) => (
                          <div key={grupo.doctor.id} className="bg-white p-5 rounded-xl shadow border border-gray-100">
                            {/* Info del Doctor */}
                            <div className="flex items-center gap-4 mb-4">
                              <img
                                className="h-14 w-14 rounded-full object-cover"
                                src={`https://ui-avatars.com/api/?name=${grupo.doctor.nombres.split(' ')[0]}&background=random`}
                                alt="Doctor"
                              />
                              <div>
                                <h4 className="font-bold text-lg text-gray-900">Dr(a). {grupo.doctor.nombres} {grupo.doctor.apellidos}</h4>
                                <span className="text-sm font-medium text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full mt-1 inline-block">
                                  {grupo.doctor.especialidad}
                                </span>
                              </div>
                            </div>

                            <p className="text-sm font-medium text-gray-600 mb-3">Horas disponibles:</p>
                            <div className="flex flex-wrap gap-2">
                              {grupo.horarios.map((horario) => (
                                <button
                                  key={horario.id}
                                  onClick={() => abrirModalReserva(horario)}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition duration-150 text-sm"
                                >
                                  {horario.hora_inicio}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No se encontraron horarios disponibles para la fecha y especialidad seleccionadas.</p>
                    )}
                  </div>
                )}
              </div>

              {/* ... (Mensajes de éxito/error y Lista de Citas) ... */}
              {mensajeExito && <div className="bg-green-100 p-4 rounded-lg text-green-700 font-medium flex items-center gap-2"><CheckCircle size={20} />{mensajeExito}</div>}
              {error && <div className="bg-red-100 p-4 rounded-lg text-red-700 font-medium flex items-center gap-2"><AlertCircle size={20} />{error}</div>}

              <div id="proximas-citas" className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-900 mt-4">Mis Próximas Citas</h2>
                {!error && citas.length === 0 && (
                  <div className="bg-white p-6 rounded-xl shadow border border-gray-100 text-gray-600">
                    <p>No tienes citas programadas actualmente.</p>
                  </div>
                )}
                {citas.map((cita) => (
                  <div key={cita.id_cita} className="bg-white p-5 rounded-xl shadow border border-gray-100 transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 items-center">
                        <img
                          className="h-12 w-12 rounded-full object-cover"
                          src={`https://ui-avatars.com/api/?name=${cita.doctor_nombres.split(' ')[0]}&background=random`}
                          alt="Doctor"
                        />
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">{cita.doctor_nombres} {cita.doctor_apellidos}</h4>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                        Programada
                      </span>
                    </div>

                    {/* <div className="border-t border-dashed my-4"></div> */}

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar size={16} className="text-gray-500" />
                          <span className="font-medium">{formatCardDate(cita.fecha_cita)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock size={16} className="text-gray-500" />
                          <span className="font-medium">{cita.hora_inicio}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => abrirModalModificar(cita)}
                          className="text-sm font-medium text-yellow-600 hover:text-yellow-500 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-yellow-50 hover:bg-yellow-100 transition-colors"
                        >
                          <Edit3 size={14} /> Modificar
                        </button>
                        <button
                          onClick={() => handleEliminarCita(cita)}
                          className="text-sm font-medium text-red-600 hover:text-red-500 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- Columna Derecha (Sidebar) --- */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <h3 className="font-bold text-lg mb-4 text-gray-900">Próximas Citas</h3>
                {citas.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {citas.slice(0, 3).map(cita => (
                      <div key={cita.id_cita} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2.5 bg-indigo-100 rounded-lg"><Calendar size={20} className="text-indigo-600" /></div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">Dr(a). {cita.doctor_apellidos}</p>
                          <p className="text-xs text-gray-500">{formatCardDate(cita.fecha_cita)} • {cita.hora_inicio}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No tienes citas próximas.</p>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <h3 className="font-bold text-lg mb-4 text-gray-900">Estadísticas</h3>
                <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg">
                  <div className='flex items-center gap-3'>
                    <BarChart3 className="text-indigo-700" size={20} />
                    <span className="font-medium text-indigo-800">Total Citas</span>
                  </div>
                  <span className="font-bold text-xl text-indigo-900 bg-indigo-200 rounded-full w-9 h-9 flex items-center justify-center">
                    {citas.length}
                  </span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                <h3 className="font-bold text-lg mb-4 text-gray-900">Consejos Útiles</h3>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-start gap-3">
                    <BookMarked size={20} className="text-green-600 mt-0.5" />
                    <span className="text-sm text-gray-700">Ten a mano tus documentos médicos.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ShieldCheck size={20} className="text-green-600 mt-0.5" />
                    <span className="text-sm text-gray-700">Asegura una buena conexión a internet para tu consulta.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de RESERVA (Paso 3 de 3) */}
      {modalReservaVisible && horarioSeleccionado && (
        <div className="fixed inset-0 bg-gray bg-opacity-40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-indigo-700 mb-2">Paso 3 de 3: Confirma tu Cita</h2>
            <p className="text-gray-600 mb-5">Revisa los detalles y confirma tu cita virtual.</p>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 flex items-center gap-4">
              <img
                className="h-12 w-12 rounded-full object-cover"
                src={`https://ui-avatars.com/api/?name=${horarioSeleccionado.doctor_nombres.split(' ')[0]}&background=random`}
                alt="Doctor"
              />
              <div>
                <h4 className="font-semibold text-gray-900">{horarioSeleccionado.doctor_nombres} {horarioSeleccionado.doctor_apellidos}</h4>
                <p className="text-sm text-gray-600">{horarioSeleccionado.especialidad}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Fecha de la cita</label>
                <div className="flex items-center gap-2 bg-gray-100 p-2.5 rounded-lg border border-gray-300">
                  <CalendarDays size={18} className="text-gray-500" />
                  <span className="text-gray-800">{fecha}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Hora disponible</label>
                <div className="flex items-center gap-2 bg-gray-100 p-2.5 rounded-lg border border-gray-300">
                  <Clock size={18} className="text-gray-500" />
                  <span className="text-gray-800">{horarioSeleccionado.hora_inicio}</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg text-indigo-800 flex items-center gap-3 mb-6">
              <img src="https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v1/web-32dp/logo_meet_2020q4_color_2x_web_32dp.png" alt="Google Meet" className="w-6 h-6" />
              <div>
                <p className="font-semibold">Consulta Virtual por Google Meet</p>
                <p className="text-sm">Recibirás el enlace de la videollamada automáticamente.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={cerrarModalReserva}
                className="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium text-gray-800 transition duration-150"
                disabled={isReservando}
              >
                Cancelar
              </button>
              <button
                onClick={handleReservarCita}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition duration-150"
                disabled={isReservando}
              >
                {isReservando ? 'Confirmando...' : 'Confirmar Cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de MODIFICACIÓN */}
      {modalModificarVisible && citaSeleccionada && (
        <div className="fixed inset-0 bg-gray bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-indigo-700 mb-1">Modificar Cita</h2>
            <p className="text-gray-600 mb-5">con Dr(a). {citaSeleccionada.doctor_nombres}</p>

            <label className="block text-sm text-gray-700 mb-1 font-medium">Nueva Fecha:</label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full border p-2.5 rounded-lg mb-4 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
            />

            <label className="block text-sm text-gray-700 mb-1 font-medium">Nueva Hora:</label>
            <input
              type="time"
              value={nuevaHora}
              onChange={(e) => setNuevaHora(e.target.value)}
              className="w-full border p-2.5 rounded-lg mb-6 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={cerrarModalModificar}
                className="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium text-gray-800 transition duration-150"
              >
                Cancelar
              </button>
              <button
                onClick={handleModificar}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition duration-150"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
