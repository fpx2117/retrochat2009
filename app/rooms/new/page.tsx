'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom } from '@/app/api/rooms/actions'
import { ROOM_CATEGORIES } from '@/types'

export default function NewRoomPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isPrivate, setIsPrivate] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [nameLength, setNameLength] = useState(0)
  const [descLength, setDescLength] = useState(0)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createRoom(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-[calc(100vh-120px)] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="retro-panel overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="retro-header px-5 py-3">
            <h1 className="text-white font-bold flex items-center gap-2">
              ✨ Crear mi sala
            </h1>
            <p className="text-blue-200 text-xs">
              Tu espacio de chat personalizado
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="retro-label" htmlFor="name">
                  🏷️ Nombre de la sala *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="retro-input"
                  placeholder="Ej: Los amigos del foro"
                  maxLength={50}
                  minLength={2}
                  disabled={isPending}
                  onChange={e => setNameLength(e.target.value.length)}
                />
                <div className="text-xs text-gray-400 text-right mt-0.5">
                  {nameLength}/50
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="retro-label" htmlFor="description">
                  📝 Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="retro-input retro-textarea"
                  placeholder="¿De qué se trata tu sala?"
                  maxLength={200}
                  rows={2}
                  disabled={isPending}
                  onChange={e => setDescLength(e.target.value.length)}
                />
                <div className="text-xs text-gray-400 text-right mt-0.5">
                  {descLength}/200
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="retro-label" htmlFor="category">
                  📂 Categoría *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  className="retro-select w-full"
                  disabled={isPending}
                >
                  {ROOM_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Privacidad */}
              <div>
                <label className="retro-label">🔒 Privacidad</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="is_private"
                      className="retro-checkbox"
                      checked={isPrivate}
                      onChange={e => {
                        setIsPrivate(e.target.checked)
                        if (!e.target.checked) setHasPassword(false)
                      }}
                      disabled={isPending}
                    />
                    <span className="text-xs text-gray-700 group-hover:text-gray-900">
                      🔒 Sala privada (no aparece en listados públicos)
                    </span>
                  </label>

                  {isPrivate && (
                    <label className="flex items-center gap-2 cursor-pointer group ml-4">
                      <input
                        type="checkbox"
                        className="retro-checkbox"
                        checked={hasPassword}
                        onChange={e => setHasPassword(e.target.checked)}
                        disabled={isPending}
                      />
                      <span className="text-xs text-gray-700 group-hover:text-gray-900">
                        🔑 Proteger con contraseña
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Contraseña (solo si es privada con password) */}
              {isPrivate && hasPassword && (
                <div>
                  <label className="retro-label" htmlFor="password">
                    🔑 Contraseña de la sala
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="retro-input"
                    placeholder="Mínimo 4 caracteres"
                    minLength={4}
                    maxLength={50}
                    disabled={isPending}
                  />
                </div>
              )}

              {/* Límite de usuarios */}
              <div>
                <label className="retro-label" htmlFor="max_users">
                  👥 Límite de usuarios (opcional)
                </label>
                <input
                  id="max_users"
                  name="max_users"
                  type="number"
                  className="retro-input"
                  placeholder="Dejar vacío = sin límite"
                  min={2}
                  max={500}
                  disabled={isPending}
                />
                <p className="text-xs text-gray-400 mt-0.5">Entre 2 y 500 usuarios</p>
              </div>

              {error && (
                <div className="retro-error">⚠️ {error}</div>
              )}

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
                    <><span className="retro-spinner w-3 h-3" /> Creando...</>
                  ) : (
                    '🚀 Crear sala'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
