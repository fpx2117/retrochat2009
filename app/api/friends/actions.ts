'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function sendFriendRequest(addresseeId: string) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  if (session.id === addresseeId) {
    return { error: 'No podés enviarte una solicitud a vos mismo' }
  }

  // Verificar que el destinatario existe
  const addressee = await prisma.profile.findUnique({
    where: { id: addresseeId },
    select: { id: true },
  })
  if (!addressee) return { error: 'Usuario no encontrado' }

  // Verificar si ya existe una relación (en cualquier dirección o estado)
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.id, addresseeId },
        { requesterId: addresseeId, addresseeId: session.id },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'accepted') return { error: 'Ya son amigos' }
    if (existing.status === 'pending') {
      if (existing.requesterId === session.id) {
        return { error: 'Ya existe una solicitud de amistad pendiente con este usuario' }
      }
      // El otro ya te envió solicitud — auto-aceptar
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'accepted' },
      })
      revalidatePath('/profile/[username]', 'page')
      return { success: true }
    }
    if (existing.status === 'rejected') {
      // Permitir reenvío: actualizar a pending
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'pending', requesterId: session.id, addresseeId },
      })
      revalidatePath('/profile/[username]', 'page')
      return { success: true }
    }
  }

  await prisma.friendship.create({
    data: {
      requesterId: session.id,
      addresseeId,
      status: 'pending',
    },
  })

  revalidatePath('/profile/[username]', 'page')
  return { success: true }
}

export async function respondFriendRequest(friendshipId: string, response: 'accepted' | 'rejected') {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  })

  if (!friendship) return { error: 'Solicitud no encontrada' }
  if (friendship.addresseeId !== session.id) {
    return { error: 'Sin permisos para responder esta solicitud' }
  }
  if (friendship.status !== 'pending') {
    return { error: 'Esta solicitud ya fue respondida' }
  }

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: response },
  })

  revalidatePath('/profile/[username]', 'page')
  return { success: true }
}

export async function removeFriend(friendshipId: string) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  })

  if (!friendship) return { error: 'Amistad no encontrada' }
  if (friendship.requesterId !== session.id && friendship.addresseeId !== session.id) {
    return { error: 'Sin permisos para eliminar esta amistad' }
  }

  await prisma.friendship.delete({
    where: { id: friendshipId },
  })

  revalidatePath('/profile/[username]', 'page')
  return { success: true }
}

export async function getPendingRequestCount() {
  const session = await getSession()
  if (!session) return { count: 0 }

  const count = await prisma.friendship.count({
    where: {
      addresseeId: session.id,
      status: 'pending',
    },
  })

  return { count }
}
