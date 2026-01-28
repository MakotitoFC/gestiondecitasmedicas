"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
// CAMBIO 1: Importar la función autoTable por defecto
import autoTable from 'jspdf-autotable';
import {
  LayoutDashboard, Calendar, FileText, Download, Users,
  CheckCircle2, TrendingUp, Activity, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const navLinksDoctor = [
  { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
  { name: 'Agenda', href: '/doctor/agenda', icon: Calendar },
  { name: 'Historia Clínica', href: '/doctor/historia', icon: FileText },
];

export default function DoctorDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== 'doctor' && role !== 'medico')) {
      router.push('/login');
    }
  }, [user, role, authLoading, router]);

  // Estados de Datos
  const [kpiData, setKpiData] = useState({ totalPacientes: 0, citasHoy: 0, tasaAsistencia: 0, productividad: 0 });
  const [chartPacientes, setChartPacientes] = useState<any[]>([]);
  const [chartAsistencia, setChartAsistencia] = useState<any[]>([]);
  const [chartProductividad, setChartProductividad] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. KPI: Totales Generales
        const { count: totalPacientes } = await supabase
          .from('cita')
          .select('idpaciente', { count: 'exact', head: true })
          .eq('iddoctor', user.id);

        const hoy = new Date().toISOString().split('T')[0];
        const { count: citasHoy } = await supabase
          .from('cita')
          .select('*', { count: 'exact', head: true })
          .eq('iddoctor', user.id)
          .eq('fecha', hoy);

        // 2. Gráfico Pacientes Mensual (Desde Vista)
        const { data: dataMes } = await supabase
          .from('vista_doctor_pacientes_mes')
          .select('mes, cantidad')
          .eq('iddoctor', user.id);

        setChartPacientes(dataMes?.map(d => ({ mes: d.mes, pacientes: d.cantidad })) || []);

        // 3. Gráfico Asistencia (Desde Vista)
        const { data: dataAsist } = await supabase
          .from('vista_doctor_asistencia')
          .select('estado, cantidad')
          .eq('iddoctor', user.id);

        const asistenciaMap = dataAsist || [];
        const totalCitas = asistenciaMap.reduce((acc, curr) => acc + curr.cantidad, 0);
        const asistieron = asistenciaMap.find(d => d.estado === 'Asistió')?.cantidad || 0;

        const tasa = totalCitas > 0 ? Math.round((asistieron / totalCitas) * 100) : 0;

        setChartAsistencia([
          { name: 'Asistieron', value: asistieron, color: '#16a34a' },
          { name: 'Faltaron', value: asistenciaMap.find(d => d.estado === 'Falta')?.cantidad || 0, color: '#dc2626' },
          { name: 'Pendientes', value: asistenciaMap.find(d => d.estado === 'Pendiente')?.cantidad || 0, color: '#94a3b8' },
        ]);

        // 4. Gráfico Productividad (Desde Vista)
        const { data: dataProd } = await supabase
          .from('vista_doctor_productividad')
          .select('dia_semana, programadas, completadas')
          .eq('iddoctor', user.id);

        setChartProductividad(dataProd?.map(d => ({ dia: d.dia_semana, programadas: d.programadas, completadas: d.completadas })) || []);

        setKpiData({
          totalPacientes: totalPacientes || 0,
          citasHoy: citasHoy || 0,
          tasaAsistencia: tasa,
          productividad: 95
        });

      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // --- GENERAR REPORTE PDF (CORREGIDO) ---
  const handleDownloadReport = () => {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.text("Reporte de Rendimiento Médico", 14, 22);
    doc.setFontSize(12);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 30);

    // CAMBIO 2: Usar la función autoTable(doc, opciones) en lugar de doc.autoTable()
    autoTable(doc, {
      startY: 40,
      head: [['Métrica', 'Valor']],
      body: [
        ['Pacientes Totales Atendidos', kpiData.totalPacientes],
        ['Citas Programadas Hoy', kpiData.citasHoy],
        ['Tasa de Asistencia Global', `${kpiData.tasaAsistencia}%`],
      ],
    });

    // Sección Detalle Mensual
    // CAMBIO 3: Recuperar la posición Y final de manera segura
    const finalY = (doc as any).lastAutoTable?.finalY || 60;
    doc.text("Pacientes por Mes", 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Mes', 'Cantidad Pacientes']],
      body: chartPacientes.map(c => [c.mes, c.pacientes]),
    });

    doc.save("reporte_medico.pdf");
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-indigo-600 w-12 h-12" /></div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Navbar navLinks={navLinksDoctor} principal="/doctor" />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* --- ENCABEZADO --- */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Dashboard Médico</h1>
              <p className="text-slate-500 mt-1">Estadísticas en tiempo real de tu consultorio.</p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all active:scale-95"
            >
              <Download size={18} />
              Descargar Reporte PDF
            </button>
          </div>

          {/* --- KPI CARDS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CardStat title="Pacientes Totales" value={kpiData.totalPacientes} subtitle="Histórico" icon={Users} color="blue" />
            <CardStat title="Citas Hoy" value={kpiData.citasHoy} subtitle="Programadas para hoy" icon={Calendar} color="indigo" />
            <CardStat title="Tasa Asistencia" value={`${kpiData.tasaAsistencia}%`} subtitle="Citas completadas" icon={CheckCircle2} color="green" />
            <CardStat title="Productividad" value={`${kpiData.productividad}%`} subtitle="Eficiencia operativa" icon={Activity} color="orange" />
          </div>

          {/* --- GRÁFICOS --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* 1. Evolución Pacientes */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  Evolución Mensual
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartPacientes}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="pacientes" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Asistencia Pie */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users size={20} className="text-green-600" />
                  Asistencias vs Faltas
                </h3>
              </div>
              <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartAsistencia} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {chartAsistencia.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Productividad Semanal */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Activity size={20} className="text-orange-500" />
                  Productividad Semanal (Citas)
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartProductividad}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="programadas" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} name="Programadas" />
                    <Line type="monotone" dataKey="completadas" stroke="#f97316" strokeWidth={2} activeDot={{ r: 8 }} name="Completadas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// --- KPI CARD ---
const CardStat = ({ title, value, subtitle, icon: Icon, color }: any) => {
  const colorClasses: any = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
      </div>
      <div className={`p-3 rounded-lg ${colorClasses[color] || "bg-gray-100 text-gray-600"}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};