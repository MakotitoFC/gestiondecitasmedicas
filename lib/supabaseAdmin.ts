import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Solo inicializar si las variables existen para evitar errores en build
export const supabase = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null as any;

if (!supabase) {
  console.warn("⚠️ Supabase Admin no se inicializó: Faltan variables de entorno (SUPABASE_SERVICE_ROLE_KEY).");
}


