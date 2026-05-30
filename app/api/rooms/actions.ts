'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { generateSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { ROOM_CATEGORIES } from '@/types'

export async function createRoom(formData: FormData) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión para crear una sala' }

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const category = formData.get('category') as string
  const isPrivate = formData.get('is_private') === 'on'
  const password = formData.get('password') as string
  const maxUsersStr = formData.get('max_users') as string

  if (!name || name.length < 2 || name.length > 50) {
    return { error: 'El nombre debe tener entre 2 y 50 caracteres' }
  }
  if (description.length > 200) {
    return { error: 'La descripción es demasiado larga (máx 200 caracteres)' }
  }
  if (!ROOM_CATEGORIES.includes(category as any)) {
    return { error: 'Categoría inválida' }
  }
  if (isPrivate && password && password.length < 4) {
    return { error: 'La contraseña de sala debe tener al menos 4 caracteres' }
  }

  const maxUsers = maxUsersStr ? parseInt(maxUsersStr) : null
  if (maxUsers !== null && (isNaN(maxUsers) || maxUsers < 2 || maxUsers > 500)) {
    return { error: 'El límite de usuarios debe ser entre 2 y 500' }
  }

  let slug = generateSlug(name)
  const existingSlug = await prisma.room.findUnique({ where: { slug } })
  if (existingSlug) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  let passwordHash: string | null = null
  if (isPrivate && password) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  const room = await prisma.$transaction(async (tx) => {
    const r = await tx.room.create({
      data: {
        name,
        slug,
        description,
        category,
        isPrivate,
        passwordHash,
        ownerId: session.id,
        maxUsers,
      },
    })

    await tx.roomMember.create({
      data: {
        roomId: r.id,
        userId: session.id,
        role: 'owner',
      },
    })

    return r
  })

  redirect(`/rooms/${room.id}`)
}

export async function joinRoom(roomId: string, password?: string) {
  const session = await getSession()
  if (!session) return { error: 'Debes iniciar sesión' }

  const room = await prisma.room.findFirst({
    where: { id: roomId, closedAt: null },
  })

  if (!room) return { error: 'La sala no existe o está cerrada' }

  // Verificar membresía existente
  const existing = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.id } },
  })

  if (existing) {
    if (existing.bannedAt) return { error: 'Fuiste expulsado de esta sala' }
    return { success: true }
  }

  // Verificar contraseña
  if (room.isPrivate && room.passwordHash) {
    if (!password) return { error: 'Esta sala requiere contraseña', requiresPassword: true }
    const valid = await bcrypt.compare(password, room.passwordHash)
    if (!valid) return { error: 'Contraseña incorrecta' }
  } else if (room.isPrivate) {
    return { error: 'Esta sala es privada' }
  }

  // Verificar límite de usuarios
  if (room.maxUsers) {
    const count = await prisma.roomMember.count({
      where: { roomId, bannedAt: null },
    })
    if (count >= room.maxUsers) {
      return { error: 'La sala está llena' }
    }
  }

  await prisma.roomMember.create({
    data: {
      roomId,
      userId: session.id,
      role: 'member',
    },
  })

  return { success: true }
}

export async function leaveRoom(roomId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.id } },
  })

  if (member?.role === 'owner') {
    return { error: 'El owner no puede abandonar la sala. Podés cerrarla en configuración.' }
  }

  await prisma.$transaction([
    prisma.roomMember.deleteMany({
      where: { roomId, userId: session.id },
    }),
    prisma.roomPresence.deleteMany({
      where: { roomId, userId: session.id },
    }),
  ])

  return { success: true }
}

export async function closeRoom(roomId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
    select: { role: true },
  })

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.id } },
  })

  if (member?.role !== 'owner' && profile?.role !== 'admin') {
    return { error: 'Sin permisos para cerrar esta sala' }
  }

  await prisma.room.update({
    where: { id: roomId },
    data: { closedAt: new Date() },
  })

  return { success: true }
}

export async function banUser(roomId: string, targetUserId: string, reason?: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const actor = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.id } },
    select: { role: true },
  })

  if (!actor || !['moderator', 'owner'].includes(actor.role)) {
    const profile = await prisma.profile.findUnique({
      where: { id: session.id },
      select: { role: true },
    })
    if (profile?.role !== 'admin') {
      return { error: 'Sin permisos de moderación' }
    }
  }

  const target = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    select: { role: true },
  })

  if (target?.role === 'owner') {
    return { error: 'No se puede expulsar al dueño de la sala' }
  }

  await prisma.$transaction([
    prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      data: {
        bannedAt: new Date(),
        bannedBy: session.id,
        banReason: reason || 'Expulsado por moderador',
      },
    }),
    prisma.roomPresence.deleteMany({
      where: { roomId, userId: targetUserId },
    }),
  ])

  return { success: true }
}

export async function promoteToModerator(roomId: string, targetUserId: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const actor = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.id } },
    select: { role: true },
  })

  if (actor?.role !== 'owner') {
    return { error: 'Solo el dueño puede nombrar moderadores' }
  }

  await prisma.roomMember.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { role: 'moderator' },
  })

  return { success: true }
}

export async function updateRoom(roomId: string, formData: FormData) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.id } },
    select: { role: true },
  })

  if (member?.role !== 'owner') {
    return { error: 'Solo el dueño puede editar esta sala' }
  }

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const category = formData.get('category') as string
  const isPrivate = formData.get('is_private') === 'on'

  if (!name || name.length < 2 || name.length > 50) {
    return { error: 'El nombre debe tener entre 2 y 50 caracteres' }
  }
  if (description.length > 200) {
    return { error: 'La descripción es demasiado larga (máx 200 caracteres)' }
  }
  if (!ROOM_CATEGORIES.includes(category as any)) {
    return { error: 'Categoría inválida' }
  }

  let slug = generateSlug(name)
  const existingSlug = await prisma.room.findFirst({
    where: { slug, id: { not: roomId } },
  })
  if (existingSlug) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  await prisma.room.update({
    where: { id: roomId },
    data: { name, slug, description, category, isPrivate },
  })

  revalidatePath(`/rooms/${roomId}/settings`)
  return { success: true }
}
