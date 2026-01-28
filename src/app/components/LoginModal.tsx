'use client';

import { useState } from 'react';
import axios from 'axios';
import { usePaciente } from '@/app/context/PacienteContext'; // Importaremos el Contexto en el Paso 2

interface LoginModalProps {
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
    // Modo: 'login' (comprobar) o 'registro' (crear)
    const [mode, setMode] = useState<'login' | 'registro'>('login');
    const [telefono, setTelefono] = useState('');
    const [dni, setDni] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Usamos el hook del contexto para actualizar el estado global del paciente
    const { setPaciente } = usePaciente(); 

    // --- Lógica de Comprobación de Paciente (Login) ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Llama al API Route que a su vez llama a n8n: /api/pacientes/comprobar
            const response = await axios.post('/api/pacientes/comprobar', { 
                telefono, 
                dni // Si usas DNI también
            });

            const data = response.data;

            if (data.exists && data.paciente_id) {
                // Éxito: Guardar datos del paciente en el contexto global
                setPaciente(data); 
                onClose(); // Cerrar modal
            } else {
                // Paciente no existe, cambiar a modo registro
                setMode('registro');
            }

        } catch (err) {
            setError('Error al iniciar sesión. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Lógica de Registro de Paciente (Por implementar) ---
    const handleRegistro = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // Aquí llamarías a /api/pacientes/crear y luego harías login automático
        alert('Lógica de registro pendiente. ¡Implementa el POST a /api/pacientes/crear!');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {mode === 'login' ? 'Identificación' : 'Registro Rápido'}
                </h2>

                <form onSubmit={mode === 'login' ? handleLogin : handleRegistro}>
                    {mode === 'login' ? (
                        <div className="mb-4">
                            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                                Teléfono o DNI
                            </label>
                            <input
                                id="telefono"
                                type="text"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="Ej: 987654321 o DNI"
                            />
                        </div>
                    ) : (
                        // Formulario de Registro (Placeholder)
                        <div>
                            <p className="text-red-600 mb-4">No te encontramos. Por favor, regístrate.</p>
                            {/* Aquí irían los campos: Nombres, Apellidos, Teléfono, etc. */}
                            <button type="submit" disabled={isLoading} className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition">
                                {isLoading ? 'Registrando...' : 'Registrar y Continuar'}
                            </button>
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-2 rounded-md font-semibold mt-6 ${mode === 'login' ? 'bg-blue-600 hover:bg-blue-700' : 'hidden'} text-white transition`}
                    >
                        {isLoading ? 'Verificando...' : 'Continuar'}
                    </button>
                </form>

                <button onClick={onClose} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700">
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default LoginModal;