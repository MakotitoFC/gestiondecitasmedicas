import { supabase as supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Variable para guardar el ID del nuevo usuario
    // La definimos aquí para que sea accesible en el bloque catch
    let newUserId: string | null = null;

    try {
        const body = await request.json();
        const {
            email,
            password,
            nombres,
            apellidos,
            fechaNacimiento,
            telefono,
            sexo,
            idespecialidad,
            horarios,
        } = body;

        // --- INICIO DE LA TRANSACCIÓN MANUAL ---

        // --- 1. Crear el usuario en auth.users ---
        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // Auto-confirmamos
            });

        if (authError) {
            // Si esto falla, no hay nada que deshacer.
            throw new Error(`Error en Auth: ${authError.message}`);
        }

        // ¡Éxito! Guardamos el ID para poder hacer rollback si algo falla
        newUserId = authData.user.id;

        // --- 2. Crear el perfil en la tabla Perfiles ---
        const { error: profileError } = await supabaseAdmin
            .from('perfiles')
            .insert({
                id: newUserId,
                nombres,
                apellidos,
                fechaNacimiento,
                telefono,
                sexo,
                rol: "doctor"
            });

        if (profileError) {
            // Si esto falla, SÍ tenemos que deshacer.
            throw new Error(`Error en Perfil: ${profileError.message}`);
        }

        // --- 3. Vincular al usuario como Doctor ---
        const { error: doctorError } = await supabaseAdmin.from('doctor').insert({
            iddoctor: newUserId,
            idespecialidad: idespecialidad,
        });

        if (doctorError) {
            throw new Error(`Error en Doctor: ${doctorError.message}`);
        }

        // --- 4. Insertar los Horarios ---
        if (horarios && horarios.length > 0) {
            const horariosParaInsertar = horarios.map(
                (h: {
                    diaSemana: string;
                    horaInicio: string;
                    horaFin: string;
                }) => ({
                    iddoctor: newUserId,
                    diasemana: h.diaSemana,
                    horainicio: h.horaInicio,
                    horafin: h.horaFin,
                    disponible: true,
                })
            );

            const { error: horarioError } = await supabaseAdmin
                .from('horario')
                .insert(horariosParaInsertar);

            if (horarioError) {
                throw new Error(`Error en Horarios: ${horarioError.message}`);
            }
        }

        // --- ¡Éxito! ---
        return NextResponse.json({
            success: true,
            message: 'Doctor registrado exitosamente.',
            userId: newUserId,
        });

    } catch (error: any) {
        // --- MANEJO DE ERRORES Y ROLLBACK ---
        console.error('Error en la transacción, iniciando rollback:', error.message);

        // Si 'newUserId' tiene un valor, significa que el usuario SÍ se creó
        // y necesitamos borrarlo para deshacer la operación.
        if (newUserId) {
            console.warn(`Haciendo rollback, eliminando usuario: ${newUserId}`);
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
            if (deleteError) {
                console.error("¡FALLO EL ROLLBACK!", deleteError.message);
                // Si el rollback falla, es un error crítico.
                // Lo reportamos, pero el error original es más importante.
                return NextResponse.json(
                    { error: `Error crítico: ${error.message}. El rollback falló: ${deleteError.message}` },
                    { status: 500 }
                );
            }
        }

        // Devolvemos el error original que causó el fallo
        return NextResponse.json(
            { error: `Error inesperado: ${error.message}` },
            { status: 500 }
        );
    }
}