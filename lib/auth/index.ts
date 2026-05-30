import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import type { User, Profile } from '@prisma/client'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'retrochat-2009-dev-secret-change-in-production')
const COOKIE_NAME = 'rc_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 días

export interface SessionUser {
  id: string
  username: string
}

// ─── Crear y firmar JWT ──────────────────────────────────────

export async function createSessionToken(userId: string, username: string): Promise<string> {
  return new SignJWT({ sub: userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

// ─── Verificar JWT y extraer usuario ─────────────────────────

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.sub || !payload.username) return null
    return { id: payload.sub, username: payload.username as string }
  } catch {
    return null
  }
}

// ─── Obtener sesión actual (server-side) ─────────────────────

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// ─── Obtener sesión con perfil ───────────────────────────────

export async function getSessionWithProfile(): Promise<(SessionUser & { displayName: string; role: string }) | null> {
  const session = await getSession()
  if (!session) return null

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
    select: { username: true, displayName: true, role: true },
  })

  if (!profile) return null

  return {
    ...session,
    displayName: profile.displayName,
    role: profile.role,
  }
}

// ─── Setear cookie de sesión ──────────────────────────────────

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

// ─── Eliminar cookie de sesión ────────────────────────────────

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

// ─── Obtener sesión desde request (middleware) ────────────────

export async function getSessionFromCookies(cookieHeader: string): Promise<SessionUser | null> {
  const cookies = cookieHeader.split('; ').reduce((acc: Record<string, string>, c) => {
    const [key, val] = c.split('=')
    acc[key] = val
    return acc
  }, {})
  const token = cookies[COOKIE_NAME]
  if (!token) return null
  return verifySessionToken(token)
}
