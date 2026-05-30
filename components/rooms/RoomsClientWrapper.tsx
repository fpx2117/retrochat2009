'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatRelativeTime } from '@/lib/utils'
import { ROOM_CATEGORIES } from '@/types'

interface Room {
  id: string
  name: string
  slug: string
  description: string
  category: string
  is_private: boolean
  created_at: string
  owner_id: string
  max_users: number | null
  profiles: { username: string; display_name: string; avatar_url: string | null } | null
}

export function RoomsClientWrapper({
  initialRooms,
  initialSearch,
  initialCategory,
}: {
  initialRooms: Room[]
  initialSearch?: string
  initialCategory?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialSearch || '')
  const [category, setCategory] = useState(initialCategory || 'all')

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category && category !== 'all') params.set('category', category)
    router.push(`/rooms?${params.toString()}`)
  }, [search, category, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🏠 Salas de Chat
          </h1>
          <p className="text-blue-200 text-xs mt-0.5">
            {initialRooms.length} sala{initialRooms.length !== 1 ? 's' : ''} disponible{initialRooms.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/rooms/new" className="retro-btn retro-btn-primary text-xs">
          ✨ Crear sala
        </Link>
      </div>

      {/* Filtros */}
      <div className="retro-panel p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscador */}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="🔍 Buscar sala..."
              className="retro-input flex-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={handleSearch} className="retro-btn retro-btn-primary text-xs">
              Buscar
            </button>
          </div>

          {/* Filtro categoría */}
          <select
            className="retro-select"
            value={category}
            onChange={e => {
              setCategory(e.target.value)
              const params = new URLSearchParams()
              if (search) params.set('search', search)
              if (e.target.value && e.target.value !== 'all') params.set('category', e.target.value)
              router.push(`/rooms?${params.toString()}`)
            }}
          >
            <option value="all">📂 Todas las categorías</option>
            {ROOM_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de salas */}
      {initialRooms.length === 0 ? (
        <div className="retro-panel p-8">
          <div className="retro-empty">
            <span className="empty-icon">🏚️</span>
            <p className="mb-1">No hay salas que coincidan.</p>
            <p className="text-xs mb-4">¡Creá la primera!</p>
            <Link href="/rooms/new" className="retro-btn retro-btn-primary text-xs">
              ✨ Crear mi sala
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initialRooms.map(room => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  )
}

function RoomCard({ room }: { room: Room }) {
  const isNew = room.created_at > new Date(Date.now() - 86400000).toISOString()

  return (
    <Link href={`/rooms/${room.id}`} className="block">
      <div className="room-card h-full">
        {/* Header de la sala */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-base flex-shrink-0">
              {room.is_private ? '🔒' : '🌐'}
            </span>
            <span className="font-bold text-sm text-gray-800 truncate">
              {room.name}
            </span>
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-1">
            {isNew && <span className="retro-badge retro-badge-new">NEW!</span>}
          </div>
        </div>

        {/* Descripción */}
        <p className="text-xs text-gray-600 mb-2 line-clamp-2 min-h-[2rem]">
          {room.description || 'Sin descripción'}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="truncate">👤 {room.profiles?.username || 'desconocido'}</span>
          <span className="flex-shrink-0">{formatRelativeTime(room.created_at)}</span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {room.category}
          </span>
          {room.is_private && (
            <span className="retro-badge retro-badge-private text-xs">Privada</span>
          )}
          {room.max_users && (
            <span className="text-xs text-gray-400">máx {room.max_users}</span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-3 pt-2 border-t border-gray-200">
          <span className="retro-btn retro-btn-primary text-xs w-full justify-center">
            {room.is_private ? '🔐 Entrar (con contraseña)' : '➡️ Entrar a la sala'}
          </span>
        </div>
      </div>
    </Link>
  )
}
