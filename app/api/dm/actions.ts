'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sanitizeMessage } from '@/lib/utils'

export async function sendDirectMessage(receiverId: string, content: string) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  if (!content.trim()) return { error: 'El mensaje no puede estar vacío' }
  if (content.length > 5000) return { error: 'Máximo 5000 caracteres' }

  const receiver = await prisma.profile.findUnique({
    where: { id: receiverId },
    select: { id: true },
  })
  if (!receiver) return { error: 'Usuario no encontrado' }

  if (receiverId === session.id) return { error: 'No podés enviarte mensajes a vos mismo' }

  const sanitized = sanitizeMessage(content)

  const msg = await prisma.directMessage.create({
    data: {
      senderId: session.id,
      receiverId,
      content: sanitized,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  })

  return { success: true, message: msg }
}

export async function getConversation(otherUserId: string) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: session.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: session.id },
      ],
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return { messages }
}

export async function getUnreadCount() {
  const session = await getSession()
  if (!session) return { count: 0 }

  // Contar conversaciones distintas con mensajes no leídos
  const result = await prisma.directMessage.groupBy({
    by: ['senderId'],
    where: {
      receiverId: session.id,
      readAt: null,
    },
    _count: true,
  })

  return { count: result.length }
}

export async function markAsRead(senderId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  await prisma.directMessage.updateMany({
    where: {
      senderId,
      receiverId: session.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  return { success: true }
}
