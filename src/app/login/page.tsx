"use client"

import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const Page = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log("Sesión iniciada correctamente", data);

      // Obtener rol para redirección
      const { data: profile } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', data.user.id)
        .single();

      const userRole = profile?.rol?.toLowerCase();

      if (userRole === 'admin' || userRole === 'administrador') {
        router.push('/admin');
      } else if (userRole === 'doctor' || userRole === 'medico') {
        router.push('/doctor');
      } else {
        router.push('/paciente');
      }

      router.refresh();

    } catch (error: any) {
      console.error("Error al iniciar sesión", error.message);
      if (error.message === "Invalid login credentials") {
        setErrorMsg("Credenciales incorrectas. Verifica tu correo y contraseña.");
      } else if (error.message.includes("Email not confirmed")) {
        setErrorMsg("Tu correo electrónico no ha sido confirmado.");
      } else {
        setErrorMsg(error.message || "Ocurrió un error al iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleConfirmation = async () => {
    if (!email) {
      setErrorMsg("Ingresa tu correo electrónico para reenviar la confirmación.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      setSuccessMsg("Se ha reenviado el correo de confirmación. Revisa tu bandeja de entrada.");

    } catch (error: any) {
      console.error("Error al confirmar", error.message);
      setErrorMsg(error.message || "Error al reenviar confirmación.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // --- ESTA ES LA LÍNEA CORREGIDA ---
    // En móvil (flex-col), el Navbar (header) está arriba y el contenido (login) abajo.
    // En escritorio (md:flex-row), el Navbar (sidebar) está a la izquierda y el contenido a la derecha.
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">


      {/* Contenedor principal centrado */}
      {/* flex-grow toma el espacio restante */}
      {/* items-center y justify-center centran la tarjeta en ESE espacio */}
      <div className="grow flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Bienvenido de nuevo</h2>
            <p className="text-gray-500 text-sm">Ingresa a tu cuenta para continuar</p>
          </div>

          {/* Zona de Errores y Mensajes */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center">
              <span className="mr-2">⚠️</span>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm flex items-center">
              <span className="mr-2">✅</span>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="ejemplo@correo.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Sección de Confirmación (Acción secundaria) */}
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              ¿No recibiste el correo de confirmación?
            </p>
            <button
              type="button"
              onClick={handleConfirmation}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-800 font-medium mt-1 focus:outline-none hover:underline disabled:opacity-50"
            >
              Reenviar confirmación
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Page