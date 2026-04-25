import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Login gerektiren sayfalar
  const protectedPaths = ['/dashboard', '/board']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  // Auth-only sayfalar (login olunca tekrar gidemesin)
  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some((p) => pathname === p)

  // 1. Login değil + Protected sayfaya erişim → /login'e at
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Login + Auth sayfasına erişim → /dashboard'a at
  if (user && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Şu pathlerden başka her şeyde çalış:
     * - _next/static (static dosyalar)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public/ klasörü
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}