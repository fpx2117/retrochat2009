import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') || ''

  // Rutas protegidas que requieren autenticación
  const protectedPaths = ['/settings', '/rooms/new', '/admin']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Rutas solo para no autenticados
  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath || isAuthPath) {
    const session = await getSessionFromCookies(cookieHeader)

    if (!session && isProtectedPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    if (session && isAuthPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/rooms'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
