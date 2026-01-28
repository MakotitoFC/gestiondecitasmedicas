"use client";

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import {
    User,
    Mail,
    Phone,
    MessageCircle,
    Calendar,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle
} from 'lucide-react';

const navLinksPatient = [
    { name: 'Mis Citas', href: '/paciente', icon: Calendar },
    { name: 'Mi Perfil', href: '/paciente/perfil', icon: User },
];

export default function PerfilPacientePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        email: '',
        telefono: '',
        idtelegram: '',
        fechanacimiento: ''
    });

    useEffect(() => {
        if (!user) return;

        const fetchPerfil = async () => {
            try {
                const { data, error } = await supabase
                    .from('perfiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setFormData({
                        nombres: data.nombres || '',
                        apellidos: data.apellidos || '',
                        email: data.email || user.email || '',
                        telefono: data.telefono || '',
                        idtelegram: data.idtelegram || '',
                        fechanacimiento: data.fechanacimiento || ''
                    });
                }
            } catch (err) {
                console.error(err);
                setMsg({ type: 'error', text: 'Error al cargar perfil' });
            } finally {
                setLoading(false);
            }
        };

        fetchPerfil();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);

        try {
            const { error } = await supabase
                .from('perfiles')
                .update({
                    telefono: formData.telefono,
                    idtelegram: formData.idtelegram,
                    // Nombres, apellidos y fecha nacimiento suelen ser fijos o editables según reglas de negocio.
                    // Aquí permitimos editar teléfono y telegram principalmente.
                })
                .eq('id', user?.id);

            if (error) throw error;
            setMsg({ type: 'success', text: 'Perfil actualizado correctamente' });
        } catch (err: any) {
            setMsg({ type: 'error', text: 'Error al guardar: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
            <Navbar navLinks={navLinksPatient} principal="/paciente" />

            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto">

                    <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                        <User className="text-indigo-600" size={32} /> Mi Perfil
                    </h1>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex items-center gap-4">
                            <div className="h-20 w-20 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-3xl font-bold">
                                {formData.nombres.charAt(0)}{formData.apellidos.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{formData.nombres} {formData.apellidos}</h2>
                                <p className="text-gray-500">{formData.email}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">

                            {msg && (
                                <div className={`p-4 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {msg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    {msg.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                                    <input type="text" value={formData.nombres} disabled className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                    <input type="text" value={formData.apellidos} disabled className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                <div className="relative">
                                    <input type="email" value={formData.email} disabled className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed" />
                                    <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            name="telefono"
                                            value={formData.telefono}
                                            onChange={handleChange}
                                            placeholder="999888777"
                                            className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Necesario para recordatorios de citas.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Telegram (Opcional)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="idtelegram"
                                            value={formData.idtelegram}
                                            onChange={handleChange}
                                            placeholder="12345678"
                                            className="w-full p-3 pl-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <MessageCircle className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:bg-indigo-400"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Guardar Cambios
                                </button>
                            </div>

                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
}