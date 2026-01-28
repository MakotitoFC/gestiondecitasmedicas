// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest){
     let res = NextResponse.next({
         request:{ headers: req.headers }
     });

     const supabase = createServerClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
         {
             cookies:{
                 get(name:string){ return req.cookies.get(name)?.value },
                 set(name:string, value:string, options:any){
                     req.cookies.set({name,value,...options})
                     res = NextResponse.next({ request:{ headers: req.headers } })
                     res.cookies.set({name,value,...options})
                 },
                 remove(name:string,options:any){
                     req.cookies.set({name,value:'',...options})
                     res = NextResponse.next({ request:{ headers: req.headers } })
                     res.cookies.set({name,value:'',...options})
                 }
             }
         }
     )

     // Esta es la única lógica que necesitamos
     const { data: { session } } = await supabase.auth.getSession();

     // Si NO hay sesión Y la ruta NO es /login Y NO es /registro...
     if (!session && 
         req.nextUrl.pathname !== '/login' && 
         req.nextUrl.pathname !== '/registro'
    ) {
         // ...entonces redirige a /login
         return NextResponse.redirect(new URL('/login', req.url));
     }

     // Quitamos el 'if(session && req.nextUrl.pathname==='/login')'
     // porque la página de login se encargará de eso.

     return res
}

export const config = {
     matcher: [
        // Protege todas las rutas excepto las públicas
        '/((?!login|registro|_next/static|_next/image|favicon.ico).*)'
     ]
}