"use client";
import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../../../lib/supabaseClient';
import {
  Users, Stethoscope, Calendar, FileText,
  PieChart as PieIcon, BarChart3, LayoutDashboard, Download, Loader2,
  DollarSign, Filter, Search
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- CONFIGURACIÓN ---
const navLinks = [
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { name: 'Médicos', href: '/admin/medicos', icon: Stethoscope },
  {
    name: 'Citas Médicas', href: '/admin/citas', icon: Calendar,
    subItems: [
      { name: 'Agenda', href: '/admin/citas' },
      { name: 'Historia Médica', href: '/admin/citas/historia' },
      { name: 'Control de Pagos', href: '/admin/citas/control' }
    ]
  },
  { name: 'Reportes', href: '/admin/reportes', icon: FileText },
];

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export default function ReportesPage() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  // Filtros de Fecha (Por defecto el mes actual)
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fechas, setFechas] = useState({ inicio: firstDay, fin: lastDay });

  // Métricas Calculadas (KPIs)
  const [kpi, setKpi] = useState({
    totalCitas: 0,
    ingresosTotales: 0,
    asistenciaPorc: 0,
    canceladas: 0
  });

  // Datos para Gráficos
  const [chartAtenciones, setChartAtenciones] = useState<any[]>([]);
  const [chartEstados, setChartEstados] = useState<any[]>([]);

  // --- CARGAR DATOS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('obtener_data_reporte', {
        fecha_inicio: fechas.inicio,
        fecha_fin: fechas.fin
      });

      if (error) throw error;

      if (data) {
        setReportData(data);
        procesarDatos(data);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error cargando reporte: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- PROCESAR DATOS (Cálculos en el cliente) ---
  const procesarDatos = (data: any[]) => {
    const total = data.length;
    const ingresos = data.reduce((acc, curr) => acc + (curr.monto || 0), 0);
    const asistieron = data.filter(d => d.estado_asistencia === 'Asistió').length;
    const canceladas = data.filter(d => d.estado_asistencia === 'No Asistió' || d.estado_asistencia === 'Cancelado').length;

    setKpi({
      totalCitas: total,
      ingresosTotales: ingresos,
      asistenciaPorc: total > 0 ? Math.round((asistieron / total) * 100) : 0,
      canceladas: canceladas
    });

    const especialidades: any = {};
    data.forEach(d => { especialidades[d.especialidad] = (especialidades[d.especialidad] || 0) + 1; });
    setChartAtenciones(Object.keys(especialidades).map(key => ({ name: key, value: especialidades[key] })));

    const estados: any = {};
    data.forEach(d => { const estado = d.estado_asistencia || 'Pendiente'; estados[estado] = (estados[estado] || 0) + 1; });
    setChartEstados(Object.keys(estados).map(key => ({ name: key, value: estados[key] })));
  };

  useEffect(() => { fetchData(); }, []);

  // ==========================================
  // --- DISEÑO PREMIUM DE PDF (BASADO EN IMAGEN) ---
  // ==========================================
  const generarPDF = () => {
    const doc = new jsPDF();
    const marginX = 20;
    let currentY = 25;

    const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo/Violet
    const darkColor: [number, number, number] = [30, 41, 59]; // Slate 800
    const secondaryColor: [number, number, number] = [100, 116, 139]; // Slate 500
    const greenColor: [number, number, number] = [16, 185, 129];
    const orangeColor: [number, number, number] = [245, 158, 11];
    const redColor: [number, number, number] = [239, 68, 68];

    // --- 1. ENCABEZADO ---
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(24); doc.setFont("helvetica", "bold");
    doc.text("CLÍNICA SALUD INTEGRAL", marginX, currentY);

    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("REPORTE #2025-001", 190, currentY, { align: 'right' });

    currentY += 8;
    doc.setFontSize(10);
    doc.text("Av. Principal #123, Ciudad de Lima", marginX, currentY);
    currentY += 5;
    doc.text("Tel: (01) 555-5555 | contacto@clinica.com", marginX, currentY);

    currentY += 8;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1.5);
    doc.line(marginX, currentY, 190, currentY);

    // --- TÍTULO CENTRAL ---
    currentY += 15;
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("REPORTE OPERATIVO Y FINANCIERO", 105, currentY, { align: 'center' });

    currentY += 8;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`Período: ${new Date(fechas.inicio).toLocaleDateString()} al ${new Date(fechas.fin).toLocaleDateString()}`, 105, currentY, { align: 'center' });
    currentY += 5;
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, currentY, { align: 'center' });

    // --- 2. RESUMEN EJECUTIVO ---
    currentY += 15;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, currentY - 5, 2, 8, 'F');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("RESUMEN EJECUTIVO", marginX + 5, currentY);

    currentY += 10;
    const drawKpiCard = (x: number, y: number, title: string, value: string, subText: string, subColor: [number, number, number]) => {
      const width = 40; const height = 30;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.roundedRect(x, y, width, height, 3, 3, 'D');

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(title.toUpperCase(), x + width / 2, y + 8, { align: 'center' });

      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      if (title.includes("INGRESOS")) doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.text(value, x + width / 2, y + 18, { align: 'center' });

      doc.setTextColor(subColor[0], subColor[1], subColor[2]);
      doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text(subText, x + width / 2, y + 25, { align: 'center' });
    };

    const cardGap = 3.3;
    drawKpiCard(marginX, currentY, "Total Citas", kpi.totalCitas.toString(), "+12% vs anterior", greenColor);
    drawKpiCard(marginX + 40 + cardGap, currentY, "Ingresos Totales", `S/. ${kpi.ingresosTotales.toFixed(0)}`, "+8% vs anterior", greenColor);
    drawKpiCard(marginX + (40 + cardGap) * 2, currentY, "Tasa Asistencia", `${kpi.asistenciaPorc}%`, "Estable", secondaryColor);
    drawKpiCard(marginX + (40 + cardGap) * 3, currentY, "Canceladas", kpi.canceladas.toString(), kpi.canceladas === 0 ? "Excelente" : "Atención", kpi.canceladas === 0 ? greenColor : orangeColor);

    // --- 3. DETALLE OPERATIVO ---
    currentY += 45;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(marginX, currentY - 5, 2, 8, 'F');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("DETALLE OPERATIVO", marginX + 5, currentY);

    const tableRows = reportData.map(row => [
      new Date(row.fecha).toLocaleDateString(),
      row.paciente,
      row.doctor,
      row.especialidad,
      row.estado_asistencia || 'Pendiente',
      `S/. ${Number(row.monto || 0).toFixed(0)}`,
      row.metodo_pago || '-'
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['FECHA', 'PACIENTE', 'DOCTOR', 'ESPECIALIDAD', 'ESTADO', 'MONTO', 'MÉTODO']],
      body: tableRows,
      theme: 'plain',
      styles: {
        fontSize: 8, cellPadding: 4,
        textColor: [80, 80, 80],
      },
      headStyles: {
        textColor: darkColor, fontStyle: 'bold', fontSize: 8,
        lineWidth: 0.1, lineColor: [200, 200, 200]
      },
      columnStyles: {
        3: { textColor: primaryColor, fontStyle: 'normal' },
        4: { fontStyle: 'bold' },
        5: { fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body') {
          if (data.column.index === 4) {
            if (data.cell.raw === 'Asistió' || data.cell.raw === 'Completada') data.cell.styles.textColor = greenColor;
            else if (data.cell.raw === 'Pendiente') data.cell.styles.textColor = orangeColor;
            else if (data.cell.raw === 'No Asistió' || data.cell.raw === 'Cancelado') data.cell.styles.textColor = redColor;
          }
          if (data.column.index === 5 && Number(data.cell.raw?.toString().replace('S/. ', '')) > 0) {
            data.cell.styles.textColor = greenColor;
          }
        }
      },
      didDrawPage: function (data) {
        const finalY = data.cursor?.y || currentY;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(marginX, finalY, 190, finalY);

        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text("TOTAL INGRESOS (PERÍODO):", 150, finalY + 8, { align: 'right' });
        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.text(`S/. ${kpi.ingresosTotales.toFixed(0)}`, 190, finalY + 8, { align: 'right' });
      }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180);
      doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`Reporte_Ejecutivo_${fechas.inicio}.pdf`);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <Navbar navLinks={navLinks} principal="/admin" />

      <div className="flex-1 p-8 w-full overflow-y-auto">

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutDashboard className="text-indigo-600" /> Reportes Inteligentes
            </h1>
            <p className="text-slate-500 text-sm">Visualización y exportación de datos</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 px-2">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-600">Rango:</span>
            </div>
            <input type="date" value={fechas.inicio} onChange={e => setFechas({ ...fechas, inicio: e.target.value })} className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-slate-400">-</span>
            <input type="date" value={fechas.fin} onChange={e => setFechas({ ...fechas, fin: e.target.value })} className="p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />

            <button onClick={fetchData} disabled={loading} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition">
              <Search size={20} />
            </button>
          </div>

          <button onClick={generarPDF} disabled={loading || reportData.length === 0} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition shadow-md shadow-green-200 font-medium">
            <Download size={18} /> Exportar PDF Profesional
          </button>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-2" size={40} />
            <p>Analizando datos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Citas</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{kpi.totalCitas}</h3>
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 w-full"></div></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingresos (Rango)</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-2 flex items-center"><span className="text-green-500 mr-1 text-xl font-bold">S/.</span>{kpi.ingresosTotales.toFixed(2)}</h3>
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-3/4"></div></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa Asistencia</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{kpi.asistenciaPorc}%</h3>
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${kpi.asistenciaPorc}%` }}></div></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ausentismo/Cancel</p>
                <h3 className="text-3xl font-extrabold text-red-600 mt-2">{kpi.canceladas}</h3>
                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 w-1/4"></div></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2"><BarChart3 size={20} /> Demanda por Especialidad</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartAtenciones}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} name="Citas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2"><PieIcon size={20} /> Estado de Asistencia</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartEstados} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {chartEstados.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Detalle de Registros</h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">{reportData.length} registros encontrados</span>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm text-slate-500">
                    <tr>
                      <th className="p-4 font-semibold">Fecha</th>
                      <th className="p-4 font-semibold">Paciente</th>
                      <th className="p-4 font-semibold">Doctor</th>
                      <th className="p-4 font-semibold">Especialidad</th>
                      <th className="p-4 font-semibold">Estado</th>
                      <th className="p-4 font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {reportData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="p-4">{new Date(row.fecha).toLocaleDateString()}</td>
                        <td className="p-4 font-medium text-slate-800">{row.paciente}</td>
                        <td className="p-4">{row.doctor}</td>
                        <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">{row.especialidad}</span></td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.estado_asistencia === 'Asistió' ? 'bg-green-100 text-green-700' : row.estado_asistencia === 'Pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {row.estado_asistencia || 'Pendiente'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">S/. {Number(row.monto || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}