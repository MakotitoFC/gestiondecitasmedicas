'use client'


import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";


interface AuthContextType {
    user: any | null;
    role: string | null;
    nombres: string | null;
    apellidos: string | null;
    loading: boolean;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [nombres, setNombres] = useState<string | null>(null);
    const [apellidos, setApellidos] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    const { data: profile, error } = await supabase
                        .from('perfiles')
                        .select('rol, nombres, apellidos')
                        .eq('id', session.user.id)
                        .single();

                    if (error) {
                        console.error("Error al obtener el perfil", error.message);
                    }

                    setUser(session.user);
                    setRole(profile?.rol || null);
                    setNombres(profile?.nombres || null);
                    setApellidos(profile?.apellidos || null);
                } else {
                    setUser(null);
                    setRole(null);
                    setNombres(null);
                    setApellidos(null);
                }
                setLoading(false);
            }
        )

        return () => {
            authListener?.subscription.unsubscribe();
        }
    }, [])

    const value = {
        user,
        role,
        nombres,
        apellidos,
        loading,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}



export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
}
