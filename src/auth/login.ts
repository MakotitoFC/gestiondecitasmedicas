import { supabase } from "../../lib/supabaseClient";


export async function handleLogin(email: string, password: string){
    const {data, error} = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if(error){
        console.error("Error en el inicio de sesión:", error.message);
        return { error: error.message };
    }else{
        return { user: data.user };
    }
}

export async function handleOut(){
    const {error} = await supabase.auth.signOut();
    if(error){
        console.error("Error en el cierre de sesión:", error.message);
        return { error: error.message };
    }else{
        return { user: null };
    }
}