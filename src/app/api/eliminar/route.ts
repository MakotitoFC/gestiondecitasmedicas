import { supabase as supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      throw new Error('ID del doctor no proporcionado.');
    }

    // --- Borrado Lógico en Perfiles ---
    const { error: profileError } = await supabaseAdmin
      .from('perfiles')
      .update({ is_active: false })
      .eq('id', id);

    if (profileError) {
      throw new Error(`Error al desactivar perfil: ${profileError.message}`);
    }

    // --- Borrado Lógico en Doctor ---
    const { error: doctorError } = await supabaseAdmin
      .from('doctor')
      .update({ is_active: false })
      .eq('iddoctor', id);

    if (doctorError) {
      // Opcional: podrías intentar revertir el update de perfil si esto falla
      // pero por ahora solo reportamos el error.
      throw new Error(`Error al desactivar doctor: ${doctorError.message}`);
    }

    // --- Borrado Lógico en auth.users (desactivar cuenta) ---
    // Esto evita que el usuario pueda iniciar sesión
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      {
        // Opciones para desactivar:
        // 1. Cambiar email (para "liberarlo")
        // email: `disabled_${Date.now()}_${user.email}` 
        // 2. Poner una contraseña imposible
        // password: crypto.randomUUID()
        // 3. O simplemente banearlo (la mejor opción)
        ban_duration: "none" // "none" significa baneado permanentemente
      }
    );

    if (authError) {
      throw new Error(`Error al desactivar cuenta de auth: ${authError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Doctor desactivado exitosamente.',
    });
  } catch (error: any) {
    console.error('Error al desactivar doctor:', error.message);
    return NextResponse.json(
      { error: `Error inesperado: ${error.message}` },
      { status: 500 }
    );
  }
}