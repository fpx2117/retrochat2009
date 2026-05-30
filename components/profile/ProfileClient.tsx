'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendFriendRequest, respondFriendRequest, removeFriend } from '@/app/api/friends/actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Avatar } from '@/components/ui/Avatar'
import type { FriendshipStatus } from '@/types'

interface FriendProfile {
  id: string
  username: string
  display_name?: string
  avatar_url?: string | null
  status?: string
}

interface PendingRequest {
  id: string
  requester: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
  created_at: string
}

interface ProfileClientProps {
  profile: {
    id: string
    username: string
    display_name?: string
    avatar_url?: string | null
  }
  currentUser: { id: string } | null
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
  friendshipId: string | null
  isOwnProfile: boolean
  pendingRequests?: PendingRequest[]
}

export function ProfileClient({
  profile,
  currentUser,
  friendshipStatus,
  friendshipId,
  isOwnProfile,
  pendingRequests,
}: ProfileClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState(friendshipStatus)
  const [fId, setFId] = useState<string | null>(friendshipId)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  if (!currentUser || isOwnProfile) {
    // Sección de solicitudes pendientes (solo perfil propio)
    if (isOwnProfile && pendingRequests && pendingRequests.length > 0) {
      return (
        <div className="retro-panel p-4 mb-4">
          <div className="retro-section-title">📨 Solicitudes de amistad ({pendingRequests.length})</div>
          <div className="space-y-2 mt-2">
            {pendingRequests.map((req) => (
              <PendingRequestItem
                key={req.id}
                request={req}
                onRespond={async (response) => {
                  setLoading(true)
                  await respondFriendRequest(req.id, response)
                  router.refresh()
                  setLoading(false)
                }}
                loading={loading}
              />
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  const handleSendRequest = async () => {
    setLoading(true)
    setMessage(null)
    const result = await sendFriendRequest(profile.id)
    if (result.error) {
      setMessage(result.error)
    } else {
      setStatus('pending_sent')
      setMessage('Solicitud enviada ✓')
    }
    setLoading(false)
    router.refresh()
  }

  const handleAccept = async () => {
    if (!fId) return
    setLoading(true)
    await respondFriendRequest(fId, 'accepted')
    setStatus('accepted')
    setMessage('¡Ahora son amigos! 🎉')
    setLoading(false)
    router.refresh()
  }

  const handleReject = async () => {
    if (!fId) return
    setLoading(true)
    await respondFriendRequest(fId, 'rejected')
    setStatus('none')
    setFId(null)
    setMessage(null)
    setLoading(false)
    router.refresh()
  }

  const handleRemove = async () => {
    if (!fId) return
    setLoading(true)
    await removeFriend(fId)
    setStatus('none')
    setFId(null)
    setShowRemoveConfirm(false)
    setMessage(null)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="mt-3">
      {message && (
        <div className={`text-xs mb-2 px-2 py-1 rounded ${
          message.includes('error') || message.includes('Error')
            ? 'retro-error'
            : 'retro-success'
        }`}>
          {message}
        </div>
      )}

      {status === 'none' && (
        <button
          onClick={handleSendRequest}
          disabled={loading}
          className="retro-btn retro-btn-primary text-xs"
        >
          {loading ? <span className="retro-spinner w-3 h-3" /> : '👤 Agregar amigo'}
        </button>
      )}

      {status === 'pending_sent' && (
        <button disabled className="retro-btn retro-btn-secondary text-xs opacity-60">
          ✓ Solicitud enviada
        </button>
      )}

      {status === 'pending_received' && (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="retro-btn retro-btn-success text-xs"
          >
            ✅ Aceptar
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="retro-btn retro-btn-danger text-xs"
          >
            ❌ Rechazar
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-700 font-bold">✓ Amigos</span>
          <button
            onClick={() => setShowRemoveConfirm(true)}
            disabled={loading}
            className="retro-btn retro-btn-danger text-xs"
          >
            🗑 Eliminar amigo
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showRemoveConfirm}
        title="Eliminar amigo"
        message={`¿Eliminar a ${profile.display_name || profile.username} de tus amigos?`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleRemove}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </div>
  )
}

function PendingRequestItem({
  request,
  onRespond,
  loading,
}: {
  request: PendingRequest
  onRespond: (response: 'accepted' | 'rejected') => void
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100">
      <Avatar
        username={request.requester.username}
        avatarUrl={request.requester.avatarUrl}
        displayName={request.requester.displayName}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold text-gray-700">
          {request.requester.displayName || request.requester.username}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onRespond('accepted')}
          disabled={loading}
          className="retro-btn retro-btn-success text-xs"
        >
          ✓
        </button>
        <button
          onClick={() => onRespond('rejected')}
          disabled={loading}
          className="retro-btn retro-btn-danger text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
