'use client'

import { useState, useTransition } from 'react'
import { updateProfile, changePassword, deleteAccount } from '@/app/api/profile/actions'
import { Avatar } from '@/components/ui/Avatar'
import { USER_STATUSES } from '@/types'
import type { Profile, UserStatus } from '@/types'
import { getDefaultAvatar } from '@/lib/utils'

export function SettingsClient({ profile, email }: { profile: Profile; email: string }) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [previewAvatar, setPreviewAvatar] = useState(profile.avatar_url || '')
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>(profile.status)
  const [bioLength, setBioLength] = useState(profile.bio?.length || 0)
  const [nameLength, setNameLength] = useState(profile.display_name?.length || 0)

  // ─── Cambio de contraseña ─────────────────────────────────
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwPending, setPwPending] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ─── Eliminar cuenta ──────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, setDeletePending] = useState(false)

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 6) {
      setPwError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    setPwPending(true)
    const result = await changePassword(currentPassword, newPassword)
    if (result.error) {
      setPwError(result.error)
    } else {
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwSuccess(false), 3000)
    }
    setPwPending(false)
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Ingresá tu contraseña')
      return
    }
    setDeletePending(true)
    setDeleteError(null)
    const result = await deleteAccount(deletePassword)
    if (result?.error) {
      setDeleteError(result.error)
      setDeletePending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── SECCIÓN 1: Perfil ─────────────────────────── */}
      <div className="retro-panel overflow-hidden shadow-2xl">
        <div className="retro-header px-5 py-3">
          <h1 className="text-white font-bold">😊 Perfil</h1>
          <p className="text-blue-200 text-xs">Personalizá tu información pública</p>
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
              <p className="text-xs text-gray-400">{email}</p>
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
            <div>
              <label className="retro-label">🏷️ Nombre de usuario (no editable)</label>
              <input type="text" className="retro-input opacity-60" value={profile.username} readOnly disabled />
              <p className="text-xs text-gray-400 mt-0.5">El username no se puede cambiar</p>
            </div>

            <div>
              <label className="retro-label" htmlFor="display_name">😊 Nombre visible</label>
              <input id="display_name" name="display_name" type="text" required className="retro-input"
                defaultValue={profile.display_name} maxLength={30}
                onChange={e => setNameLength(e.target.value.length)} disabled={isPending} />
              <div className="text-xs text-gray-400 text-right mt-0.5">{nameLength}/30</div>
            </div>

            <div>
              <label className="retro-label" htmlFor="bio">📝 Estado/Bio</label>
              <textarea id="bio" name="bio" className="retro-input retro-textarea"
                placeholder="Ej: Amante del rock de los 2000 🎸"
                defaultValue={profile.bio || ''} maxLength={200} rows={2}
                onChange={e => setBioLength(e.target.value.length)} disabled={isPending} />
              <div className="text-xs text-gray-400 text-right mt-0.5">{bioLength}/200</div>
            </div>

            <div>
              <label className="retro-label" htmlFor="avatar_url">🖼️ URL de avatar</label>
              <input id="avatar_url" name="avatar_url" type="url" className="retro-input"
                placeholder="https://ejemplo.com/mi-avatar.jpg"
                defaultValue={profile.avatar_url || ''}
                onChange={e => setPreviewAvatar(e.target.value)} disabled={isPending} />
              <p className="text-xs text-gray-400 mt-0.5">Link directo a una imagen. Vacío = avatar generado.</p>
            </div>

            <div>
              <label className="retro-label">🟢 Estado</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(USER_STATUSES) as [UserStatus, any][]).map(([status, info]) => (
                  <label key={status}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                      selectedStatus === status ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="radio" name="status" value={status} checked={selectedStatus === status}
                      onChange={() => setSelectedStatus(status)} className="retro-checkbox" disabled={isPending} />
                    <span style={{ color: info.color }}>●</span>
                    <span className="text-xs font-bold text-gray-700">{info.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <div className="retro-error">⚠️ {error}</div>}
            {success && <div className="retro-success">✅ ¡Perfil actualizado correctamente!</div>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => window.history.back()}
                className="retro-btn retro-btn-secondary text-xs flex-1" disabled={isPending}>Cancelar</button>
              <button type="submit" className="retro-btn retro-btn-primary text-xs flex-1" disabled={isPending}>
                {isPending ? <><span className="retro-spinner w-3 h-3" /> Guardando...</> : '💾 Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── SECCIÓN 2: Seguridad ────────────────────────── */}
      <div className="retro-panel overflow-hidden shadow-2xl">
        <div className="retro-header px-5 py-3">
          <h1 className="text-white font-bold">🔒 Seguridad</h1>
          <p className="text-blue-200 text-xs">Cambiá tu contraseña</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="retro-label" htmlFor="currentPassword">Contraseña actual</label>
              <input id="currentPassword" type="password" className="retro-input"
                value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                disabled={pwPending} required />
            </div>
            <div>
              <label className="retro-label" htmlFor="newPassword">Nueva contraseña</label>
              <input id="newPassword" type="password" className="retro-input"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                disabled={pwPending} required minLength={6} />
            </div>
            <div>
              <label className="retro-label" htmlFor="confirmPassword">Confirmar contraseña</label>
              <input id="confirmPassword" type="password" className="retro-input"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                disabled={pwPending} required />
            </div>

            {pwError && <div className="retro-error">⚠️ {pwError}</div>}
            {pwSuccess && <div className="retro-success">✅ Contraseña actualizada correctamente</div>}

            <button type="submit" className="retro-btn retro-btn-primary text-xs"
              disabled={pwPending || !currentPassword || !newPassword || !confirmPassword}>
              {pwPending ? <><span className="retro-spinner w-3 h-3" /> Cambiando...</> : '🔒 Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>

      {/* ─── SECCIÓN 3: Zona de peligro ──────────────────── */}
      <div className="retro-panel overflow-hidden shadow-2xl border-2 border-red-300" style={{ background: '#fff5f5' }}>
        <div className="px-5 py-3" style={{ background: 'linear-gradient(180deg, #cc0000 0%, #990000 100%)' }}>
          <h1 className="text-white font-bold">⚠️ Zona de peligro</h1>
          <p className="text-red-200 text-xs">Acciones irreversibles</p>
        </div>

        <div className="p-6">
          {!showDelete ? (
            <div>
              <p className="text-xs text-gray-600 mb-3">
                Eliminar tu cuenta es <strong>permanente e irreversible</strong>. Se borrarán tu perfil, mensajes,
                salas donde sos dueño, amistades y todos tus datos.
              </p>
              <button onClick={() => setShowDelete(true)}
                className="retro-btn retro-btn-danger text-xs">
                🗑️ Eliminar cuenta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-700 font-bold">
                ⚠️ Esta acción es irreversible. Se eliminarán: tu perfil, mensajes,
                salas donde sos dueño, y todas tus relaciones.
              </p>
              <div>
                <label className="retro-label" htmlFor="deletePassword">
                  Ingresá tu contraseña para confirmar
                </label>
                <input id="deletePassword" type="password" className="retro-input"
                  value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                  disabled={deletePending}
                  onKeyDown={e => e.key === 'Enter' && handleDeleteAccount()} />
              </div>
              {deleteError && <div className="retro-error">⚠️ {deleteError}</div>}
              <div className="flex gap-2">
                <button onClick={() => { setShowDelete(false); setDeletePassword(''); setDeleteError(null) }}
                  className="retro-btn retro-btn-secondary text-xs flex-1" disabled={deletePending}>
                  Cancelar
                </button>
                <button onClick={handleDeleteAccount}
                  className="retro-btn retro-btn-danger text-xs flex-1" disabled={deletePending}>
                  {deletePending ? <><span className="retro-spinner w-3 h-3" /> Eliminando...</> : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
