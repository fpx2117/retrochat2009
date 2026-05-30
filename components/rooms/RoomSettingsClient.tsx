'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateRoom, closeRoom } from '@/app/api/rooms/actions'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ROOM_CATEGORIES } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

interface BannedMember {
  id: string
  bannedAt: string
  banReason: string | null
  bannedBy: string | null
  profile: {
    username: string
    displayName: string
    avatarUrl: string | null
  }
  bannedByProfile?: {
    username: string
    displayName: string
  } | null
}

interface RoomSettingsClientProps {
  room: {
    id: string
    name: string
    description: string
    category: string
    isPrivate: boolean
    slug: string
    createdAt: string
  }
  bannedMembers: BannedMember[]
}

export function RoomSettingsClient({ room, bannedMembers }: RoomSettingsClientProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateRoom(room.id, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        router.refresh()
      }
    })
  }

  const handleCloseRoom = async () => {
    setCloseError(null)
    const result = await closeRoom(room.id)
    if (result.error) {
      setCloseError(result.error)
      setShowCloseConfirm(false)
    } else {
      router.push('/rooms')
    }
  }

  return (
    <div className="space-y-4">
      {/* Editar sala */}
      <div className="retro-panel overflow-hidden shadow-2xl">
        <div className="retro-header px-5 py-3">
          <h1 className="text-white font-bold">⚙️ Configuración de {room.name}</h1>
          <p className="text-blue-200 text-xs">Editá los detalles de tu sala</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="retro-label" htmlFor="name">🏷️ Nombre de la sala</label>
              <input id="name" name="name" type="text" required className="retro-input"
                defaultValue={room.name} maxLength={50} minLength={2} disabled={isPending} />
            </div>

            <div>
              <label className="retro-label" htmlFor="description">📝 Descripción</label>
              <textarea id="description" name="description" className="retro-input retro-textarea"
                defaultValue={room.description} maxLength={200} rows={2} disabled={isPending} />
              <div className="text-xs text-gray-400 text-right mt-0.5">Máx 200 caracteres</div>
            </div>

            <div>
              <label className="retro-label" htmlFor="category">📂 Categoría</label>
              <select id="category" name="category" className="retro-select w-full"
                defaultValue={room.category} disabled={isPending}>
                {ROOM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_private" defaultChecked={room.isPrivate}
                  className="retro-checkbox" disabled={isPending} />
                <span className="retro-label mb-0">🔒 Sala privada</span>
              </label>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>🔗 Slug: <code className="bg-gray-100 px-1 rounded">{room.slug}</code></p>
              <p>📅 Creada: {formatRelativeTime(room.createdAt)}</p>
            </div>

            {error && <div className="retro-error">⚠️ {error}</div>}
            {success && <div className="retro-success">✅ Sala actualizada correctamente</div>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => router.push(`/rooms/${room.id}`)}
                className="retro-btn retro-btn-secondary text-xs flex-1" disabled={isPending}>
                ← Volver a la sala
              </button>
              <button type="submit" className="retro-btn retro-btn-primary text-xs flex-1" disabled={isPending}>
                {isPending ? <><span className="retro-spinner w-3 h-3" /> Guardando...</> : '💾 Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Usuarios expulsados */}
      <div className="retro-panel overflow-hidden shadow-2xl">
        <div className="retro-header px-5 py-3">
          <h1 className="text-white font-bold">🚫 Usuarios expulsados ({bannedMembers.length})</h1>
        </div>

        <div className="p-4">
          {bannedMembers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No hay usuarios expulsados</p>
          ) : (
            <div className="space-y-2">
              {bannedMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 bg-red-50 rounded border border-red-100">
                  <Avatar username={member.profile.username} avatarUrl={member.profile.avatarUrl}
                    displayName={member.profile.displayName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700">{member.profile.displayName}</p>
                    <p className="text-xs text-gray-500">
                      Expulsado {formatRelativeTime(member.bannedAt)}
                      {member.banReason && ` — "${member.banReason}"`}
                    </p>
                    {member.bannedByProfile && (
                      <p className="text-xs text-gray-400">
                        Por {member.bannedByProfile.displayName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cerrar sala */}
      <div className="retro-panel overflow-hidden shadow-2xl border-2 border-red-300" style={{ background: '#fff5f5' }}>
        <div className="px-5 py-3" style={{ background: 'linear-gradient(180deg, #cc0000 0%, #990000 100%)' }}>
          <h1 className="text-white font-bold">🔒 Cerrar sala definitivamente</h1>
          <p className="text-red-200 text-xs">Esta acción no se puede deshacer</p>
        </div>

        <div className="p-6">
          <p className="text-xs text-gray-600 mb-3">
            Al cerrar la sala, nadie más podrá entrar ni enviar mensajes.
            Los mensajes existentes seguirán visibles pero la sala no aparecerá en el listado público.
          </p>
          {closeError && <div className="retro-error mb-2">⚠️ {closeError}</div>}
          <button onClick={() => setShowCloseConfirm(true)}
            className="retro-btn retro-btn-danger text-xs">
            🔒 Cerrar sala definitivamente
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="⚠️ ¿Cerrar esta sala?"
        message="La sala se cerrará permanentemente. Nadie más podrá entrar ni enviar mensajes. Esta acción no se puede deshacer."
        confirmLabel="Cerrar sala"
        danger
        onConfirm={handleCloseRoom}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  )
}
