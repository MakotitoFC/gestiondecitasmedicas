"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
// --- CORRECCIÓN: Ruta relativa subiendo 4 niveles hasta la raíz ---
import { supabase } from "../../../../lib/supabaseClient";
import { Plus, Search, Trash2, Loader2, AlertCircle, CheckCircle, Edit } from 'lucide-react';
// --- CORRECCIÓN: Ruta relativa subiendo 3 niveles hasta app/ ---
import Navbar from '../../components/Navbar';
// --- CORRECCIÓN: Ruta relativa subiendo 4 niveles hasta la raíz ---
import { useAuth } from '../../../context/AuthContext';

import {
  Users,        // Icono para Pacientes
  Stethoscope,  // Icono para Médicos
  Calendar,     // Icono para Citas
  FileText,     // Icono para Reportes
} from 'lucide-react';


// Interfaz para el tipo de dato que recibimos de la VISTA
interface DoctorView {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  especialidad: string;
}

const navLinks = [
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { name: 'Médicos', href: '/admin/medicos', icon: Stethoscope },
  { name: 'Citas Médicas', href: '/admin/citas', icon: Calendar },
  { name: 'Reportes', href: '/admin/reportes', icon: FileText },
];

export default function GestionMedicosPage() {
  const { role } = useAuth(); // Asumiendo que usas AuthContext para seguridad
  const [doctores, setDoctores] = useState<DoctorView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; content: string } | null>(null);

  // Cargar doctores (desde la VISTA o la FUNCIÓN)
  const fetchDoctores = useCallback(async () => {
    setLoading(true);
    let error;
    let data;

    if (searchTerm.trim() === '') {
      // Si no hay búsqueda, trae todos desde la VISTA
      ({ data, error } = await supabase
        .from('doctores_con_especialidad')
        .select('*'));
    } else {
      // Si hay búsqueda, llama a la FUNCIÓN
      ({ data, error } = await supabase.rpc('buscar_doctores_con_especialidad', {
        p_search_term: searchTerm,
      }));
    }

    if (error) {
      console.error('Error al cargar doctores:', error.message);
      setMessage({ type: 'error', content: 'No se pudieron cargar los doctores.' });
    } else {
      setDoctores(data || []);
    }
    setLoading(false);
  }, [searchTerm]);

  // Carga inicial y al buscar
  useEffect(() => {
    // Un debounce simple para no llamar a la API en cada tecla
    const timer = setTimeout(() => {
      fetchDoctores();
    }, 300); // Espera 300ms después de dejar de escribir

    return () => clearTimeout(timer);
  }, [fetchDoctores]);

  // Handler para el borrado lógico
  const handleDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres desactivar al Dr. ${nombre}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al desactivar');
      }

      setMessage({ type: 'success', content: data.message });
      // Refrescar la lista para que el doctor desaparezca
      fetchDoctores();

    } catch (error: any) {
      setMessage({ type: 'error', content: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Protección simple de ruta (deberías tener un layout de servidor)
  if (role && role !== 'admin') {
    return <div className="p-8">Acceso denegado.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <Navbar navLinks={navLinks} principal="/admin" />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Gestión de Médicos
            </h1>
            <Link
              href="/admin/medicos/crear"
              className="inline-flex items-center gap-2 justify-center rounded-md border border-transparent bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-600 w-full md:w-auto"
            >
              <Plus className="w-5 h-5" />
              Registrar Nuevo Doctor
            </Link>
          </div>

          {/* --- Mensajes de Feedback --- */}
          {message && (
            <div
              className={`flex items-center gap-3 p-4 rounded-md mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
            >
              {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <p>{message.content}</p>
            </div>
          )}

          {/* --- Barra de Búsqueda --- */}
          <div className="mb-4">
            <label htmlFor="search" className="sr-only">Buscar Doctor</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pt-2 pb-2"
                placeholder="Buscar por nombre, apellido o email..."
              />
            </div>
          </div>

          {/* --- Tabla de Doctores --- */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            {loading && !doctores.length ? (
              <div className="p-8 text-center flex justify-center items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Cargando doctores...
              </div>
            ) : !doctores.length ? (
              <div className="p-8 text-center text-gray-500">
                No se encontraron doctores{searchTerm && ` con el término "${searchTerm}"`}.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctores.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{doc.nombres} {doc.apellidos}</div>
                        <div className="text-sm text-gray-500">{doc.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{doc.especialidad}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{doc.telefono}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {/* <button className="text-indigo-600 hover:text-indigo-900" title="Editar">
                          <Edit className="w-5 h-5" />
                        </button> */}
                        <button
                          onClick={() => handleDelete(doc.id, `${doc.nombres} ${doc.apellidos}`)}
                          className="text-red-600 hover:text-red-900"
                          title="Desactivar"
                          disabled={loading}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}