import { CookieOptions, createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const createClient = async () => {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set(name, value, options)
                    } catch (error) {
                        console.error("Error al establecer la cookie:", error)
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete(name)
                    } catch (error) {
                        console.error("Error al eliminar la cookie:", error)
                    }
                }
            }
        }
    )
}