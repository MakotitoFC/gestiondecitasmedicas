"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

import { supabase } from "../../../lib/supabaseClient";
import { div } from "framer-motion/client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PieLabelRenderProps } from "recharts/types/polar/Pie";
import Navbar from "../components/Navbar";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    Users,        // Icono para Pacientes
    Stethoscope,  // Icono para Médicos
    Calendar,     // Icono para Citas
    FileText,     // Icono para Reportes
} from 'lucide-react';


interface CitasPorEspecialidadDia {
    especialidad: string;
    total_citas: number;
}

interface CitasStatus {
    estado: string;
    total: number;
    [key: string]: unknown;
}

interface PromedioAtendidas {
    categoria: string; // "General", "Cardiología", etc.
    promedio_diario: number;
    total_atendidas: number;
}

interface DoctoresPorEspecialidad {
    especialidad: string;
    total_doctores: number;
}

//------HELPERS
const getToday = () => {
    return new Date().toISOString().split('T')[0]
}

const getCurrentYear = () => new Date().getFullYear();

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const navLinks = [
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Médicos', href: '/admin/medicos', icon: Stethoscope },
    {
        name: 'Citas Médicas', href: '/admin/citas', icon: Calendar,
        subItems: [
            { name: 'Agenda', href: '/admin/citas' },
            { name: 'Historia Médica', href: '/admin/citas/historia' },
            { name: 'Control de Pagos', href: '/admin/citas/control' },
            // Reportes YA NO VA AQUÍ
        ]
    },
    { name: 'Reportes', href: '/admin/reportes', icon: FileText }, // VA AQUÍ
];

const AdminDashboard = () => {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user || (role !== 'admin' && role !== 'administrador')) {
            router.push('/login');
        }
    }, [user, role, loading, router]);

    //Estados para el grafico barras por dia
    const [cargarCitasEspecialidadPorDia, setCargarCitasEspecialidadPorDia] = useState(true);
    const [fecha, setFecha] = useState(getToday());
    const [citasEspecialidadPorDia, setCitasEspecialidadPorDia] = useState<CitasPorEspecialidadDia[]>([]);


    //Citas por estado
    const [cargarCitasStatus, setCargarCitasStatus] = useState(true);
    const [citasStatus, setCitasStatus] = useState<CitasStatus[]>([]);

    const [year, setYear] = useState(getCurrentYear());


    //Atendidos
    const [cargarPromedioAtendidas, setCargarPromedioAtendidas] = useState(true);
    const [promedioGeneral, setPromedioGeneral] = useState<PromedioAtendidas | null>(null);
    const [promedioPorEspecialidad, setPromedioPorEspecialidad] = useState<PromedioAtendidas[]>([]);

    // Doctores (Punto 5) - NUEVO ESTADO
    const [cargarDoctores, setCargarDoctores] = useState(true);
    const [doctoresPorEspecialidad, setDoctoresPorEspecialidad] = useState<DoctoresPorEspecialidad[]>([]);

    //Grafico cantidad de citas por especialidad en una fecha
    const fetchCitasEspecialidadPorDia = async (selectedDate: string) => {
        setCargarCitasEspecialidadPorDia(true);
        const { data, error } = await supabase.rpc('get_citas_por_especialidad_en_fecha', {
            fecha_filtro: selectedDate
        });
        //console.log(selectedDate)
        //console.log(data)

        if (error) {
            console.error("Error al obtener citas por especialidad en fecha", error.message)
        } else {
            setCitasEspecialidadPorDia(data)
        }
        setCargarCitasEspecialidadPorDia(false)
    }

    const fetchCitasStatus = async (selectedYear: number) => {
        setCargarCitasStatus(true);
        const fecha_inicio = `${selectedYear}-01-01`;
        const fecha_fin = `${selectedYear}-12-31`;
        const { data, error } = await supabase.rpc('tasa_asistencia', {
            fecha_inicio,
            fecha_fin
        });
        //console.log(data)

        if (error) {
            console.error("Error al obtener citas por estado", error.message)
        } else {
            setCitasStatus(data || [])
        }
        setCargarCitasStatus(false)
    }

    const fetchPromedioAtendidas = async (selectedYear: number) => {
        setCargarPromedioAtendidas(true);
        const fecha_inicio = `${selectedYear}-01-01`;
        const fecha_fin = `${selectedYear}-12-31`;
        const { data, error } = await supabase.rpc('promedio_citas_atendidas', { fecha_inicio, fecha_fin });
        console.log(data)

        if (error) {
            console.error("Error al obtener citas por estado", error.message)
            setPromedioGeneral(null)
            setPromedioPorEspecialidad([])
        } else if (data) {
            // Separamos el dato "General" para la Card
            setPromedioGeneral(
                data.find((d: PromedioAtendidas) => d.categoria === "General") || null
            );
            // El resto es para el gráfico
            setPromedioPorEspecialidad(
                data.filter((d: PromedioAtendidas) => d.categoria !== "General")
            );
        }
        setCargarPromedioAtendidas(false)
    }

    // Doctores por Especialidad (Punto 5) - NUEVA FUNCIÓN
    const fetchDoctoresPorEspecialidad = async () => {
        setCargarDoctores(true);
        const { data, error } = await supabase.rpc(
            "contar_doctores_por_especialidad"
        );
        if (error) {
            console.error("Error al obtener doctores por especialidad", error.message);
            setDoctoresPorEspecialidad([]);
        } else {
            setDoctoresPorEspecialidad(data || []);
        }
        setCargarDoctores(false);
    };

    useEffect(() => {
        fetchCitasEspecialidadPorDia(fecha)
    }, [fecha])

    useEffect(() => {
        fetchCitasStatus(year)
        fetchPromedioAtendidas(year);
    }, [year])

    useEffect(() => {
        fetchDoctoresPorEspecialidad();
    }, []);

    const lineColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE'];

    return (
        <>
            <div className="flex flex-col md:flex-row min-h-screen">
                <Navbar navLinks={navLinks} principal="/admin" />
                <div className="flex-1 p-8 space-y-8 w-full">

                    <h1 className="text-3xl font-bold mb-6">Dashboard Admin</h1>

                    {/* --- FILA 1 --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <label
                                    htmlFor="fechaCitas"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Seleccionar fecha
                                </label>
                                <input
                                    type="date"
                                    id="fechaCitas"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            {cargarCitasEspecialidadPorDia ? (
                                <div className="h-80 flex items-center justify-center">
                                    Cargando datos...
                                </div>
                            ) : (
                                <div style={{ width: "100%", height: "300px" }} className="p-4 pl-0 border rounded-lg">
                                    <h2 className="pl-10">Citas por especialidad</h2>
                                    <ResponsiveContainer>
                                        <BarChart data={citasEspecialidadPorDia}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="especialidad" />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar
                                                dataKey="total_citas"
                                                fill="#8884d8"
                                                name="Total Citas"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="border rounded-lg p-4">
                            <h2>Tasa de asistencia (Año: {year})</h2>
                            {cargarCitasStatus ? (
                                <div className="h-80 flex items-center justify-center">
                                    Cargando datos
                                </div>
                            ) : (
                                <div style={{ width: "100%", height: "300px" }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={citasStatus}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ percent = 0 }: PieLabelRenderProps) =>
                                                    `${((percent as number) * 100).toFixed(2)}%`
                                                }
                                                outerRadius={110}
                                                fill="#8884d8"
                                                dataKey="total"
                                                nameKey="estado"
                                            >
                                                {citasStatus.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- FILA 2 (Punto 4: Promedio) --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Card Punto 4 (General) */}
                        <div className="bg-white border rounded-xl shadow-sm p-6 lg:col-span-1">
                            <h2 className="text-xl font-semibold mb-2">
                                Promedio Citas Atendidas
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">(Diario, Año: {year})</p>
                            {cargarPromedioAtendidas ? (
                                <div className="text-3xl font-bold">Cargando...</div>
                            ) : (
                                <div className="text-5xl font-bold text-emerald-600">
                                    {promedioGeneral?.promedio_diario || 0}
                                </div>
                            )}
                            <p className="text-gray-600 mt-2">
                                Total Atendidas: {promedioGeneral?.total_atendidas || 0}
                            </p>
                        </div>

                        {/* Card Punto 4 (Especialidad - Gráfico de Línea) */}
                        <div className="bg-white border rounded-xl shadow-sm p-6 lg:col-span-2">
                            <h2 className="text-xl font-semibold mb-4">
                                Promedio por Especialidad (Diario, Año: {year})
                            </h2>
                            {cargarPromedioAtendidas ? (
                                <div className="h-80 flex items-center justify-center">
                                    Cargando datos...
                                </div>
                            ) : (
                                <div style={{ width: "100%", height: 300 }}>
                                    <ResponsiveContainer>
                                        <LineChart data={promedioPorEspecialidad}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="categoria"
                                                fontSize={12}
                                                interval={0}
                                                angle={-15}
                                                textAnchor="end"
                                                height={50}
                                            />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="promedio_diario"
                                                stroke="#8884d8"
                                                strokeWidth={2}
                                                name="Promedio Diario"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- FILA 3 (Punto 5: Doctores) --- */}
                    <div className="bg-white border rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Doctores por Especialidad</h2>
                        {cargarDoctores ? (
                            <div className="h-80 flex items-center justify-center">
                                Cargando datos...
                            </div>
                        ) : (
                            <div style={{ width: "100%", height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={doctoresPorEspecialidad}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="especialidad"
                                            fontSize={12}
                                            interval={0}
                                            angle={-15}
                                            textAnchor="end"
                                            height={50}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar
                                            dataKey="total_doctores"
                                            fill="#10b981"
                                            name="Total Doctores"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default AdminDashboard