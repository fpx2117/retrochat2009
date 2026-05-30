'use server'

import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { createSessionToken, setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth'
import { validateUsername } from '@/lib/utils'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const password = formData.get('password') as string
  const username = (formData.get('username') as string).trim().toLowerCase()
  const displayName = (formData.get('display_name') as string).trim()

  if (!password || !username || !displayName) {
    return { error: 'Todos los campos son obligatorios' }
  }

  const usernameError = validateUsername(username)
  if (usernameError) {
    return { error: `Username inválido: ${usernameError}` }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  if (displayName.length < 1 || displayName.length > 30) {
    return { error: 'El nombre debe tener entre 1 y 30 caracteres' }
  }

  // Verificar username único
  const existingProfile = await prisma.profile.findUnique({
    where: { username },
  })
  if (existingProfile) {
    return { error: 'Ese nombre de usuario ya está en uso. ¡Elegí otro!' }
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
        username,
        displayName,
      },
    })
    return u
  })

  // Iniciar sesión automáticamente
  const token = await createSessionToken(user.id, username)
  await setSessionCookie(token)

  return { success: true }
}

export async function signIn(formData: FormData) {
  const username = (formData.get('username') as string).trim().toLowerCase()
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Completá usuario y contraseña' }
  }

  // Buscar por username (vía Profile → User)
  const profile = await prisma.profile.findUnique({
    where: { username },
    select: { id: true, username: true, user: { select: { passwordHash: true } } },
  })

  if (!profile || !profile.user) {
    return { error: 'Usuario o contraseña incorrectos' }
  }

  const valid = await bcrypt.compare(password, profile.user.passwordHash)
  if (!valid) {
    return { error: 'Usuario o contraseña incorrectos' }
  }

  const token = await createSessionToken(profile.id, profile.username)
  await setSessionCookie(token)

  redirect('/rooms')
}

export async function signOut() {
  await clearSessionCookie()
  redirect('/')
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!username || username.length < 3) return false

  const existing = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
  })
  return !existing
}
