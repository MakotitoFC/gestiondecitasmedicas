"use client";
import React, { useState, useEffect, FormEvent } from 'react';
import Navbar from '@/app/components/Navbar';
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";

import {
  Users,
  Stethoscope,
  Calendar,
  FileText,
  UserPlus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  BriefcaseMedical
} from 'lucide-react';

// --- Tipos (Ayuda para TypeScript, opcional pero recomendado) ---
type Especialidad = {
  idEspecialidad: number;
  especialidad: string;
};

type Usuario = {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: 'paciente' | 'admin' | 'recepcion' | 'doctor';
  is_active: boolean;
  telefono: string | null;
  fechaNacimiento: string | null;
  sexo: string | null;
  banned_until: string | null;
  idespecialidad: number | null;
  especialidad: string | null;
};

// Tipos para el Navbar
type NavLink = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className: string }>; // Icono de Lucide
};

// --- Constantes ---
const navLinks: NavLink[] = [
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { name: 'Médicos', href: '/admin/medicos', icon: Stethoscope },
  { name: 'Citas Médicas', href: '/admin/citas', icon: Calendar },
  { name: 'Reportes', href: '/admin/reportes', icon: FileText },
];

// Roles que este formulario puede crear/editar
const ROLES_DISPONIBLES: Array<'paciente' | 'admin' | 'recepcion'> = ['paciente', 'admin', 'recepcion'];
const SEXO_OPCIONES = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
];

type ModalState = {
  type: 'create' | 'edit' | 'delete' | 'reactivate';
  user: Usuario | null;
} | null;

// Tipo para la respuesta de Supabase (simplificado)
type SupabaseResponse<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type SupabaseRpcResponse = {
  data: any | null;
  error: { message: string } | null;
};


// --- Componente Principal ---
const UsuariosPage = () => {
  const { role } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (role === 'admin') {
      fetchData();
    }
  }, [role]);

  // --- Funciones de Datos ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Usamos la VISTA que creamos en el SQL
      const usuariosPromise = supabase
        .from('vista_usuarios_admin')
        .select('*')
        .order('apellidos', { ascending: true });

      // Cargamos las especialidades para el dropdown de edición
      const especialidadesPromise = supabase
        .from('especialidad')
        .select('*')
        .order('especialidad', { ascending: true });

      // Tipamos explícitamente la respuesta de Promise.all
      const [usuariosRes, especialidadesRes] = await Promise.all([
        usuariosPromise as unknown as Promise<SupabaseResponse<Usuario>>,
        especialidadesPromise as unknown as Promise<SupabaseResponse<Especialidad>>
      ]);

      if (usuariosRes.error) throw usuariosRes.error;
      if (especialidadesRes.error) throw especialidadesRes.error;

      setUsuarios(usuariosRes.data || []);
      setEspecialidades(especialidadesRes.data || []);

    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      if (err instanceof Error) {
        setError('Error al cargar datos: ' + err.message);
      } else {
        setError('Un error desconocido ocurrió al cargar datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Manejadores de Acciones ---

  const handleCrearUsuario = async (formData: Record<string, any>) => {
    const { data, error } = await supabase.rpc('admin_crear_usuario', {
      p_email: formData.email,
      p_password: formData.password,
      p_nombres: formData.nombres,
      p_apellidos: formData.apellidos,
      p_rol: formData.rol,
      p_telefono: formData.telefono || null,
      p_fecha_nacimiento: formData.fechaNacimiento || null,
      p_sexo: formData.sexo || null
    }) as SupabaseRpcResponse;
    if (error) throw error;
    return data;
  };

  const handleActualizarUsuario = async (userId: string, formData: Record<string, any>) => {
    const { data, error } = await supabase.rpc('admin_actualizar_usuario', {
      p_user_id: userId,
      p_nombres: formData.nombres,
      p_apellidos: formData.apellidos,
      p_telefono: formData.telefono || null,
      p_fecha_nacimiento: formData.fechaNacimiento || null,
      p_sexo: formData.sexo || null,
      p_rol: formData.rol,
      p_email: formData.email,
      p_password: formData.password || null, // Enviar null si está vacío
      p_idespecialidad: formData.idespecialidad ? Number(formData.idespecialidad) : null
    }) as SupabaseRpcResponse;
    if (error) throw error;
    return data;
  };

  const handleDesactivar = async (userId: string) => {
    const { error } = await supabase.rpc('admin_desactivar_usuario', {
      p_user_id: userId
    }) as SupabaseRpcResponse;
    if (error) throw error;
  };

  const handleReactivar = async (userId: string) => {
    const { error } = await supabase.rpc('admin_reactivar_usuario', {
      p_user_id: userId
    }) as SupabaseRpcResponse;
    if (error) throw error;
  };

  // Protección de ruta simple
  if (role && role !== 'admin') {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        <Navbar navLinks={navLinks} principal="/admin" />
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="text-gray-700">Solo los administradores pueden acceder a esta página.</p>
        </main>
      </div>
    );
  }

  // --- Renderizado ---
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Navbar navLinks={navLinks} principal="/admin" />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">

          {/* --- Cabecera --- */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Gestión de Usuarios
            </h1>
            <button
              onClick={() => setModal({ type: 'create', user: null })}
              className="inline-flex items-center gap-2 rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <UserPlus className="w-5 h-5" />
              Crear Usuario
            </button>
          </div>

          {/* --- Contenedor Principal (Tabla) --- */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-md bg-red-100 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && (
              <UserTable
                usuarios={usuarios}
                onEdit={(user) => setModal({ type: 'edit', user })}
                onDelete={(user) => setModal({ type: 'delete', user })}
                onReactivate={(user) => setModal({ type: 'reactivate', user })}
              />
            )}
          </div>

        </div>
      </main>

      {/* --- Modales --- */}
      {modal?.type === 'create' && (
        <UserFormModal
          mode="create"
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            fetchData(); // Recargar toda la data
          }}
          onCrearUsuario={handleCrearUsuario}
        />
      )}

      {modal?.type === 'edit' && modal.user && (
        <UserFormModal
          mode="edit"
          existingUser={modal.user}
          especialidades={especialidades}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            fetchData(); // Recargar toda la data
          }}
          onActualizarUsuario={handleActualizarUsuario}
        />
      )}

      {modal?.type === 'delete' && modal.user && (
        <ConfirmActionModal
          user={modal.user}
          action="desactivar"
          title="Desactivar Usuario"
          message={`¿Estás seguro de que quieres desactivar a ${modal.user.nombres} ${modal.user.apellidos}? El usuario no podrá iniciar sesión.`}
          Icon={Trash2}
          color="red"
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            fetchData();
          }}
          onAction={handleDesactivar}
        />
      )}

      {modal?.type === 'reactivate' && modal.user && (
        <ConfirmActionModal
          user={modal.user}
          action="reactivar"
          title="Reactivar Usuario"
          message={`¿Estás seguro de que quieres reactivar a ${modal.user.nombres} ${modal.user.apellidos}? El usuario podrá volver a iniciar sesión.`}
          Icon={RefreshCw}
          color="green"
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            fetchData();
          }}
          onAction={handleReactivar}
        />
      )}

    </div>
  );
};

// --- Sub-Componente: Tabla de Usuarios ---
interface UserTableProps {
  usuarios: Usuario[];
  onEdit: (user: Usuario) => void;
  onDelete: (user: Usuario) => void;
  onReactivate: (user: Usuario) => void;
}

const UserTable = ({ usuarios, onEdit, onDelete, onReactivate }: UserTableProps) => {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                No se encontraron usuarios.
              </td>
            </tr>
          ) : (
            usuarios.map((user: Usuario) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.nombres} {user.apellidos}</div>
                  <div className="text-sm text-gray-500">{user.telefono || 'Sin teléfono'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700 capitalize">{user.rol}</div>
                  {user.rol === 'doctor' && (
                    <div className="text-sm text-gray-500">{user.especialidad || 'Sin especialidad'}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="w-3.5 h-3.5" />
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Editar Usuario"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  {user.is_active ? (
                    <button
                      onClick={() => onDelete(user)}
                      className="text-red-600 hover:text-red-900"
                      title="Desactivar Usuario"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onReactivate(user)}
                      className="text-green-600 hover:text-green-900"
                      title="Reactivar Usuario"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// --- Sub-Componente: Modal Formulario de Usuario (Unificado) ---
interface UserFormModalProps {
  mode: 'create' | 'edit';
  onClose: () => void;
  onSuccess: () => void;
  existingUser?: Usuario | null;
  especialidades?: Especialidad[];
  onCrearUsuario?: (formData: Record<string, any>) => Promise<any>;
  onActualizarUsuario?: (userId: string, formData: Record<string, any>) => Promise<any>;
}

const UserFormModal = ({
  mode,
  onClose,
  onSuccess,
  existingUser = null,
  especialidades = [],
  onCrearUsuario,
  onActualizarUsuario
}: UserFormModalProps) => {

  const isEditMode = mode === 'edit';

  const [formData, setFormData] = useState({
    nombres: existingUser?.nombres || '',
    apellidos: existingUser?.apellidos || '',
    email: existingUser?.email || '',
    password: '', // Siempre vacío por seguridad
    rol: existingUser?.rol || 'paciente',
    telefono: existingUser?.telefono || '',
    fechaNacimiento: existingUser?.fechaNacimiento || '',
    sexo: existingUser?.sexo || 'M',
    idespecialidad: existingUser?.idespecialidad || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        // --- Modo Edición ---
        if (!existingUser || !onActualizarUsuario) throw new Error("No hay usuario o función para editar.");
        await onActualizarUsuario(existingUser.id, formData);
      } else {
        // --- Modo Creación ---
        if (!onCrearUsuario) throw new Error("No hay función para crear.");
        await onCrearUsuario(formData);
      }
      onSuccess();

    } catch (err: unknown) {
      console.error(err);
      let errorMessage = `Error al ${isEditMode ? 'actualizar' : 'crear'} el usuario. Revise los datos.`;
      if (err instanceof Error) {
        if (err.message.includes('permission denied')) {
          errorMessage = "Error de permisos.";
        } else if (err.message.includes('Email ya existe')) {
          errorMessage = "El email proporcionado ya está en uso.";
        } else if (err.message.includes("password")) {
          errorMessage = "La contraseña debe tener al menos 6 caracteres.";
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clases de Tailwind para inputs (para reutilizar)
  const labelClass = "block text-sm font-medium text-gray-700";
  const inputClass = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";
  const inputDisabledClass = "mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {isEditMode
                ? `Editando el perfil de ${existingUser?.nombres} ${existingUser?.apellidos}.`
                : 'El usuario se creará y activará inmediatamente.'
              }
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombres */}
              <div>
                <label htmlFor="nombres" className={labelClass}>Nombres</label>
                <input type="text" name="nombres" id="nombres" value={formData.nombres} onChange={handleChange} className={inputClass} required />
              </div>
              {/* Apellidos */}
              <div>
                <label htmlFor="apellidos" className={labelClass}>Apellidos</label>
                <input type="text" name="apellidos" id="apellidos" value={formData.apellidos} onChange={handleChange} className={inputClass} required />
              </div>

              {/* --- Sección de Autenticación --- */}
              <h4 className="md:col-span-2 text-sm font-semibold text-indigo-700 border-b border-indigo-200 pb-1 mt-2">
                Datos de Acceso
              </h4>
              {/* Email */}
              <div className="md:col-span-2">
                <label htmlFor="email" className={labelClass}>Email</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className={inputClass} required />
              </div>
              {/* Password */}
              <div className="md:col-span-2 relative">
                <label htmlFor="password" className={labelClass}>
                  Contraseña {isEditMode ? '(Dejar en blanco para no cambiar)' : ''}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={inputClass}
                  required={!isEditMode} // Requerido solo en creación
                  minLength={isEditMode && formData.password.length > 0 ? 6 : (isEditMode ? 0 : 6)} // Corregido: .length
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* --- Sección de Perfil --- */}
              <h4 className="md:col-span-2 text-sm font-semibold text-indigo-700 border-b border-indigo-200 pb-1 mt-2">
                Datos de Perfil
              </h4>
              {/* Rol */}
              <div>
                <label htmlFor="rol" className={labelClass}>Rol</label>
                <select
                  name="rol"
                  id="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className={existingUser?.rol === 'doctor' ? inputDisabledClass : inputClass}
                  required
                  disabled={existingUser?.rol === 'doctor'} // No permitir cambiar el rol de un doctor
                >
                  {/* Si es doctor, solo mostrar 'doctor'. Si no, mostrar los roles disponibles */}
                  {existingUser?.rol === 'doctor' ? (
                    <option value="doctor">Doctor</option>
                  ) : (
                    ROLES_DISPONIBLES.map(r => (
                      <option key={r} value={r} className="capitalize">{r}</option>
                    ))
                  )}
                </select>
              </div>
              {/* Teléfono */}
              <div>
                <label htmlFor="telefono" className={labelClass}>Teléfono (9 dígitos)</label>
                <input type="tel" name="telefono" id="telefono" value={formData.telefono || ''} onChange={handleChange} className={inputClass} pattern="[0-9]{9}" title="Debe contener 9 dígitos numéricos" />
              </div>
              {/* Fecha Nacimiento */}
              <div>
                <label htmlFor="fechaNacimiento" className={labelClass}>Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" id="fechaNacimiento" value={formData.fechaNacimiento || ''} onChange={handleChange} className={inputClass} />
              </div>
              {/* Sexo */}
              <div>
                <label htmlFor="sexo" className={labelClass}>Sexo</label>
                <select name="sexo" id="sexo" value={formData.sexo || 'M'} onChange={handleChange} className={inputClass}>
                  {SEXO_OPCIONES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* --- Sección de Doctor (Condicional) --- */}
              {isEditMode && formData.rol === 'doctor' && (
                <>
                  <h4 className="md:col-span-2 text-sm font-semibold text-indigo-700 border-b border-indigo-200 pb-1 mt-2">
                    <BriefcaseMedical className="w-4 h-4 inline-block mr-1" />
                    Datos del Doctor
                  </h4>
                  <div className="md:col-span-2">
                    <label htmlFor="idespecialidad" className={labelClass}>Especialidad</label>
                    <select
                      name="idespecialidad"
                      id="idespecialidad"
                      value={formData.idespecialidad || ''}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">-- Seleccione una especialidad --</option>
                      {especialidades.map((e: Especialidad) => (
                        <option key={e.idEspecialidad} value={e.idEspecialidad}>
                          {e.especialidad}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 text-sm text-gray-600">
                    La gestión de horarios se realiza desde el panel de "Médicos".
                  </div>
                </>
              )}

            </div>

            {error && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-md bg-red-100 text-red-700">
                <AlertCircle className="h-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Footer del Modal */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditMode ? 'Guardar Cambios' : 'Crear Usuario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Sub-Componente: Modal de Confirmación Genérico (Desactivar/Reactivar) ---
interface ConfirmActionModalProps {
  user: Usuario;
  action: string;
  title: string;
  message: string;
  Icon: React.ComponentType<{ className: string }>;
  color: 'red' | 'green';
  onClose: () => void;
  onSuccess: () => void;
  onAction: (userId: string) => Promise<any>;
}

const ConfirmActionModal = ({ user, action, title, message, Icon, color, onClose, onSuccess, onAction }: ConfirmActionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onAction(user.id);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || `Error al ${action} el usuario.`);
      } else {
        setError(`Error desconocido al ${action} el usuario.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Clases dinámicas de Tailwind
  const colorClasses = {
    red: {
      bg: 'bg-red-600',
      hover: 'hover:bg-red-700',
      disabled: 'disabled:bg-red-300',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
    },
    green: {
      bg: 'bg-green-600',
      hover: 'hover:bg-green-700',
      disabled: 'disabled:bg-green-300',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
    }
  };
  const theme = colorClasses[color] || colorClasses.red;

  const buttonClass = `inline-flex w-full justify-center rounded-md border border-transparent ${theme.bg} px-4 py-2 text-base font-medium text-white shadow-sm ${theme.hover} ${theme.disabled} sm:ml-3 sm:w-auto sm:text-sm`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${theme.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
              <Icon className={`h-6 w-6 ${theme.iconText}`} aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{message}</p>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-md bg-red-100 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Confirmar ${action}`}
          </button>
          <button
            type="button"
            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};


export default UsuariosPage;