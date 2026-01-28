import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  const body = await request.json();
  const { telefono } = body;

  if (!telefono) {
    return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
  }

  try {
    const url = process.env.N8N_WEBHOOK_BUSCAR_CITA_URL;
    if (!url) {
      return NextResponse.json({ error: 'Configuración faltante: N8N_WEBHOOK_BUSCAR_CITA_URL' }, { status: 500 });
    }
    const payload = { p_telefono: telefono };
    const { data } = await axios.post(url, payload);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error buscando citas:', err);
    return NextResponse.json({ error: 'Error al buscar citas' }, { status: 500 });
  }
}
