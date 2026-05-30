import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { createSessionToken, setSessionCookie } from '@/lib/auth'
import { validateUsername } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const { password, username, display_name } = await request.json()

    if (!password || !username || !display_name) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()
    const usernameError = validateUsername(cleanUsername)
    if (usernameError) {
      return NextResponse.json({ error: `Username inválido: ${usernameError}` }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    if (display_name.length < 1 || display_name.length > 30) {
      return NextResponse.json({ error: 'El nombre debe tener entre 1 y 30 caracteres' }, { status: 400 })
    }

    // Verificar username único
    const existingProfile = await prisma.profile.findUnique({
      where: { username: cleanUsername },
    })
    if (existingProfile) {
      return NextResponse.json({ error: 'Ese nombre de usuario ya está en uso. ¡Elegí otro!' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Crear usuario + perfil en transacción
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { passwordHash },
      })

      await tx.profile.create({
        data: {
          id: u.id,
          username: cleanUsername,
          displayName: display_name,
        },
      })

      return u
    })

    const token = await createSessionToken(user.id, cleanUsername)
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('signup error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
