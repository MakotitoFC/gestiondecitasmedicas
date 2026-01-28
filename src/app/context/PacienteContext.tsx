'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PacienteData {
    paciente_id: string; // UUID del paciente
    nombre: string;
    // Añade cualquier otro dato que n8n devuelva
}

interface PacienteContextType {
    paciente: PacienteData | null;
    setPaciente: (data: PacienteData | null) => void;
    isLoggedIn: boolean;
}

const PacienteContext = createContext<PacienteContextType | undefined>(undefined);

export const PacienteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [paciente, setPaciente] = useState<PacienteData | null>(null);
    const isLoggedIn = !!paciente; // Si el objeto paciente no es null, está logueado

    return (
        <PacienteContext.Provider value={{ paciente, setPaciente, isLoggedIn }}>
            {children}
        </PacienteContext.Provider>
    );
};

export const usePaciente = () => {
    const context = useContext(PacienteContext);
    if (context === undefined) {
        throw new Error('usePaciente debe usarse dentro de un PacienteProvider');
    }
    return context;
};