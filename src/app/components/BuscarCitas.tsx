'use client';
import { useState, FormEvent, ChangeEvent } from 'react';

export default function BuscarCitas() {
  type Cita = {
    fecha_cita: string;
    hora_inicio: string;
    doctor_nombres: string;
    doctor_apellidos: string;
    google_event_id: string;
    modalidad: 'P' | 'V';
  };
  const [telefono, setTelefono] = useState('');
  const [citas, setCitas] = useState<Cita[]>([]);
  const [error, setError] = useState<string>('');

  const handleBuscar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error buscando citas');
      setCitas(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error buscando citas');
      }
      setCitas([]);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Buscar mis citas</h2>
      <form onSubmit={handleBuscar} className="space-y-4">
        <input
          type="text"
          value={telefono}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTelefono(e.target.value)}
          placeholder="📱 Teléfono del paciente"
          className="w-full p-3 border border-gray-300 rounded"
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded">
          Buscar citas
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {citas.length > 0 && (
        <div className="mt-6 space-y-4">
          {citas.map((cita, i) => (
            <div key={i} className="p-4 border rounded shadow">
              <p><strong>Fecha:</strong> {cita.fecha_cita}</p>
              <p><strong>Hora:</strong> {cita.hora_inicio}</p>
              <p><strong>Doctor:</strong> {cita.doctor_nombres} {cita.doctor_apellidos}</p>
              <p><strong>Google Meet ID:</strong> {cita.google_event_id}</p>
              <p><strong>Modalidad:</strong> {cita.modalidad === 'V' ? 'Virtual' : 'Presencial'}</p>

              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1 bg-yellow-500 text-white rounded">Modificar</button>
                <button className="px-3 py-1 bg-red-600 text-white rounded">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
