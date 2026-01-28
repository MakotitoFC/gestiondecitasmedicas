import Link from "next/link";
import { Bot, Zap, Bell, PlusCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">

      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y Nombre */}
            <div className="flex items-center">
              <PlusCircle className="h-8 w-8 text-indigo-500" />
              <span className="ml-2 text-xl font-bold text-gray-900">Hospital Central</span>
            </div>

            {/* Botón de Login */}
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Iniciar Sesión
            </Link>
          </div>
        </nav>
      </header>

      {/* --- Contenido Principal --- */}
      <main className="flex-1">

        {/* --- Hero Section --- */}
        <section className="bg-white pt-16"> {/* Padding para el header fijo */}
          <div className="relative isolate overflow-hidden">
            {/* Fondo degradado */}
            <svg
              className="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
                  width={200}
                  height={200}
                  x="50%"
                  y={-1}
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M.5 200V.5H200" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" strokeWidth={0} fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)" />
            </svg>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Tu Salud. Nuestra Prioridad.
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Bienvenido a "Hospital Central", donde combinamos la mejor atención médica con tecnología de punta para tu bienestar.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/login"
                  className="rounded-md bg-indigo-500 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg-indigo-500"
                >
                  Accede a tu Portal
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- Sección de Características (Tus KSPs) --- */}
        <section className="py-24 sm:py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Título de la sección */}
            <div className="text-center">
              <h2 className="text-base font-semibold leading-7 text-indigo-500">Innovando para tu Cuidado</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Tu bienestar, simplificado.
              </p>
            </div>

            {/* Grid de 3 Columnas */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12">

              {/* Característica 1: Chatbot */}
              <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Bot className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-gray-900">Asistente Virtual 24/7</h3>
                <p className="mt-2 text-base text-gray-600">
                  ¡Nuevo! Nuestro chatbot inteligente te ayuda a organizar y agendar tus citas en cualquier momento y desde cualquier lugar.
                </p>
              </div>

              {/* Característica 2: Eficiencia */}
              <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Zap className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-gray-900">Atención Eficiente</h3>
                <p className="mt-2 text-base text-gray-600">
                  Valoramos tu tiempo. Nuestro sistema optimizado garantiza la atención más rápida y eficiente, reduciendo tus esperas.
                </p>
              </div>

              {/* Característica 3: Recordatorios */}
              <div className="flex flex-col items-center text-center p-8 bg-white rounded-xl shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Bell className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-gray-900">Recordatorios Inteligentes</h3>
                <p className="mt-2 text-base text-gray-600">
                  Olvídate de las citas perdidas. Nuestro sistema te enviará recordatorios automáticos para que estés siempre al tanto.
                </p>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Hospital Central. Todos los derechos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}