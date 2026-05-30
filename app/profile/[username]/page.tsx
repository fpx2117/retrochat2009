import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { ProfileClient } from '@/components/profile/ProfileClient'
import { formatRelativeTime } from '@/lib/utils'
import { USER_STATUSES } from '@/types'

interface Props {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const session = await getSession()

  const profile = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
  })

  if (!profile) notFound()

  const isOwnProfile = session?.id === profile.id
  const currentUserId = session?.id || null

  // Salas del usuario
  const rooms = await prisma.room.findMany({
    where: { ownerId: profile.id, closedAt: null },
    select: { id: true, name: true, description: true, category: true, isPrivate: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Amigos aceptados
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: profile.id },
        { addresseeId: profile.id },
      ],
    },
    include: {
      requester: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      addressee: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const friends = friendships
    .map(f => f.requesterId === profile.id ? f.addressee : f.requester)
    .sort((a, b) => (a.displayName || a.username).localeCompare(b.displayName || b.username))

  // Estado de amistad con el visitante
  let friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none'
  let friendshipId: string | null = null

  if (currentUserId && !isOwnProfile) {
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: profile.id },
          { requesterId: profile.id, addresseeId: currentUserId },
        ],
      },
    })

    if (existingFriendship) {
      friendshipId = existingFriendship.id
      if (existingFriendship.status === 'accepted') {
        friendshipStatus = 'accepted'
      } else if (existingFriendship.status === 'pending') {
        friendshipStatus = existingFriendship.requesterId === currentUserId ? 'pending_sent' : 'pending_received'
      }
    }
  }

  // Solicitudes pendientes (solo perfil propio)
  let pendingRequests: any[] = []
  if (isOwnProfile) {
    const pending = await prisma.friendship.findMany({
      where: { addresseeId: profile.id, status: 'pending' },
      include: {
        requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    pendingRequests = pending.map(p => ({
      id: p.id,
      requester: p.requester,
      created_at: p.createdAt.toISOString(),
    }))
  }

  const validStatus = (['online', 'away', 'busy', 'invisible'] as const).includes(profile.status as any)
    ? profile.status as import('@/types').UserStatus
    : 'online' as import('@/types').UserStatus
  const statusInfo = USER_STATUSES[validStatus]

  return (
    <div className="min-h-[calc(100vh-120px)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Perfil principal */}
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
                  status={validStatus}
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
                      borderColor: '#cc6600', color: '#fff',
                    }}>👑 Admin</span>
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

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
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

                {/* Botón de amistad */}
                <ProfileClient
                  profile={{
                    id: profile.id,
                    username: profile.username,
                    display_name: profile.displayName,
                    avatar_url: profile.avatarUrl,
                  }}
                  currentUser={currentUserId ? { id: currentUserId } : null}
                  friendshipStatus={friendshipStatus}
                  friendshipId={friendshipId}
                  isOwnProfile={isOwnProfile}
                  pendingRequests={pendingRequests}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Amigos */}
        <div className="retro-panel p-5 mb-4">
          <div className="retro-section-title">
            👥 Amigos ({friends.length})
          </div>
          {friends.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {friends.map(friend => {
                const fStatus = (['online', 'away', 'busy', 'invisible'] as const).includes(friend.status as any)
                  ? friend.status as import('@/types').UserStatus
                  : 'online' as import('@/types').UserStatus
                const fStatusInfo = USER_STATUSES[fStatus]
                return (
                  <Link key={friend.id} href={`/profile/${friend.username}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-blue-50 transition-colors border border-gray-100">
                    <Avatar username={friend.username} avatarUrl={friend.avatarUrl}
                      displayName={friend.displayName} size="sm" showStatus status={fStatus} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-700 truncate">
                        {friend.displayName || friend.username}
                      </p>
                      <p className="text-xs" style={{ color: fStatusInfo.color }}>{fStatusInfo.label}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">Sin amigos todavía</p>
          )}
        </div>

        {/* Salas del usuario */}
        {rooms.length > 0 && (
          <div className="retro-panel p-5 mb-4">
            <div className="retro-section-title">🏠 Salas de {profile.displayName || profile.username}</div>
            <div className="space-y-2">
              {rooms.map(room => (
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
