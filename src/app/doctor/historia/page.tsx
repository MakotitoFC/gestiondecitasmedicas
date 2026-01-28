"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { supabase } from "../../../../lib/supabaseClient";
import {
  Users, Search, FileText, Activity,
  Stethoscope, Pill, Thermometer, Plus,
  Trash2, Save, X, Edit, Eye, Clock,
  ChevronRight, Printer, LayoutDashboard, Check, ChevronDown // Importamos el icono del dashboard
} from 'lucide-react';

// Alias para el icono del calendario importado arriba para evitar conflictos
import { Calendar as CalendarIcon } from 'lucide-react';

// --- Tipos de Datos ---
interface RecetaItem {
  id: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
}

interface Expediente {
  id: string;
  // Triaje
  peso: string;
  talla: string;
  temperatura: string;
  presion: string;
  saturacion: string;
  // Consulta
  motivoConsulta: string;
  diagnostico: string;
  tratamiento: string;
  // Receta
  receta: RecetaItem[];
}

interface Paciente {
  id: string;
  nombres: string;
  apellidos: string;
  edad: number;
  sexo: string;
  ultimaConsulta?: string;
  expedienteActual?: Expediente; // Datos de la consulta actual/última
}

// --- Constantes de Navegación (CORREGIDO) ---
const navLinksDoctor = [
  { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
  { name: 'Agenda', href: '/doctor/agenda', icon: CalendarIcon },
  { name: 'Historia Clínica', href: '/doctor/historia', icon: FileText }, // FileText o Users queda bien aquí
];

export default function DoctorPacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Paciente | null>(null);
  const [activeTab, setActiveTab] = useState<'triaje' | 'diagnostico' | 'receta'>('triaje');

  // Estado del Formulario (Expediente)
  const [formData, setFormData] = useState<Expediente>({
    id: '', peso: '', talla: '', temperatura: '', presion: '', saturacion: '',
    motivoConsulta: '', diagnostico: '', tratamiento: '',
    receta: []
  });

  // --- Mock Data (Simulando carga de BD) ---
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // --- Carga de Datos Real desde Supabase ---
  useEffect(() => {
    const fetchPacientes = async () => {
      setLoading(true);
      try {
        // 1. Obtener todos los perfiles
        // Intentamos obtener campo 'rol' si existe, 'fecha_nacimiento'
        const { data: perfilesData, error: perfilesError } = await supabase
          .from('perfiles')
          .select('*');

        if (perfilesError) throw perfilesError;

        // 2. Obtener lista de doctores para excluir (si no hay campo 'rol' confiable)
        const { data: doctoresData, error: doctoresError } = await supabase
          .from('doctor')
          .select('iddoctor');

        const doctorIds = new Set((doctoresData || []).map((d: any) => d.iddoctor));

        // 3. Obtener citas para calcular "Última Consulta"
        // Traemos solo lo necesario para no sobrecargar
        const { data: citasData, error: citasError } = await supabase
          .from('cita')
          .select('idpaciente, fecha')
          .order('fecha', { ascending: false });

        // Mapa de última cita por paciente
        const ultimasCitas = new Map<string, string>();
        if (citasData) {
          citasData.forEach((c: any) => {
            // Como viene ordenado desc, la primera que encontremos es la última
            if (c.idpaciente && !ultimasCitas.has(c.idpaciente)) {
              ultimasCitas.set(c.idpaciente, c.fecha);
            }
          });
        }

        // 4. Transformar y Filtrar (excluir doctores y otros roles)
        const pacientesReales: Paciente[] = (perfilesData || [])
          .filter((p: any) => p.rol === 'paciente') // Solo mostrar usuarios con rol 'paciente'
          .map((p: any) => ({
            id: p.id,
            nombres: p.nombres || '',
            apellidos: p.apellidos || '',
            edad: calculateAge(p.fecha_nacimiento || p.fechanacimiento),
            sexo: p.sexo || '-',
            ultimaConsulta: ultimasCitas.get(p.id) || '-',
            expedienteActual: undefined // Se cargaría al abrir el modal individualmente
          }));

        setPacientes(pacientesReales);
      } catch (err: any) {
        console.error("Error cargando pacientes:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPacientes();
  }, []);

  // Estado de Historial
  const [expedientesList, setExpedientesList] = useState<any[]>([]);
  const [loadingExpediente, setLoadingExpediente] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // --- Estados para Notificaciones Modales ---
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string }>({
    show: false, type: 'success', title: '', message: ''
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [recordToDeleteId, setRecordToDeleteId] = useState<string | null>(null);

  const [currentHistoriaId, setCurrentHistoriaId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Lógica del Formulario ---
  const handleOpenModal = async (paciente: Paciente) => {
    setCurrentPatient(paciente);
    setActiveTab('triaje');
    setIsModalOpen(true);
    setExpedientesList([]); // Limpiar historial previo
    setCurrentHistoriaId(null);

    // 1. Resetear form por defecto (Nueva Consulta)
    resetFormData();

    // 2. Cargar historial existente
    try {
      setLoadingExpediente(true);
      // Paso A: Obtener el ID de la historia médica
      const { data: historias, error: histError } = await supabase
        .from('vista_historia')
        .select('idhistoriamedica')
        .eq('nombres', paciente.nombres)
        .eq('apellidos', paciente.apellidos)
        .limit(1);

      if (histError || !historias || historias.length === 0) {
        setLoadingExpediente(false);
        // Intentar buscar por idpaciente directamente en historia_clinica si la vista falla
        const { data: hcData } = await supabase
          .from('historia_clinica')
          .select('idhistoriamedica')
          .eq('idpaciente', paciente.id)
          .single();

        if (hcData) {
          setCurrentHistoriaId(hcData.idhistoriamedica);
        } else {
          // Crear historia si no existe (Opcional, pero recomendado)
          const { data: newHc, error: newHcError } = await supabase
            .from('historia_clinica')
            .insert([{ idpaciente: paciente.id }])
            .select()
            .single();
          if (newHc) setCurrentHistoriaId(newHc.idhistoriamedica);
        }
        return;
      }

      const idHistoria = historias[0].idhistoriamedica;
      setCurrentHistoriaId(idHistoria);

      // Paso B: Obtener TODOS los expedientes de esa historia
      const { data: expedientes, error: expError } = await supabase
        .from('vista_detalle_expediente')
        .select('*')
        .eq('idhistoriamedica', idHistoria)
        .order('fecha_atencion', { ascending: false });

      if (expedientes && expedientes.length > 0) {
        setExpedientesList(expedientes);
        // NO Cargar el más reciente por defecto, dejar en Nueva Consulta
        // await loadExpediente(expedientes[0]); 
      }

    } catch (err) {
      console.error("Excepción al cargar historial:", err);
    } finally {
      setLoadingExpediente(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      id: Math.random().toString(36).substr(2, 9),
      peso: '', talla: '', temperatura: '', presion: '', saturacion: '',
      motivoConsulta: '', diagnostico: '', tratamiento: '',
      receta: []
    });
  };

  const loadExpediente = async (expediente: any) => {
    setLoadingExpediente(true);
    try {
      setFormData({
        id: expediente.idexpediente?.toString() || Math.random().toString(),
        peso: expediente.peso || '',
        talla: expediente.talla || '',
        temperatura: expediente.temperatura || '',
        presion: expediente.presion_arterial || '',
        saturacion: expediente.saturacion || '',
        motivoConsulta: expediente.motivo_consulta || expediente.sintomas || '', // Fallbacks
        diagnostico: expediente.diagnostico || '',
        tratamiento: expediente.resumen_tratamiento || expediente.tratamiento || '',
        receta: []
      });

      // Paso C: Obtener Recetas desde las Tablas Reales (receta -> detallereceta)
      // 1. Buscar la cabecera
      const { data: recetasHead } = await supabase
        .from('receta')
        .select('idreceta')
        .eq('idexpediente', expediente.idexpediente)
        .limit(1);

      if (recetasHead && recetasHead.length > 0) {
        const idReceta = recetasHead[0].idreceta;

        // 2. Buscar los detalles
        const { data: detalles } = await supabase
          .from('detallereceta')
          .select('*')
          .eq('idreceta', idReceta);

        if (detalles && detalles.length > 0) {
          setFormData(prev => ({
            ...prev,
            receta: detalles.map((d: any) => {
              // Intentar parsear "Dosis - Frecuencia durante Duración"
              // Formato guardado: `${r.dosis} - ${r.frecuencia} durante ${r.duracion}`
              const parts = (d.indicaciones || '').split(' - ');
              const dosis = parts[0] || '';
              const resto = parts[1] || '';
              // resto podría ser "8 horas durante 3 dias"
              const subParts = resto.split(' durante ');
              const frecuencia = subParts[0] || '';
              const duracion = subParts[1] || '';

              return {
                id: d.iddetallereceta?.toString() || Math.random().toString(),
                medicamento: d.medicamento || '',
                dosis: dosis,
                frecuencia: frecuencia,
                duracion: duracion
              };
            })
          }));
        }
      }
    } catch (error) {
      console.error("Error cargando expediente específico:", error);
    } finally {
      setLoadingExpediente(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Gestión de Medicamentos en la Receta
  const addMedicamento = () => {
    setFormData(prev => ({
      ...prev,
      receta: [...prev.receta, { id: Math.random().toString(), medicamento: '', dosis: '', frecuencia: '', duracion: '' }]
    }));
  };

  const updateMedicamento = (id: string, field: keyof RecetaItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      receta: prev.receta.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const removeMedicamento = (id: string) => {
    setFormData(prev => ({
      ...prev,
      receta: prev.receta.filter(item => item.id !== id)
    }));
  };

  const handleSaveExpediente = async () => {
    console.log("Iniciando guardado Estricto (Schema Real)...");
    if (!currentHistoriaId) {
      alert("Error: No hay historia clínica.");
      return;
    }

    setSaving(true);
    try {
      // 1. Obtener ID del Doctor (Usuario actual)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No estás autenticado.");

      if (!currentPatient) {
        alert("Error: No hay paciente seleccionado.");
        return;
      }

      // 2. Resolver ID CITA (Requerido por Schema)
      // Buscamos la última cita de este paciente con este doctor hoy. O creamos una dummy.
      let idCitaToUse = null;

      // Intentar buscar una cita de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: citasHoy } = await supabase.from('cita')
        .select('idcita')
        .eq('idpaciente', currentPatient.id) // Asumiendo currentPatient tiene el ID Auth
        .eq('iddoctor', user.id)
        .eq('fecha', today)
        .limit(1);

      if (citasHoy && citasHoy.length > 0) {
        idCitaToUse = citasHoy[0].idcita;
      } else {
        // CREAR CITA "FANTASMA" para cumplir la constraint (o buscar una cualquiera pendiente)
        // Nota: Esto es un parche porque el schema OBLIGA idcita.
        // Mejor sería buscar la última cita del paciente aunque no sea hoy.
        const { data: ultimaCita } = await supabase.from('cita')
          .select('idcita')
          .eq('idpaciente', currentPatient.id)
          .order('fecha', { ascending: false })
          .limit(1);

        if (ultimaCita && ultimaCita.length > 0) {
          idCitaToUse = ultimaCita[0].idcita;
        } else {
          throw new Error("Este paciente no tiene ninguna cita registrada. El sistema requiere una cita base para crear el expediente.");
        }
      }

      console.log("Usando ID Cita:", idCitaToUse);

      const isUpdate = expedientesList.some(ex => ex.idexpediente?.toString() === formData.id);
      let savedExpedienteId = isUpdate ? parseInt(formData.id) : null;
      let savedTriajeId = null;

      // ---------------------------------------------------------
      // PASO A: TRIAJE (Insertar o Actualizar)
      // ---------------------------------------------------------
      const triajePayload = {
        peso: formData.peso ? parseFloat(formData.peso) : null,
        talla: formData.talla ? parseFloat(formData.talla) : null,
        temperatura: formData.temperatura ? parseFloat(formData.temperatura) : null,
        presionsistolica: formData.presion ? parseFloat(formData.presion.split('/')[0]) : null,
        presiondiastolica: formData.presion ? parseFloat(formData.presion.split('/')[1]) : null,
        saturacionoxigeno: formData.saturacion ? parseFloat(formData.saturacion) : null,
        motivo_consulta: formData.motivoConsulta,
        // Antecedentes y otros campos se pueden agregar si el form los tuviera
      };

      if (isUpdate) {
        // En update complejo, necesitaríamos saber el ID del triaje asociado.
        // Por simplicidad, asumimos que 'expediente' tiene 'idtriaje'.
        // Primero leemos el expediente actual para sacar el idtriaje
        const { data: currentExp } = await supabase.from('expediente').select('idtriaje').eq('idexpediente', savedExpedienteId).single();
        if (currentExp && currentExp.idtriaje) {
          await supabase.from('triaje').update(triajePayload).eq('idtriaje', currentExp.idtriaje);
          savedTriajeId = currentExp.idtriaje;
        }
      } else {
        const { data: newTriaje, error: triajeError } = await supabase
          .from('triaje')
          .insert([triajePayload])
          .select()
          .single();

        if (triajeError) throw triajeError;
        savedTriajeId = newTriaje.idtriaje;
      }

      // ---------------------------------------------------------
      // PASO B: EXPEDIENTE
      // ---------------------------------------------------------
      const expedientePayload = {
        idhistoriamedica: currentHistoriaId,
        iddoctor: user.id,
        idtriaje: savedTriajeId,
        idcita: idCitaToUse, // Constraint Unique! 
        diagnostico: formData.diagnostico,
        tratamiento: formData.tratamiento,
        motivoconsulta: formData.motivoConsulta, // Redundante en schema pero existe
        // fecha default now()
      };

      if (isUpdate) {
        // Ojo: idcita es UNIQUE. Si es update, no tocamos idcita para no chocar.
        delete (expedientePayload as any).idcita;
        delete (expedientePayload as any).idhistoriamedica;

        const { error: expError } = await supabase
          .from('expediente')
          .update(expedientePayload)
          .eq('idexpediente', savedExpedienteId);

        if (expError) throw expError;

      } else {
        // Verificación de unicidad manual
        const { data: existe } = await supabase.from('expediente').select('idexpediente').eq('idcita', idCitaToUse);
        if (existe && existe.length > 0) {
          // Si ya existe expediente para esta cita, hacemos UPDATE en vez de INSERT
          console.log("Expediente ya existe para esta cita, cambiando a modo UPDATE.");
          savedExpedienteId = existe[0].idexpediente;
          const { error: expError } = await supabase
            .from('expediente')
            .update(expedientePayload)
            .eq('idexpediente', savedExpedienteId);
          if (expError) throw expError;
        } else {
          const { data: newExp, error: expError } = await supabase
            .from('expediente')
            .insert([expedientePayload])
            .select()
            .single();

          if (expError) throw expError;
          savedExpedienteId = newExp.idexpediente;
        }
      }

      // ---------------------------------------------------------
      // PASO C: RECETAS (Complex Relación: Expediente -> Receta -> DetalleReceta)
      // ---------------------------------------------------------
      // 1. Buscar o Crear la CABECERA 'Receta' (Una por expediente)
      let idRecetaCabecera = null;
      const { data: recetaExistente } = await supabase.from('receta').select('idreceta').eq('idexpediente', savedExpedienteId).limit(1);

      if (recetaExistente && recetaExistente.length > 0) {
        idRecetaCabecera = recetaExistente[0].idreceta;
        // Limpiamos detalles viejos
        await supabase.from('detallereceta').delete().eq('idreceta', idRecetaCabecera);
      } else {
        const { data: newReceta, error: rError } = await supabase.from('receta').insert([{ idexpediente: savedExpedienteId }]).select().single();
        if (rError) throw rError;
        idRecetaCabecera = newReceta.idreceta;
      }

      // 2. Insertar Detalles
      if (formData.receta.length > 0) {
        const detalles = formData.receta.map(r => ({
          idreceta: idRecetaCabecera,
          medicamento: r.medicamento,
          indicaciones: `${r.dosis} - ${r.frecuencia} durante ${r.duracion}` // Concatenamos porque schema solo tiene 'indicaciones'
        }));
        const { error: detError } = await supabase.from('detallereceta').insert(detalles);
        if (detError) throw detError;
      }

      setNotification({
        show: true,
        type: 'success',
        title: '¡Guardado Exitoso!',
        message: 'El expediente clínico se ha actualizado correctamente en el sistema.'
      });

      // Recargar logica...
      setIsModalOpen(false);
      // (Opcional) Recargar lista expedientes

    } catch (error: any) {
      console.error("FULL SAVE ERROR:", error);
      if (error.code === '42501' || error.message?.includes('permission denied') || error.status === 403) {
        alert("⛔ ERROR DE PERMISOS (RLS)\n\nTu usuario no tiene autorización para escribir en la base de datos.\n\nSOLUCIÓN: Copia y ejecuta el archivo 'solucionar_permisos.sql' en el Editor SQL de Supabase.");
      } else {
        alert("Error crítico: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpediente = () => {
    // Abrir modal de confirmación
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (!formData.id) return;

      const { error: delError } = await supabase.from('expediente').delete().eq('idexpediente', formData.id);
      if (delError) throw delError;

      setIsDeleteConfirmOpen(false);
      setIsModalOpen(false);
      setNotification({
        show: true,
        type: 'success',
        title: 'Eliminado Correctamente',
        message: 'El registro del expediente ha sido eliminado de forma permanente.'
      });

      // Recargar la lista de pacientes o historial si fuera necesario
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      alert("Error al eliminar: " + error.message);
    }
  };

  // Filtrado
  const filteredPacientes = pacientes.filter(p =>
    `${p.nombres} ${p.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Navbar navLinks={navLinksDoctor} principal="/doctor" />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-indigo-600" /> Historia Clínica
              </h1>
              <p className="text-gray-500 text-sm">Gestiona expedientes, diagnósticos y recetas.</p>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar paciente por nombre"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla de Pacientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Edad</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Última Consulta</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Cargando pacientes...</td></tr>
                  ) : filteredPacientes.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No se encontraron pacientes.</td></tr>
                  ) : (
                    filteredPacientes.map((paciente) => (
                      <tr key={paciente.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{paciente.nombres} {paciente.apellidos}</div>
                          <div className="text-xs text-gray-500 capitalize">{paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500">{paciente.edad} años</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {paciente.ultimaConsulta}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {/* Botones de Acción */}
                          <button
                            onClick={() => handleOpenModal(paciente)}
                            className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
                          >
                            <Edit className="w-4 h-4 mr-1.5" /> Atender / Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* --- MODAL DE EXPEDIENTE (FULL SCREEN O GRANDE) --- */}
      {isModalOpen && currentPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  Expediente Clínico
                  <span className="text-sm font-normal text-gray-500 bg-white border px-2 py-0.5 rounded-full ml-2">
                    {currentPatient.nombres} {currentPatient.apellidos}
                  </span>
                </h2>
                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                  <span>{currentPatient.edad} años</span>
                </div>

                {/* Selector de Historial Personalizado */}
                <div className="relative mt-3 z-20">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consulta:</label>

                  {/* Trigger del Dropdown */}
                  <button
                    onClick={() => !loadingExpediente && setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full md:w-80 bg-white border border-gray-300 rounded-lg p-2 flex items-center justify-between shadow-sm hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg text-white flex-shrink-0 ${(!formData.id || !expedientesList.find(e => e.idexpediente?.toString() === formData.id)) ? 'bg-green-500' : 'bg-blue-500'}`}>
                        <CalendarIcon size={20} />
                      </div>
                      <div className="text-left overflow-hidden">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {(() => {
                            const selected = expedientesList.find(e => e.idexpediente?.toString() === formData.id);
                            if (selected) {
                              return `Expediente del ${new Date(selected.fecha_atencion).toLocaleDateString()}`;
                            }
                            return "Nueva Consulta (Actual)";
                          })()}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
                          {(() => {
                            const selected = expedientesList.find(e => e.idexpediente?.toString() === formData.id);
                            const date = selected ? new Date(selected.fecha_atencion) : new Date();
                            return (
                              <>
                                <CalendarIcon size={12} /> {date.toLocaleDateString()}
                                <Clock size={12} className="ml-1" /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform flex-shrink-0 ${isHistoryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Lista Dropdown */}
                  {isHistoryOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto w-full md:w-96 animate-in fade-in zoom-in-95 duration-100">

                      {/* Opción Nueva Consulta */}
                      <div
                        onClick={() => {
                          resetFormData();
                          setIsHistoryOpen(false);
                        }}
                        className={`p-3 flex items-center justify-between cursor-pointer border-b border-gray-100 transition-colors ${(!formData.id || !expedientesList.find(e => e.idexpediente?.toString() === formData.id)) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-green-500 text-white shadow-sm">
                            <CalendarIcon size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">Nueva Consulta (Actual)</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <CalendarIcon size={10} /> {new Date().toLocaleDateString()}
                              <Clock size={10} className="ml-1" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        {(!formData.id || !expedientesList.find(e => e.idexpediente?.toString() === formData.id)) && <div className="bg-blue-600 text-white rounded-full p-0.5"><Check size={14} /></div>}
                      </div>

                      {/* Lista de Expedientes Pasados */}
                      {expedientesList.map((ex) => {
                        const isSelected = ex.idexpediente?.toString() === formData.id;
                        const date = new Date(ex.fecha_atencion);
                        return (
                          <div
                            key={ex.idexpediente}
                            onClick={() => {
                              loadExpediente(ex);
                              setIsHistoryOpen(false);
                            }}
                            className={`p-3 flex items-center justify-between cursor-pointer border-b border-gray-100 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-blue-500 text-white shadow-sm">
                                <CalendarIcon size={18} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">Expediente del {date.toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <CalendarIcon size={10} /> {date.toLocaleDateString()}
                                  <Clock size={10} className="ml-1" /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            {isSelected && <div className="bg-blue-600 text-white rounded-full p-0.5"><Check size={14} /></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {loadingExpediente && <div className="absolute top-12 right-2"><span className="flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span></div>}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg" title="Imprimir Historial">
                  <Printer size={20} />
                </button>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal con Tabs y Contenido Scrollable */}
            <div className="flex flex-1 overflow-hidden">

              {/* Sidebar de Tabs */}
              <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col p-2 space-y-1 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('triaje')}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'triaje' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Thermometer size={18} /> Triaje
                </button>
                <button
                  onClick={() => setActiveTab('diagnostico')}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'diagnostico' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Stethoscope size={18} /> Diagnóstico
                </button>
                <button
                  onClick={() => setActiveTab('receta')}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'receta' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Pill size={18} /> Receta
                </button>
              </div>

              {/* Área de Contenido */}
              <div className="flex-1 overflow-y-auto p-6 bg-white">

                {/* --- TAB: TRIAJE --- */}
                {activeTab === 'triaje' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Signos Vitales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                        <div className="relative">
                          <input type="number" name="peso" value={formData.peso} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-8 py-2 border" placeholder="0.00" />
                          <span className="absolute right-3 top-2 text-gray-400 text-xs">kg</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Talla (cm)</label>
                        <div className="relative">
                          <input type="number" name="talla" value={formData.talla} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-8 py-2 border" placeholder="0" />
                          <span className="absolute right-3 top-2 text-gray-400 text-xs">cm</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
                        <div className="relative">
                          <input type="number" name="temperatura" value={formData.temperatura} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-8 py-2 border" placeholder="36.5" />
                          <Thermometer className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Presión Arterial</label>
                        <input type="text" name="presion" value={formData.presion} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="120/80" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Saturación O2 (%)</label>
                        <div className="relative">
                          <input type="number" name="saturacion" value={formData.saturacion} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-3 pr-8 py-2 border" placeholder="98" />
                          <Activity className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-bold text-blue-800 mb-2">Resumen IMC (Calculado)</h4>
                      <div className="text-3xl font-bold text-blue-600">
                        {formData.peso && formData.talla
                          ? (parseFloat(formData.peso) / Math.pow(parseFloat(formData.talla) / 100, 2)).toFixed(1)
                          : '--.--'}
                      </div>
                    </div>

                    <div className="flex justify-end mt-8">
                      <button onClick={() => setActiveTab('diagnostico')} className="flex items-center text-indigo-600 font-medium hover:underline">
                        Siguiente: Diagnóstico <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* --- TAB: DIAGNÓSTICO --- */}
                {activeTab === 'diagnostico' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta</label>
                      <textarea name="motivoConsulta" rows={2} value={formData.motivoConsulta} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" placeholder="Describa el motivo principal..." />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico Médico</label>
                      <textarea name="diagnostico" rows={3} value={formData.diagnostico} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" placeholder="Diagnóstico principal y secundarios..." />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento / Procedimientos</label>
                      <textarea name="tratamiento" rows={3} value={formData.tratamiento} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border" placeholder="Detalle procedimientos realizados en consultorio..." />
                    </div>

                    <div className="flex justify-end mt-8">
                      <button onClick={() => setActiveTab('receta')} className="flex items-center text-indigo-600 font-medium hover:underline">
                        Siguiente: Receta Médica <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* --- TAB: RECETA --- */}
                {activeTab === 'receta' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Prescripción de Medicamentos</h3>
                      <button onClick={addMedicamento} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-1" /> Agregar Medicamento
                      </button>
                    </div>

                    {formData.receta.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <Pill className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No hay medicamentos agregados.</p>
                        <button onClick={addMedicamento} className="mt-2 text-indigo-600 hover:underline text-sm font-medium">Agregar el primero</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.receta.map((item, index) => (
                          <div key={item.id} className="flex flex-col md:flex-row gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-gray-500">Medicamento</label>
                              <input type="text" value={item.medicamento} onChange={(e) => updateMedicamento(item.id, 'medicamento', e.target.value)} className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2" placeholder="Ej: Paracetamol 500mg" />
                            </div>
                            <div className="w-full md:w-32">
                              <label className="text-xs font-medium text-gray-500">Dosis</label>
                              <input type="text" value={item.dosis} onChange={(e) => updateMedicamento(item.id, 'dosis', e.target.value)} className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2" placeholder="Ej: 1 tableta" />
                            </div>
                            <div className="w-full md:w-32">
                              <label className="text-xs font-medium text-gray-500">Frecuencia</label>
                              <input type="text" value={item.frecuencia} onChange={(e) => updateMedicamento(item.id, 'frecuencia', e.target.value)} className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2" placeholder="Ej: 8 horas" />
                            </div>
                            <div className="w-full md:w-32">
                              <label className="text-xs font-medium text-gray-500">Duración</label>
                              <input type="text" value={item.duracion} onChange={(e) => updateMedicamento(item.id, 'duracion', e.target.value)} className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2" placeholder="Ej: 3 días" />
                            </div>
                            <button
                              onClick={() => removeMedicamento(item.id)}
                              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Quitar medicamento"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleDeleteExpediente}
                className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-2"
              >
                <Trash2 size={16} /> Eliminar Registro
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveExpediente}
                  disabled={saving}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Expediente'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- NOTIFICATION MODAL --- */}
      {notification.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center transform scale-100 animate-in zoom-in-95">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'} mb-4`}>
              {notification.type === 'success' ? (
                <Check className={`h-8 w-8 text-green-600`} />
              ) : (
                <X className={`h-8 w-8 text-red-600`} />
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{notification.title}</h3>
            <p className="text-gray-500 text-sm mb-6">{notification.message}</p>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className={`w-full py-2.5 rounded-xl text-white font-medium shadow-sm transition-all ${notification.type === 'success' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center transform scale-100 animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Expediente?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Esta acción no se puede deshacer. Se borrarán todos los datos y recetas asociados a esta consulta.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 shadow-sm transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}