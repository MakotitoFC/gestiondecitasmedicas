// Esta es la ÚNICA API route que tu frontend llamará.
// Debes crear este archivo: app/api/citas/crud/route.ts
// y ELIMINAR tus 4 archivos antiguos (/buscar, /modificar, /reservar, /eliminar).

import { NextResponse } from 'next/server';
import axios from 'axios';

// Pon la URL de tu NUEVO webhook "CRUD_Citas" en tu .env.local
const N8N_ROUTER_URL = process.env.N8N_WEBHOOK_ROUTER_URL; 

export async function POST(request: Request) {
  if (!N8N_ROUTER_URL) {
    console.error('Error: N8N_WEBHOOK_ROUTER_URL no está configurada.');
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 500 });
  }

  try {
    // 1. Obtiene TODOS los datos del frontend (sea cual sea la acción)
    const payload = await request.json();

    // 2. Valida que al menos haya una acción
    if (!payload.action) {
      return NextResponse.json({ error: 'Falta el campo "action".' }, { status: 400 });
    }

    // 3. Envía TODO el payload a n8n
    // Asegúrate de que tu webhook en n8n NO tenga la ruta de /api/citas/buscar
    const n8nResponse = await axios.post(N8N_ROUTER_URL, payload);

    // 4. Devuelve la respuesta de n8n (que SIEMPRE será la lista de citas)
    return NextResponse.json(n8nResponse.data, { status: 200 });

  } catch (error: any) {
    console.error('Error al procesar CRUD:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Error interno al contactar n8n', details: error.response?.data }, 
      { status: 502 }
    );
  }
}