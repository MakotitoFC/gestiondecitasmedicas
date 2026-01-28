// src/lib/actions/dashboard.actions.ts
'use server'


import { cookies } from 'next/headers' // <-- Importamos cookies AQUÍ
import { createClient } from '../server'

/**
 * Obtiene los KPIs de citas (Tasa de Ausencia, etc.)
 */
export async function getCitasKPIs() {
  const cookieStore = cookies() // <-- Llamamos a cookies() aquí
  const supabase = createClient(cookieStore) // <-- Y lo pasamos como argumento

  const { data, error } = await supabase
    .rpc('get_dashboard_kpis_citas')
    .single()

  if (error) {
    console.error('Error fetching citas KPIs:', error)
    return null
  }
  return data
}

/**
 * Obtiene el conteo de atenciones por especialidad y estado
 */
export async function getAtencionesPorEspecialidad() {
  const cookieStore = cookies() // <-- Llamamos a cookies() aquí
  const supabase = createClient(cookieStore) // <-- Y lo pasamos como argumento

  const { data, error } = await supabase
    .rpc('get_dashboard_atenciones_por_especialidad')

  if (error) {
    console.error('Error fetching atenciones por especialidad:', error)
    return []
  }
  return data
}

/**
 * Obtiene las métricas por cada doctor
 */
export async function getMetricasPorDoctor() {
  const cookieStore = cookies() // <-- Llamamos a cookies() aquí
  const supabase = createClient(cookieStore) // <-- Y lo pasamos como argumento

  const { data, error } = await supabase
    .rpc('get_dashboard_metricas_por_doctor')

  if (error) {
    console.error('Error fetching metricas por doctor:', error)
    return []
  }
  return data
}