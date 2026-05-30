'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/api/profile/actions'
import { Avatar } from '@/components/ui/Avatar'
import { USER_STATUSES } from '@/types'
import type { Profile, UserStatus } from '@/types'
import { getDefaultAvatar } from '@/lib/utils'

export function SettingsClient({ profile }: { profile: Profile }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [previewAvatar, setPreviewAvatar] = useState(profile.avatar_url || '')
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>(profile.status)
  const [bioLength, setBioLength] = useState(profile.bio?.length || 0)
  const [nameLength, setNameLength] = useState(profile.display_name?.length || 0)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <div className="retro-panel overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="retro-header px-5 py-3">
        <h1 className="text-white font-bold">⚙️ Mi Configuración</h1>
        <p className="text-blue-200 text-xs">Personalizá tu perfil</p>
      </div>

      <div className="p-6">
        {/* Preview del perfil */}
        <div className="retro-panel p-4 mb-5 flex items-center gap-4">
          <Avatar
            username={profile.username}
            avatarUrl={previewAvatar || profile.avatar_url}
            status={selectedStatus}
            size="xl"
            showStatus
          />
          <div>
            <p className="font-bold text-gray-800">{profile.display_name || profile.username}</p>
            <p className="text-xs text-gray-500">@{profile.username}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="status-dot"
                style={{ background: USER_STATUSES[selectedStatus].color }}
              />
              <span className="text-xs" style={{ color: USER_STATUSES[selectedStatus].color }}>
                {USER_STATUSES[selectedStatus].label}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (readonly) */}
          <div>
            <label className="retro-label">🏷️ Nombre de usuario (no editable)</label>
            <input
              type="text"
              className="retro-input opacity-60"
              value={profile.username}
              readOnly
              disabled
            />
            <p className="text-xs text-gray-400 mt-0.5">El username no se puede cambiar</p>
          </div>

          {/* Display name */}
          <div>
            <label className="retro-label" htmlFor="display_name">😊 Nombre visible</label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              className="retro-input"
              defaultValue={profile.display_name}
              maxLength={30}
              onChange={e => setNameLength(e.target.value.length)}
              disabled={isPending}
            />
            <div className="text-xs text-gray-400 text-right mt-0.5">{nameLength}/30</div>
          </div>

          {/* Bio */}
          <div>
            <label className="retro-label" htmlFor="bio">📝 Estado/Bio</label>
            <textarea
              id="bio"
              name="bio"
              className="retro-input retro-textarea"
              placeholder="Ej: Amante del rock de los 2000 🎸"
              defaultValue={profile.bio || ''}
              maxLength={200}
              rows={2}
              onChange={e => setBioLength(e.target.value.length)}
              disabled={isPending}
            />
            <div className="text-xs text-gray-400 text-right mt-0.5">{bioLength}/200</div>
          </div>

          {/* URL de avatar */}
          <div>
            <label className="retro-label" htmlFor="avatar_url">🖼️ URL de avatar</label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="url"
              className="retro-input"
              placeholder="https://ejemplo.com/mi-avatar.jpg"
              defaultValue={profile.avatar_url || ''}
              onChange={e => setPreviewAvatar(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-gray-400 mt-0.5">
              Link directo a una imagen (JPG, PNG, GIF). Dejalo vacío para usar el avatar generado.
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="retro-label">🟢 Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(USER_STATUSES) as [UserStatus, any][]).map(([status, info]) => (
                <label
                  key={status}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                    selectedStatus === status
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={selectedStatus === status}
                    onChange={() => setSelectedStatus(status)}
                    className="retro-checkbox"
                    disabled={isPending}
                  />
                  <span style={{ color: info.color }}>●</span>
                  <span className="text-xs font-bold text-gray-700">{info.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <div className="retro-error">⚠️ {error}</div>}
          {success && <div className="retro-success">✅ ¡Perfil actualizado correctamente!</div>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="retro-btn retro-btn-secondary text-xs flex-1"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="retro-btn retro-btn-primary text-xs flex-1"
              disabled={isPending}
            >
              {isPending ? (
                <><span className="retro-spinner w-3 h-3" /> Guardando...</>
              ) : '💾 Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
