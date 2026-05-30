'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession, clearSessionCookie } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

export async function updateProfile(formData: FormData) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const displayName = (formData.get('display_name') as string).trim()
  const bio = (formData.get('bio') as string).trim()
  const status = formData.get('status') as string
  const avatarUrl = (formData.get('avatar_url') as string).trim()

  const validStatuses = ['online', 'away', 'busy', 'invisible']
  if (!validStatuses.includes(status)) {
    return { error: 'Estado inválido' }
  }

  if (displayName.length < 1 || displayName.length > 30) {
    return { error: 'El nombre debe tener entre 1 y 30 caracteres' }
  }
  if (bio.length > 200) {
    return { error: 'La bio debe tener máximo 200 caracteres' }
  }

  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { error: 'URL de avatar inválida' }
      }
    } catch {
      return { error: 'URL de avatar inválida' }
    }
  }

  await prisma.profile.update({
    where: { id: session.id },
    data: {
      displayName,
      bio,
      status: status as any,
      avatarUrl: avatarUrl || null,
      lastSeenAt: new Date(),
    },
  })

  revalidatePath('/settings')

  return { success: true }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  if (!newPassword || newPassword.length < 6) {
    return { error: 'La nueva contraseña debe tener al menos 6 caracteres' }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { passwordHash: true },
  })

  if (!user) return { error: 'Usuario no encontrado' }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return { error: 'La contraseña actual es incorrecta' }

  const newHash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: newHash },
  })

  return { success: true }
}

export async function deleteAccount(password: string) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { passwordHash: true },
  })

  if (!user) return { error: 'Usuario no encontrado' }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return { error: 'Contraseña incorrecta' }

  // Eliminar usuario — cascade elimina profile, mensajes, membresías, amistades, etc.
  await prisma.user.delete({
    where: { id: session.id },
  })

  await clearSessionCookie()
  redirect('/')
}
