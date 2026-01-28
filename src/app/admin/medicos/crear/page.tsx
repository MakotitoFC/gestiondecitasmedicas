"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/app/components/Navbar'; // Tu Navbar
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from "../../../../../lib/supabaseClient"; // Tu cliente Supabase

// Iconos de Lucide que usaremos
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// --- Tipos y Esquema de Validación ---

interface Especialidad {
  idespecialidad: number;
  especialidad: string;
}

const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

import {
  Users,        // Icono para Pacientes
  Stethoscope,  // Icono para Médicos
  Calendar,     // Icono para Citas
  FileText,     // Icono para Reportes
} from 'lucide-react';

const navLinks = [
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Médicos', href: '/admin/medicos', icon: Stethoscope },
    { name: 'Citas Médicas', href: '/admin/citas', icon: Calendar },
    { name: 'Reportes', href: '/admin/reportes', icon: FileText },
];



// Esquema de validación con Zod
const formSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
  nombres: z.string().min(2, { message: 'Nombres requeridos.' }),
  apellidos: z.string().min(2, { message: 'Apellidos requeridos.' }),
  fechanacimiento: z.string().min(1, 'Fecha requerida (YYYY-MM-DD)'), // z.string().date() es estricto, min(1) es más flexible para input[type=date]
  telefono: z
    .string()
    .length(9, { message: 'El teléfono debe tener 9 dígitos.' }),
  sexo: z.enum(['M', 'F'], { error: 'Sexo requerido.' }),
  idespecialidad: z.string().min(1, { message: 'Especialidad requerida.' }),
  horarios: z.array(
    z.object({
      diaSemana: z.string().min(1, { message: 'Día requerido.' }),
      horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Formato HH:MM requerido.',
      }),
      horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Formato HH:MM requerido.',
      }),
    })
  ).min(1, { message: "Debe añadir al menos un horario." }), // Asegura que al menos un horario esté presente
});

type FormValues = z.infer<typeof formSchema>;

// Componente para mostrar errores de formulario
const FormError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
};

// --- Componente de la Página ---

const PacientesPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [formMessage, setFormMessage] = useState<{
    type: 'error' | 'success' | '';
    content: string;
  }>({ type: '', content: '' });

  // 1. Cargar especialidades al montar
  useEffect(() => {
    const fetchEspecialidades = async () => {
      const { data, error } = await supabase.from('especialidad').select('*');
      if (error) {
        console.error("Error al cargar especialidades", error.message)
        setFormMessage({ type: 'error', content: 'Error al cargar especialidades.' });
      } else {
        //console.log(data)
        setEspecialidades(data);
      }
    };
    fetchEspecialidades();
  }, []);

  // 2. Configuración de React Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      nombres: '',
      apellidos: '',
      fechanacimiento: '',
      telefono: '',
      sexo: undefined,
      idespecialidad: '',
      horarios: [{ diaSemana: 'Lunes', horaInicio: '09:00', horaFin: '17:00' }],
    },
  });

  // 3. Hook para manejar el array dinámico de horarios
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'horarios',
  });

  // 4. Handler para el envío del formulario
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setFormMessage({ type: '', content: '' });

    try {
      // Usamos la ruta API que especificaste
      const response = await fetch('/api/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar al doctor.');
      }

      setFormMessage({ type: 'success', content: data.message || 'Doctor registrado exitosamente.'});
      reset(); // Limpiar el formulario
    } catch (error: any) {
      setFormMessage({ type: 'error', content: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Clase base para inputs y selects (estilo Tailwind puro)
  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Navbar navLinks={navLinks} principal="/admin"/>
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Registrar Nuevo Doctor
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* --- Notificaciones del Formulario --- */}
            {formMessage.content && (
              <div 
                className={`flex items-center gap-3 p-4 rounded-md ${
                  formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {formMessage.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <p>{formMessage.content}</p>
              </div>
            )}

            {/* --- Datos de Cuenta --- */}
            <fieldset>
              <legend className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Datos de Cuenta
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input type="email" id="email" {...register('email')} className={inputClass} />
                  <FormError message={errors.email?.message} />
                </div>
                <div>
                  <label htmlFor="password" className={labelClass}>Contraseña</label>
                  <input type="password" id="password" {...register('password')} className={inputClass} />
                  <FormError message={errors.password?.message} />
                </div>
              </div>
            </fieldset>

            {/* --- Datos Personales --- */}
            <fieldset>
              <legend className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Datos Personales
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombres" className={labelClass}>Nombres</label>
                  <input type="text" id="nombres" {...register('nombres')} className={inputClass} />
                  <FormError message={errors.nombres?.message} />
                </div>
                <div>
                  <label htmlFor="apellidos" className={labelClass}>Apellidos</label>
                  <input type="text" id="apellidos" {...register('apellidos')} className={inputClass} />
                  <FormError message={errors.apellidos?.message} />
                </div>
                <div>
                  <label htmlFor="telefono" className={labelClass}>Teléfono (9 dígitos)</label>
                  <input type="tel" id="telefono" {...register('telefono')} className={inputClass} />
                  <FormError message={errors.telefono?.message} />
                </div>
                <div>
                  <label htmlFor="fechanacimiento" className={labelClass}>Fecha de Nacimiento</label>
                  <input type="date" id="fechanacimiento" {...register('fechanacimiento')} className={inputClass} />
                  <FormError message={errors.fechanacimiento?.message} />
                </div>
                <div>
                  <label htmlFor="sexo" className={labelClass}>Sexo</label>
                  <select id="sexo" {...register('sexo')} className={inputClass}>
                    <option value="" disabled>Seleccione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                  <FormError message={errors.sexo?.message} />
                </div>
              </div>
            </fieldset>

            {/* --- Datos Médicos --- */}
            <fieldset>
              <legend className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Datos Médicos
              </legend>
              <div>
                <label htmlFor="idespecialidad" className={labelClass}>Especialidad</label>
                <select id="idespecialidad" {...register('idespecialidad')} className={inputClass}>
                  <option value="" disabled>Seleccione una especialidad...</option>
                  {especialidades.map((esp,index) => (
                    <option key={index} value={esp.idespecialidad}>
                      {esp.especialidad}
                    </option>
                  ))}
                </select>
                <FormError message={errors.idespecialidad?.message} />
              </div>
            </fieldset>

            {/* --- Horarios Dinámicos --- */}
            <fieldset>
              <legend className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Horarios
              </legend>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 items-end gap-4 p-4 border rounded-md">
                    <div className="md:col-span-1">
                      <label htmlFor={`horarios.${index}.diaSemana`} className={labelClass}>Día</label>
                      <select {...register(`horarios.${index}.diaSemana`)} className={inputClass}>
                        {DIAS_SEMANA.map((dia) => (
                          <option key={dia} value={dia}>{dia}</option>
                        ))}
                      </select>
                      <FormError message={errors.horarios?.[index]?.diaSemana?.message} />
                    </div>
                    <div>
                      <label htmlFor={`horarios.${index}.horaInicio`} className={labelClass}>Hora Inicio</label>
                      <input type="time" {...register(`horarios.${index}.horaInicio`)} className={inputClass} />
                      <FormError message={errors.horarios?.[index]?.horaInicio?.message} />
                    </div>
                    <div>
                      <label htmlFor={`horarios.${index}.horaFin`} className={labelClass}>Hora Fin</label>
                      <input type="time" {...register(`horarios.${index}.horaFin`)} className={inputClass} />
                      <FormError message={errors.horarios?.[index]?.horaFin?.message} />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex justify-center items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <FormError message={errors.horarios?.root?.message} />
                
                <button
                  type="button"
                  onClick={() => append({ diaSemana: 'Lunes', horaInicio: '09:00', horaFin: '17:00' })}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Horario
                </button>
              </div>
            </fieldset>

            {/* --- Botón de Envío --- */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-indigo-500 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Doctor'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PacientesPage;