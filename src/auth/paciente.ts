import { supabase } from "../../lib/supabaseClient";

interface datosPaciente{
    nombres:string;
    apellidos:string;
    dni:string;
    telefono:string;
    direccion:string;
    fechanacimiento:string;
}

async function handleRegistro(email: string, password: string,datosPaciente: datosPaciente) {
  const {data:authData, error:authError} = await supabase.auth.signUp({
    email:email,
    password:password
  });

  if(authError){
    console.error("Error en el registro de usuario:", authError.message);
    return { error: authError.message };
  }

  if(authData.user){
    const {error:profileError} = await supabase
        .from('paciente')
        .insert({
            id: authData.user.id,
            correo:email,
            nombres: datosPaciente.nombres,
            apellidos: datosPaciente.apellidos,
            dni: datosPaciente.dni,
            telefono: datosPaciente.telefono,
            direccion: datosPaciente.direccion,
            fechanacimiento: datosPaciente.fechanacimiento
        })
    
    if(profileError){
        console.error("Error al crear el perfil del paciente:", profileError.message);
        return { error: profileError.message };
    }else{
        return { user: authData.user };
    }
  }
}
