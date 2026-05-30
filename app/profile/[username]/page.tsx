import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { formatRelativeTime } from '@/lib/utils'
import { USER_STATUSES } from '@/types'

interface Props {
  params: Promise<{ username: string }>
}

async function getProfileData(username: string) {
  const profile = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
  })

  if (!profile) return null

  const rooms = await prisma.room.findMany({
    where: { ownerId: profile.id, closedAt: null },
    select: { id: true, name: true, slug: true, description: true, category: true, isPrivate: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const memberships = await prisma.roomMember.findMany({
    where: { userId: profile.id, bannedAt: null },
    include: { room: { select: { name: true, id: true } } },
    orderBy: { joinedAt: 'desc' },
    take: 3,
  })

  return { profile, rooms, memberships }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const data = await getProfileData(username)

  if (!data) notFound()

  const { profile, rooms, memberships } = data
  const validStatus = (['online', 'away', 'busy', 'invisible'] as const).includes(profile.status as any)
    ? profile.status as import('@/types').UserStatus
    : 'online' as import('@/types').UserStatus
  const statusInfo = USER_STATUSES[validStatus]
  const displayStatus = validStatus

  return (
    <div className="min-h-[calc(100vh-120px)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="retro-panel p-0 overflow-hidden shadow-2xl mb-4">
          <div className="retro-header px-5 py-3">
            <span className="text-white text-xs font-bold">👤 Perfil de usuario</span>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0">
                <Avatar
                  username={profile.username}
                  avatarUrl={profile.avatarUrl}
                  displayName={profile.displayName}
                  status={displayStatus}
                  size="xl"
                  showStatus
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold text-gray-800">
                    {profile.displayName || profile.username}
                  </h1>
                  {profile.role === 'admin' && (
                    <span className="retro-badge" style={{
                      background: 'linear-gradient(180deg, #ffd700 0%, #ff8c00 100%)',
                      borderColor: '#cc6600',
                      color: '#fff',
                    }}>
                      👑 Admin
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 mb-2">@{profile.username}</p>

                <div className="flex items-center gap-1.5 mb-3">
                  <span className="status-dot" style={{ background: statusInfo.color }} />
                  <span className="text-xs font-bold" style={{ color: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                </div>

                {profile.bio && (
                  <div className="bg-blue-50 border border-blue-100 rounded p-2 mb-3">
                    <p className="text-xs text-gray-700 italic">"{profile.bio}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-bold text-gray-700">📅 Miembro desde:</span>
                    <br />
                    {formatRelativeTime(profile.createdAt.toISOString())}
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">🕐 Última conexión:</span>
                    <br />
                    {formatRelativeTime(profile.lastSeenAt.toISOString())}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="retro-panel p-5 mb-4">
            <div className="retro-section-title">🏠 Salas de {profile.displayName || profile.username}</div>
            <div className="space-y-2">
              {rooms.map((room: { id: string; name: string; description: string | null; createdAt: Date; isPrivate: boolean }) => (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <div className="room-card">
                    <div className="flex items-center gap-2">
                      <span>{room.isPrivate ? '🔒' : '🌐'}</span>
                      <span className="font-bold text-sm text-gray-800">{room.name}</span>
                      <span className="text-xs text-gray-500">{formatRelativeTime(room.createdAt.toISOString())}</span>
                    </div>
                    {room.description && (
                      <p className="text-xs text-gray-600 mt-1">{room.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/rooms" className="retro-btn retro-btn-secondary text-xs">
            ← Volver a salas
          </Link>
        </div>
      </div>
    </div>
  )
}
