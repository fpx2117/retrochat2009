'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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
