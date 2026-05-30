import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { createSessionToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()

    // Buscar por username (vía Profile → User)
    const profile = await prisma.profile.findUnique({
      where: { username: cleanUsername },
      select: { id: true, username: true, user: { select: { passwordHash: true } } },
    })

    if (!profile || !profile.user) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, profile.user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    const token = await createSessionToken(profile.id, profile.username)
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('signin error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
