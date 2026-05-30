import Link from 'next/link'
import { prisma } from '@/lib/db/prisma'
import { formatRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getPublicRooms() {
  const rooms = await prisma.room.findMany({
    where: { isPrivate: false, closedAt: null },
    include: {
      owner: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
  return rooms
}

export default async function HomePage() {
  const rooms = await getPublicRooms()

  return (
    <div className="min-h-[calc(100vh-120px)] py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Hero Section */}
        <div className="retro-panel p-8 mb-6 text-center shadow-2xl">
          <div className="text-5xl mb-3">💬</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Bienvenido a <span className="text-blue-700">RetroChat 2009</span>
          </h1>
          <p className="text-sm text-gray-600 mb-1">
            El chat de salas más nostálgico de la web moderna.
          </p>
          <p className="text-xs text-gray-500 mb-5">
            Registrate gratis, creá tu sala y chateá en tiempo real con personas reales. 😊 :D ❤️
          </p>

          {/* Stats decorativas */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-700">{rooms.length}+</div>
              <div className="text-xs text-gray-500">Salas activas</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">Online</div>
              <div className="text-xs text-gray-500">Ahora mismo</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">100%</div>
              <div className="text-xs text-gray-500">Gratuito</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="retro-btn retro-btn-primary text-sm py-2 px-6">
              🚀 Crear mi cuenta gratis
            </Link>
            <Link href="/rooms" className="retro-btn retro-btn-secondary text-sm py-2 px-6">
              🏠 Ver salas públicas
            </Link>
          </div>
        </div>

        {/* Salas destacadas */}
        <div className="retro-panel p-5 mb-6 shadow-xl">
          <div className="retro-section-title">🔥 Salas Calientes</div>

          {rooms.length === 0 ? (
            <div className="retro-empty">
              <span className="empty-icon">🏚️</span>
              <p>Todavía no hay salas. ¡Sé el primero en crear una!</p>
              <Link href="/rooms/new" className="retro-btn retro-btn-primary text-xs mt-3 inline-flex">
                Crear sala
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rooms.map((room: { id: string; isPrivate: boolean; name: string; description: string; createdAt: Date; category: string; owner: { username: string } | null }) => (
                <Link href={`/rooms/${room.id}`} key={room.id} className="block">
                  <div className="room-card">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">
                          {room.isPrivate ? '🔒' : '🌐'}
                        </span>
                        <span className="font-bold text-sm text-gray-800 truncate max-w-32">
                          {room.name}
                        </span>
                        {room.createdAt > new Date(Date.now() - 86400000) && (
                          <span className="retro-badge retro-badge-new">NEW!</span>
                        )}
                      </div>
                      <span className="retro-badge retro-badge-online text-xs flex-shrink-0">
                        Online
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 truncate mb-2">
                      {room.description || 'Sin descripción'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>👤 {room.owner?.username}</span>
                      <span>📅 {formatRelativeTime(room.createdAt.toISOString())}</span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        {room.category}
                      </span>
                      {room.isPrivate && (
                        <span className="retro-badge retro-badge-private text-xs">Privada</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-4">
            <Link href="/rooms" className="retro-btn retro-btn-secondary text-xs">
              Ver todas las salas →
            </Link>
          </div>
        </div>

        {/* Features retro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="retro-panel p-4 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold text-sm text-gray-800 mb-1">Chat en tiempo real</h3>
            <p className="text-xs text-gray-600">Mensajes instantáneos sin recargar la página</p>
          </div>
          <div className="retro-panel p-4 text-center">
            <div className="text-3xl mb-2">🏠</div>
            <h3 className="font-bold text-sm text-gray-800 mb-1">Tus propias salas</h3>
            <p className="text-xs text-gray-600">Creá salas públicas o privadas con contraseña</p>
          </div>
          <div className="retro-panel p-4 text-center">
            <div className="text-3xl mb-2">😎</div>
            <h3 className="font-bold text-sm text-gray-800 mb-1">Estética 2009</h3>
            <p className="text-xs text-gray-600">Gradientes, emoticones y nostalgia garantizada</p>
          </div>
        </div>

        {/* Emoticones decorativos */}
        <div className="text-center text-2xl opacity-30 tracking-widest">
          😊 :D 😛 xD 😉 😢 ❤️ 😮 😎 😇
        </div>
      </div>
    </div>
  )
}
