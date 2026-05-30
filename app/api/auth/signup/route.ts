import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { validateUsername } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const { email, password, username, display_name } = await request.json()

    if (!email || !password || !username || !display_name) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
    }

    const usernameError = validateUsername(username)
    if (usernameError) {
      return NextResponse.json({ error: `Username inválido: ${usernameError}` }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    if (display_name.length < 1 || display_name.length > 30) {
      return NextResponse.json({ error: 'El nombre debe tener entre 1 y 30 caracteres' }, { status: 400 })
    }

    // Verificar email único
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Ese email ya está registrado. ¿Querés iniciar sesión?' }, { status: 409 })
    }

    // Verificar username único
    const existingProfile = await prisma.profile.findUnique({
      where: { username: username.toLowerCase() },
    })
    if (existingProfile) {
      return NextResponse.json({ error: 'Ese nombre de usuario ya está en uso. ¡Elegí otro!' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Crear usuario + perfil en transacción
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          passwordHash,
        },
      })

      await tx.profile.create({
        data: {
          id: u.id,
          username: username.toLowerCase(),
          displayName: display_name,
        },
      })

      return u
    })

    // Iniciar sesión automáticamente
    const token = await createSessionToken(user.id, user.email)
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('signup error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
