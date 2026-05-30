import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { RoomSettingsClient } from '@/components/rooms/RoomSettingsClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RoomSettingsPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()

  if (!session) {
    redirect(`/login?redirect=/rooms/${id}/settings`)
  }

  const room = await prisma.room.findFirst({
    where: { id, closedAt: null },
  })

  if (!room) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <div className="retro-panel max-w-sm w-full text-center p-8">
          <p className="text-lg font-bold text-gray-700">Sala no encontrada</p>
          <p className="text-sm text-gray-500 mt-2">Esta sala no existe o fue cerrada.</p>
        </div>
      </div>
    )
  }

  // Verificar que el usuario es owner
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: id, userId: session.id } },
    select: { role: true },
  })

  if (member?.role !== 'owner') {
    redirect(`/rooms/${id}`)
  }

  // Obtener miembros baneados
  const bannedMembers = await prisma.roomMember.findMany({
    where: { roomId: id, bannedAt: { not: null } },
    select: {
      id: true,
      bannedAt: true,
      banReason: true,
      bannedBy: true,
      profile: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { bannedAt: 'desc' },
  })

  // Obtener nombres de quienes banearon
  const bannedByIds = [...new Set(bannedMembers.map(m => m.bannedBy).filter(Boolean))]
  const bannerProfiles = await prisma.profile.findMany({
    where: { id: { in: bannedByIds as string[] } },
    select: { id: true, username: true, displayName: true },
  })
  const bannerMap = new Map(bannerProfiles.map(p => [p.id, p]))

  const bannedWithBanner = bannedMembers.map(m => ({
    id: m.id,
    bannedAt: m.bannedAt!.toISOString(),
    banReason: m.banReason,
    bannedBy: m.bannedBy,
    profile: m.profile,
    bannedByProfile: m.bannedBy ? bannerMap.get(m.bannedBy) || null : null,
  }))

  return (
    <div className="min-h-[calc(100vh-120px)] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <RoomSettingsClient
          room={{
            id: room.id,
            name: room.name,
            description: room.description,
            category: room.category,
            isPrivate: room.isPrivate,
            slug: room.slug,
            createdAt: room.createdAt.toISOString(),
          }}
          bannedMembers={bannedWithBanner}
        />
      </div>
    </div>
  )
}
