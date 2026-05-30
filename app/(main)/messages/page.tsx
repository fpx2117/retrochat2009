import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'

export const dynamic = 'force-dynamic'

export default async function MessagesListPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let profiles: any[] = []

  try {
    // @ts-ignore — directMessage existe en DB pero LSP no lo detecta
    const conversations = await prisma.directMessage.groupBy({
      by: ['senderId'],
      where: { receiverId: session.id },
    }) as any[]

    const receivedFromIds = conversations.map((c: any) => c.senderId)

    // @ts-ignore
    const sentTo = await prisma.directMessage.groupBy({
      by: ['receiverId'],
      where: { senderId: session.id },
    }) as any[]

    const sentToIds = sentTo.map((s: any) => s.receiverId)

    const allIds = [...new Set([...receivedFromIds, ...sentToIds])]

    profiles = allIds.length > 0 ? await prisma.profile.findMany({
      where: { id: { in: allIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
    }) : []
  } catch (e) {
    console.error('Error cargando mensajes:', e)
  }

  return (
    <div className="min-h-[calc(100vh-120px)] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="retro-panel p-5">
          <div className="retro-section-title mb-3">💬 Mensajes privados</div>

          {profiles.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">
              No tenés conversaciones todavía.<br />
              Entrá a una sala y hacé clic en "💬 Mensaje privado" en un usuario.
            </p>
          ) : (
            <div className="space-y-1">
              {profiles.map((profile: any) => (
                <Link
                  key={profile.id}
                  href={`/messages/${profile.username}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <Avatar
                    username={profile.username}
                    avatarUrl={profile.avatarUrl}
                    displayName={profile.displayName}
                    status={profile.status}
                    size="sm"
                    showStatus
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">
                      {profile.displayName || profile.username}
                    </p>
                    <p className="text-xs text-gray-500">@{profile.username}</p>
                  </div>
                  <span className="text-xs text-blue-500">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
