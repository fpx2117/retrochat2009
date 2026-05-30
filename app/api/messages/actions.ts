'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { sanitizeMessage } from '@/lib/utils'

const MESSAGE_RATE_LIMIT_MS = 1000
const lastMessageTime: Map<string, number> = new Map()

export async function sendMessage(roomId: string, content: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  // Rate limiting
  const lastTime = lastMessageTime.get(session.id) || 0
  const now = Date.now()
  if (now - lastTime < MESSAGE_RATE_LIMIT_MS) {
    return { error: 'Estás enviando mensajes muy rápido. Esperá un momento.' }
  }
  lastMessageTime.set(session.id, now)

  const sanitized = sanitizeMessage(content)
  if (!sanitized || sanitized.trim().length === 0) {
    return { error: 'El mensaje no puede estar vacío' }
  }
  if (sanitized.length > 500) {
    return { error: 'Mensaje demasiado largo (máx 500 caracteres)' }
  }

  // Verificar membresía y ban
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.id } },
    select: { bannedAt: true },
  })

  if (!member) return { error: 'No eres miembro de esta sala' }
  if (member.bannedAt) return { error: 'Fuiste expulsado de esta sala' }

  // Verificar sala activa
  const room = await prisma.room.findFirst({
    where: { id: roomId, closedAt: null },
  })
  if (!room) return { error: 'La sala está cerrada' }

  // Insertar mensaje
  const message = await prisma.message.create({
    data: {
      roomId,
      userId: session.id,
      content: sanitized,
      isSystem: false,
    },
    include: {
      profile: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
  })

  return { success: true, message }
}

export async function deleteMessage(messageId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { roomId: true, userId: true, deletedAt: true },
  })

  if (!message) return { error: 'Mensaje no encontrado' }
  if (message.deletedAt) return { error: 'El mensaje ya fue eliminado' }

  // Verificar permisos
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: message.roomId, userId: session.id } },
    select: { role: true },
  })

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
    select: { role: true },
  })

  const canDelete =
    message.userId === session.id ||
    ['moderator', 'owner'].includes(member?.role || '') ||
    profile?.role === 'admin'

  if (!canDelete) return { error: 'Sin permisos para eliminar este mensaje' }

  await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      deletedBy: session.id,
    },
  })

  return { success: true }
}

export async function sendSystemMessage(roomId: string, content: string) {
  const session = await getSession()

  // Sistema: requiere estar autenticado o ser server-side
  await prisma.message.create({
    data: {
      roomId,
      userId: session?.id || '00000000-0000-0000-0000-000000000001',
      content,
      isSystem: true,
    },
  })

  return { success: true }
}

export async function loadMoreMessages(roomId: string, beforeId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const beforeMsg = await prisma.message.findUnique({
    where: { id: beforeId },
    select: { createdAt: true },
  })

  if (!beforeMsg) return { error: 'Mensaje de referencia no encontrado' }

  const messages = await prisma.message.findMany({
    where: {
      roomId,
      createdAt: { lt: beforeMsg.createdAt },
      deletedAt: null,
    },
    include: {
      profile: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return { messages: messages.reverse() }
}

export async function reportContent(data: {
  reportedUserId?: string
  messageId?: string
  roomId?: string
  reason: string
}) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  if (!data.reason || data.reason.trim().length < 5) {
    return { error: 'El motivo debe tener al menos 5 caracteres' }
  }

  await prisma.report.create({
    data: {
      reporterId: session.id,
      reportedUserId: data.reportedUserId || null,
      messageId: data.messageId || null,
      roomId: data.roomId || null,
      reason: data.reason.trim(),
    },
  })

  return { success: true }
}

export async function blockUser(targetUserId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  if (session.id === targetUserId) return { error: 'No podés bloquearte a vos mismo' }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: session.id, blockedId: targetUserId } },
    create: { blockerId: session.id, blockedId: targetUserId },
    update: {},
  })

  return { success: true }
}

export async function unblockUser(targetUserId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  await prisma.block.deleteMany({
    where: { blockerId: session.id, blockedId: targetUserId },
  })

  return { success: true }
}
