'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendMessage, deleteMessage, loadMoreMessages, reportContent, blockUser } from '@/app/api/messages/actions'
import { joinRoom, leaveRoom, banUser, promoteToModerator, closeRoom } from '@/app/api/rooms/actions'
import { convertEmoticons, formatMessageTime, formatRelativeTime, parseCommand, isAsciiArt } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmojiPicker } from '@/components/chat/EmojiPicker'
import { getCurrentUser } from '@/lib/auth/client'
import { playMsnBuzz } from '@/lib/audio'
import type { UserStatus } from '@/types'
import { USER_STATUSES } from '@/types'

interface ChatRoomProps {
  room: any
  currentMember: any | null
  initialMembers: any[]
  initialMessages: any[]
  currentUser: any | null
  blockedUsers: string[]
}

const BUZZ_COOLDOWN_MS = 30000

export function ChatRoom({
  room,
  currentMember: initialMember,
  initialMembers,
  initialMessages,
  currentUser,
  blockedUsers: initialBlockedUsers,
}: ChatRoomProps) {
  const router = useRouter()

  // Estado
  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [members, setMembers] = useState<any[]>(initialMembers)
  const [currentMember, setCurrentMember] = useState(initialMember)
  const [blockedUsers, setBlockedUsers] = useState<string[]>(initialBlockedUsers)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [hasMoreMessages, setHasMoreMessages] = useState(initialMessages.length === 30)
  const [loadingMore, setLoadingMore] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base' | 'lg' | 'xl'>('sm')

  const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl'] as const
  const fontSizeClass = (size: typeof fontSizes[number]) =>
    size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : size === 'base' ? 'text-base' : size === 'lg' ? 'text-lg' : 'text-xl'
  const [needsPassword] = useState(room.is_private && !initialMember)
  const [joiningRoom, setJoiningRoom] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [buzzCooldown, setBuzzCooldown] = useState(false)
  const [buzzing, setBuzzing] = useState(false)
  const [localClearCount, setLocalClearCount] = useState(0)
  const [showRules, setShowRules] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; message: any
  } | null>(null)
  const [reportDialog, setReportDialog] = useState<{ messageId?: string; userId?: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [confirmBan, setConfirmBan] = useState<{ userId: string; username: string } | null>(null)
  const [showCloseRoomConfirm, setShowCloseRoomConfirm] = useState(false)
  const [closeRoomError, setCloseRoomError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isAtBottomRef = useRef(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom
  const scrollToBottom = useCallback((force = false) => {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50
  }, [])

  // Inicializar SSE + presencia
  useEffect(() => {
    if (!currentUser || !currentMember) return

    setupSSE()
    updatePresence()

    return () => {
      cleanupSSE()
      cleanupPresence()
    }
  }, [currentUser?.id, currentMember?.id, room.id])

  useEffect(() => {
    scrollToBottom(true)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // ─── SSE para mensajes en tiempo real ───────────────────────

  const setupSSE = useCallback(() => {
    const lastMsg = messages[messages.length - 1]
    const since = lastMsg?.id || ''
    const es = new EventSource(`/api/rooms/${room.id}/events?since=${since}`)
    eventSourceRef.current = es

    es.addEventListener('new_message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data)
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        scrollToBottom()
      } catch {}
    })

    es.addEventListener('message_deleted', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setMessages(prev => prev.map(m =>
          m.id === data.id ? { ...m, deleted_at: data.deletedAt } : m
        ))
      } catch {}
    })

    es.addEventListener('buzz', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data.userId !== currentUser?.id) {
          // Recibir zumbido de otro usuario
          setBuzzing(true)
          setTimeout(() => setBuzzing(false), 1000)
          playMsnBuzz()
          const buzzMsg = {
            id: `buzz-${Date.now()}`,
            content: `🔔 ¡${data.username} envió un zumbido!`,
            is_system: true,
            created_at: new Date().toISOString(),
            user_id: null,
            profiles: null,
          }
          setMessages(prev => [...prev, buzzMsg])
        }
      } catch {}
    })

    es.onerror = () => {
      // Reconectar automáticamente
      es.close()
      setTimeout(setupSSE, 3000)
    }
  }, [room.id, messages.length])

  const cleanupSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // ─── Presencia via heartbeat ────────────────────────────────

  const updatePresence = useCallback(async () => {
    await fetch(`/api/rooms/${room.id}/presence`, { method: 'POST' })

    heartbeatIntervalRef.current = setInterval(async () => {
      await fetch(`/api/rooms/${room.id}/presence`, { method: 'POST' })
    }, 60000)
  }, [room.id])

  const cleanupPresence = useCallback(async () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    await fetch(`/api/rooms/${room.id}/presence`, { method: 'DELETE' })
  }, [room.id])

  // ─── Unirse a la sala ───────────────────────────────────────

  const handleJoinRoom = async () => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    setJoiningRoom(true)
    setJoinError(null)

    const result = await joinRoom(room.id, needsPassword ? passwordInput : undefined)

    if (result.error) {
      setJoinError(result.error)
      setJoiningRoom(false)
      return
    }

    router.refresh()
    setJoiningRoom(false)
  }

  // ─── Enviar mensaje ─────────────────────────────────────────

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()

    const content = inputValue.trim()
    if (!content) return
    if (!currentUser || !currentMember) return

    setInputValue('')

    const { isCommand, command, args } = parseCommand(content)

    if (isCommand) {
      if (command === 'clear') {
        setLocalClearCount(c => c + 1)
        return
      }
      if (command === 'rules') {
        setShowRules(true)
        return
      }
      if (command === 'me' && args) {
        setIsSending(true)
        await sendMessage(room.id, `* ${args}`)
        setIsSending(false)
        return
      }
      if (command === 'msg' && args) {
        const spaceIndex = args.indexOf(' ')
        const targetUser = spaceIndex > 0 ? args.slice(0, spaceIndex) : args
        const msgText = spaceIndex > 0 ? args.slice(spaceIndex + 1) : ''
        // Abrir popup
        const popup = window.open(
          `/messages/${targetUser}?popup=1`,
          `dm-${targetUser}`,
          'width=400,height=500'
        )
        if (popup && msgText) {
          // Enviar el mensaje via fetch (no podemos usar server action desde otra ventana)
          // El popup cargará y el usuario verá el input — el mensaje se envía al abrir
        }
        return
      }
    }

    setIsSending(true)
    setError(null)

    const result = await sendMessage(room.id, content)
    if (result.error) {
      setError(result.error)
      setInputValue(content)
    }

    setIsSending(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // ─── Zumbido ────────────────────────────────────────────────

  const handleBuzz = () => {
    if (!currentUser || buzzCooldown) return

    setBuzzCooldown(true)
    setTimeout(() => setBuzzCooldown(false), BUZZ_COOLDOWN_MS)

    fetch(`/api/rooms/${room.id}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'buzz', userId: currentUser.id, username: currentUser.username || 'Alguien' }),
    })

    setBuzzing(true)
    setTimeout(() => setBuzzing(false), 1000)
    playMsnBuzz()

    const buzzMsg = {
      id: `buzz-sent-${Date.now()}`,
      content: '🔔 Enviaste un zumbido!',
      is_system: true,
      created_at: new Date().toISOString(),
      user_id: null,
      profiles: null,
    }
    setMessages(prev => [...prev, buzzMsg])
  }

  // ─── Eliminar mensaje ───────────────────────────────────────

  const handleDeleteMessage = async (messageId: string) => {
    const result = await deleteMessage(messageId)
    if (result.error) setError(result.error)
  }

  // ─── Cargar más mensajes ────────────────────────────────────

  const handleLoadMore = async () => {
    if (!messages.length || loadingMore) return
    setLoadingMore(true)
    const oldestId = messages[0]?.id
    if (!oldestId) return

    const result = await loadMoreMessages(room.id, oldestId)
    if (result.messages) {
      const prevScrollHeight = messagesContainerRef.current?.scrollHeight || 0
      setMessages(prev => [...(result.messages || []), ...prev])
      setHasMoreMessages((result.messages || []).length === 30)

      requestAnimationFrame(() => {
        const container = messagesContainerRef.current
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight
        }
      })
    }
    setLoadingMore(false)
  }

  // ─── Reportar ───────────────────────────────────────────────

  const handleReport = async () => {
    if (!reportDialog || !reportReason.trim()) return
    await reportContent({
      reportedUserId: reportDialog.userId,
      messageId: reportDialog.messageId,
      roomId: room.id,
      reason: reportReason,
    })
    setReportDialog(null)
    setReportReason('')
  }

  // ─── Banear ─────────────────────────────────────────────────

  const handleBan = async () => {
    if (!confirmBan) return
    await banUser(room.id, confirmBan.userId, 'Expulsado por moderador')
    setConfirmBan(null)
  }

  // ─── Cerrar sala ────────────────────────────────────────────

  const handleCloseRoom = async () => {
    setCloseRoomError(null)
    const result = await closeRoom(room.id)
    if (result.error) {
      setCloseRoomError(result.error)
      setShowCloseRoomConfirm(false)
    } else {
      router.push('/rooms')
    }
  }

  // ─── Bloquear ───────────────────────────────────────────────

  const handleBlock = async (userId: string) => {
    await blockUser(userId)
    setBlockedUsers(prev => [...prev, userId])
  }

  const canModerate = currentMember?.role === 'moderator' || currentMember?.role === 'owner'
  const isOwner = currentMember?.role === 'owner'

  // Filtrar mensajes
  const visibleMessages = messages.filter((_msg, idx) => {
    if (localClearCount > 0 && idx < messages.length - 50) return false
    return true
  })

  // ─── Pantalla de acceso ─────────────────────────────────────

  if (!currentMember || (room.is_private && !currentMember && needsPassword)) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <div className="retro-panel max-w-sm w-full overflow-hidden shadow-2xl">
          <div className="retro-header px-5 py-3">
            <h1 className="text-white font-bold">
              {room.is_private ? '🔒 Sala Privada' : '🌐'} {room.name}
            </h1>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">{room.description}</p>

            {!currentUser ? (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Necesitás iniciar sesión para entrar a esta sala.
                </p>
                <Link href="/login" className="retro-btn retro-btn-primary text-sm">
                  Iniciar sesión
                </Link>
              </div>
            ) : room.is_private && !currentMember ? (
              <>
                {room.password_hash && (
                  <div className="mb-4">
                    <label className="retro-label">🔑 Contraseña de la sala</label>
                    <input
                      type="password"
                      className="retro-input"
                      placeholder="Ingresá la contraseña"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                    />
                  </div>
                )}
                {joinError && <div className="retro-error mb-3">⚠️ {joinError}</div>}
                <button
                  onClick={handleJoinRoom}
                  disabled={joiningRoom}
                  className="retro-btn retro-btn-primary w-full justify-center"
                >
                  {joiningRoom ? 'Entrando...' : '➡️ Entrar a la sala'}
                </button>
              </>
            ) : (
              <>
                {joinError && <div className="retro-error mb-3">⚠️ {joinError}</div>}
                <button
                  onClick={handleJoinRoom}
                  disabled={joiningRoom}
                  className="retro-btn retro-btn-primary w-full justify-center"
                >
                  {joiningRoom ? (
                    <><span className="retro-spinner w-3 h-3" /> Entrando...</>
                  ) : '➡️ Entrar a la sala'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Vista principal del chat ───────────────────────────────

  return (
    <div
      className={`flex h-[calc(100vh-80px)] ${buzzing ? 'animate-pulse' : ''}`}
      style={buzzing ? { animation: 'buzz 0.1s ease-in-out 8' } : {}}
      onClick={() => setContextMenu(null)}
    >
      {/* Panel principal del chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header de sala */}
        <div className="retro-panel rounded-none border-x-0 border-t-0 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{room.is_private ? '🔒' : '🌐'}</span>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-gray-800 truncate">{room.name}</h1>
              <p className="text-xs text-gray-500 truncate">{room.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Tamaño letra */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  const idx = fontSizes.indexOf(fontSize)
                  if (idx > 0) setFontSize(fontSizes[idx - 1])
                }}
                disabled={fontSize === 'xs'}
                className="retro-btn retro-btn-secondary text-xs px-1.5"
                title="Letra más chica"
              >A-</button>
              <span className="text-xs text-gray-500 w-4 text-center">{fontSize === 'xs' ? 'xs' : fontSize === 'sm' ? 's' : fontSize === 'base' ? 'm' : fontSize === 'lg' ? 'l' : 'xl'}</span>
              <button
                onClick={() => {
                  const idx = fontSizes.indexOf(fontSize)
                  if (idx < fontSizes.length - 1) setFontSize(fontSizes[idx + 1])
                }}
                disabled={fontSize === 'xl'}
                className="retro-btn retro-btn-secondary text-xs px-1.5"
                title="Letra más grande"
              >A+</button>
            </div>
            <button
              onClick={handleBuzz}
              disabled={buzzCooldown || !currentMember}
              className={`retro-btn retro-btn-buzz text-xs ${buzzing ? 'buzzing' : ''}`}
              title={buzzCooldown ? 'Cooldown de 30 segundos' : 'Enviar zumbido'}
            >
              🔔 {buzzCooldown ? '...' : 'Zumbido'}
            </button>

            {!isOwner && (
              <button
                onClick={async () => {
                  await leaveRoom(room.id)
                  router.push('/rooms')
                }}
                className="retro-btn retro-btn-secondary text-xs"
                title="Salir de la sala"
              >
                🚪 Salir
              </button>
            )}

            {isOwner && (
              <>
                <Link href={`/rooms/${room.id}/settings`} className="retro-btn retro-btn-secondary text-xs">
                  ⚙️ Configurar
                </Link>
                <button
                  onClick={() => setShowCloseRoomConfirm(true)}
                  className="retro-btn retro-btn-danger text-xs"
                  title="Cerrar sala definitivamente"
                >
                  🔒 Cerrar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mensajes */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-2"
          style={{ background: 'linear-gradient(180deg, #f0f4ff 0%, #e8ecf8 100%)' }}
          onScroll={handleScroll}
        >
          {hasMoreMessages && (
            <div className="text-center py-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="retro-btn retro-btn-secondary text-xs"
              >
                {loadingMore ? (
                  <><span className="retro-spinner w-3 h-3" /> Cargando...</>
                ) : '↑ Cargar mensajes anteriores'}
              </button>
            </div>
          )}

          {visibleMessages.map((msg, idx) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUser?.id}
              canModerate={canModerate}
              isBlocked={blockedUsers.includes(msg.user_id)}
              onDelete={() => handleDeleteMessage(msg.id)}
              onReport={(msgId, userId) => setReportDialog({ messageId: msgId, userId })}
              onBlock={(userId) => handleBlock(userId)}
              onBan={(userId, username) => setConfirmBan({ userId, username })}
              onContextMenu={(x, y, message) => setContextMenu({ x, y, message })}
              isNew={idx >= visibleMessages.length - 5}
              fontSize={fontSize}
            />
          ))}

          {typingUsers.size > 0 && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              <span>
                {Array.from(typingUsers).slice(0, 2).join(', ')}
                {typingUsers.size > 2 ? ` y ${typingUsers.size - 2} más` : ''}
                {' '}está{typingUsers.size > 1 ? 'n' : ''} escribiendo…
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-1">
            <div className="retro-error flex items-center justify-between">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
            </div>
          </div>
        )}

        {/* Input de mensaje */}
        <div className="chat-input-bar flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <EmojiPicker onSelect={(code) => {
              setInputValue(prev => prev + ' ' + code + ' ')
            }} />
            <textarea
              ref={inputRef}
              className="retro-input flex-1 resize-none"
              rows={1}
              placeholder={currentMember
                ? 'Escribí un mensaje... (Shift+Enter para nueva línea)'
                : 'Únete a la sala para escribir'
              }
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={isSending || !currentMember}
              autoFocus
            />
            <button
              type="submit"
              className="retro-btn retro-btn-primary text-xs"
              disabled={isSending || !inputValue.trim() || !currentMember}
            >
              {isSending ? (
                <span className="retro-spinner w-3 h-3" />
              ) : '➤ Enviar'}
            </button>
          </form>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-gray-400">
              {inputValue.length > 0 && `${inputValue.length}/5000`}
              {inputValue.length === 0 && '😊 :D :P xD ;) :( ❤️ • /me /clear /rules'}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar de usuarios */}
      <UsersSidebar
        members={members}
        currentUserId={currentUser?.id}
        room={room}
        canModerate={canModerate}
        isOwner={isOwner}
        onBan={(userId, username) => setConfirmBan({ userId, username })}
        onPromote={async (userId) => {
          await promoteToModerator(room.id, userId)
          router.refresh()
        }}
        onBlock={handleBlock}
      />

      {/* Context menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          currentUserId={currentUser?.id}
          canModerate={canModerate}
          onDelete={() => {
            handleDeleteMessage(contextMenu.message.id)
            setContextMenu(null)
          }}
          onReport={() => {
            setReportDialog({ messageId: contextMenu.message.id, userId: contextMenu.message.user_id })
            setContextMenu(null)
          }}
          onBlock={() => {
            handleBlock(contextMenu.message.user_id)
            setContextMenu(null)
          }}
          onBan={() => {
            setConfirmBan({
              userId: contextMenu.message.user_id,
              username: contextMenu.message.profiles?.username || 'usuario',
            })
            setContextMenu(null)
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Dialog de reporte */}
      {reportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReportDialog(null)} />
          <div className="relative retro-panel max-w-sm w-full mx-4 p-5">
            <div className="retro-header -m-5 mb-4 px-4 py-2 rounded-t-lg">
              <span className="text-white text-xs font-bold">🚨 Reportar contenido</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="retro-label">Motivo del reporte</label>
                <textarea
                  className="retro-input retro-textarea"
                  placeholder="Explicá el problema (mínimo 5 caracteres)"
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReportDialog(null)} className="retro-btn retro-btn-secondary text-xs flex-1">
                  Cancelar
                </button>
                <button onClick={handleReport} className="retro-btn retro-btn-danger text-xs flex-1">
                  Reportar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de ban */}
      <ConfirmDialog
        isOpen={!!confirmBan}
        title="⚠️ Expulsar usuario"
        message={`¿Expulsar a ${confirmBan?.username} de esta sala? No podrán volver a entrar.`}
        confirmLabel="Expulsar"
        danger
        onConfirm={handleBan}
        onCancel={() => setConfirmBan(null)}
      />

      {/* Dialog cerrar sala */}
      <ConfirmDialog
        isOpen={showCloseRoomConfirm}
        title="⚠️ ¿Cerrar esta sala?"
        message="La sala se cerrará permanentemente. Nadie más podrá entrar ni enviar mensajes. Esta acción no se puede deshacer."
        confirmLabel="Cerrar sala"
        danger
        onConfirm={handleCloseRoom}
        onCancel={() => setShowCloseRoomConfirm(false)}
      />

      {/* Rules overlay */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRules(false)} />
          <div className="relative retro-panel max-w-sm w-full mx-4 p-5">
            <div className="retro-header -m-5 mb-4 px-4 py-2 rounded-t-lg">
              <span className="text-white text-xs font-bold">📋 Reglas de {room.name}</span>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Respeto ante todo. Sin insultos ni discriminación.</li>
              <li>No spam ni publicidad no solicitada.</li>
              <li>Contenido apropiado para la categoría de la sala.</li>
              <li>El moderador tiene la última palabra.</li>
              <li>Los reportes son anónimos y se revisan en 24hs.</li>
            </ul>
            <button onClick={() => setShowRules(false)} className="retro-btn retro-btn-primary text-xs w-full mt-4">
              Entendido ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────

function MessageItem({
  message,
  currentUserId,
  canModerate,
  isBlocked,
  onDelete,
  onReport,
  onBlock,
  onBan,
  onContextMenu,
  isNew,
  fontSize = 'sm' as 'xs' | 'sm' | 'base' | 'lg' | 'xl',
}: {
  message: any
  currentUserId: string | null
  canModerate: boolean
  isBlocked: boolean
  onDelete: () => void
  onReport: (messageId: string, userId: string) => void
  onBlock: (userId: string) => void
  onBan: (userId: string, username: string) => void
  onContextMenu: (x: number, y: number, message: any) => void
  isNew: boolean
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
}) {
  if (message.is_system) {
    return <div className="chat-message system">{message.content}</div>
  }

  if (isBlocked) {
    return <div className="chat-message deleted">[Mensaje de usuario bloqueado]</div>
  }

  if (message.deleted_at) {
    return <div className="chat-message deleted">[Mensaje eliminado]</div>
  }

  const isOwn = message.user_id === currentUserId
  const content = convertEmoticons(message.content)
  const profile = message.profile || message.profiles

  return (
    <div
      className={`chat-message ${isOwn ? 'own' : ''} ${isNew ? 'message-new' : ''} group relative`}
      onContextMenu={(e) => {
        e.preventDefault()
        if (!isOwn && message.user_id) {
          onContextMenu(e.clientX, e.clientY, message)
        }
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          <Avatar
            username={profile?.username || 'sistema'}
            avatarUrl={profile?.avatarUrl || profile?.avatar_url}
            displayName={profile?.displayName || profile?.display_name}
            size="sm"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-bold text-xs ${isOwn ? 'text-blue-700' : 'text-gray-700'}`}>
              {profile?.displayName || profile?.display_name || profile?.username || 'Sistema'}
            </span>
            <span className="text-gray-400 text-xs">
              {formatMessageTime(message.createdAt || message.created_at)}
            </span>
          </div>

          <div className={`${fontSize === 'xs' ? 'text-xs' : fontSize === 'sm' ? 'text-sm' : fontSize === 'base' ? 'text-base' : fontSize === 'lg' ? 'text-lg' : 'text-xl'} text-gray-800 whitespace-pre-wrap break-words ${
            isAsciiArt(message.content) ? 'font-mono' : ''
          }`}>
            {content}
          </div>
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {(isOwn || canModerate) && (
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-600 px-1 py-0.5 rounded hover:bg-red-50"
              title="Eliminar mensaje"
            >
              🗑
            </button>
          )}
          {!isOwn && message.user_id && (
            <button
              onClick={() => onReport(message.id, message.user_id)}
              className="text-xs text-orange-400 hover:text-orange-600 px-1 py-0.5 rounded hover:bg-orange-50"
              title="Reportar"
            >
              🚨
            </button>
          )}
          {!isOwn && message.user_id && canModerate && (
            <button
              onClick={() => onBan(message.user_id, profile?.username || 'usuario')}
              className="text-xs text-purple-400 hover:text-purple-600 px-1 py-0.5 rounded hover:bg-purple-50"
              title="Expulsar"
            >
              🔨
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageContextMenu({
  x, y, message, currentUserId, canModerate,
  onDelete, onReport, onBlock, onBan, onClose,
}: any) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 retro-panel py-1 min-w-36 shadow-xl"
        style={{ left: x, top: y, transform: 'translateY(-100%)' }}
      >
        {(message.user_id === currentUserId || canModerate) && (
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 w-full text-left"
          >
            🗑️ Eliminar mensaje
          </button>
        )}
        {message.user_id !== currentUserId && (
          <>
            <button
              onClick={onReport}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 w-full text-left"
            >
              🚨 Reportar usuario
            </button>
            <button
              onClick={onBlock}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 w-full text-left"
            >
              🚫 Bloquear usuario
            </button>
            {canModerate && (
              <button
                onClick={onBan}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-purple-600 hover:bg-purple-50 w-full text-left"
              >
                🔨 Expulsar de la sala
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}

function UsersSidebar({
  members,
  currentUserId,
  room,
  canModerate,
  isOwner,
  onBan,
  onPromote,
  onBlock,
}: {
  members: any[]
  currentUserId?: string
  room: any
  canModerate: boolean
  isOwner: boolean
  onBan: (userId: string, username: string) => void
  onPromote: (userId: string) => void
  onBlock: (userId: string) => void
}) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  return (
    <div className="users-sidebar flex flex-col hidden md:flex">
      <div className="retro-section-title mx-2 mt-2">
        👥 Usuarios ({members.length})
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {members.map(member => {
          const profile = member.profile || member.profiles
          if (!profile) return null

          const isCurrentUser = profile.id === currentUserId
          const roleEmoji = member.role === 'owner' ? '👑' : member.role === 'moderator' ? '🛡️' : ''

          return (
            <div key={member.id}>
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-blue-100/50 transition-colors ${isCurrentUser ? 'bg-blue-50' : ''}`}
                onClick={() => setExpandedUser(expandedUser === profile.id ? null : profile.id)}
              >
                <Avatar
                  username={profile.username}
                  avatarUrl={profile.avatarUrl || profile.avatar_url}
                  status={profile.status}
                  size="sm"
                  showStatus
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {roleEmoji && <span className="text-xs">{roleEmoji}</span>}
                    <span className="text-xs font-bold text-gray-700 truncate">
                      {profile.displayName || profile.display_name || profile.username}
                    </span>
                    {isCurrentUser && <span className="text-xs text-blue-500">(tú)</span>}
                  </div>
                </div>
              </div>

              {expandedUser === profile.id && !isCurrentUser && (
                <div className="ml-8 space-y-0.5 mb-1">
                  <button
                    onClick={() => {
                      window.open(
                        `/messages/${profile.username}?popup=1`,
                        `dm-${profile.username}`,
                        'width=400,height=500'
                      )
                    }}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:underline px-2 py-0.5 w-full text-left"
                  >
                    💬 Mensaje privado
                  </button>
                  <Link
                    href={`/profile/${profile.username}`}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline px-2 py-0.5"
                  >
                    👤 Ver perfil
                  </Link>
                  <button
                    onClick={() => onBlock(profile.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-0.5 w-full text-left"
                  >
                    🚫 Bloquear
                  </button>
                  {canModerate && (
                    <>
                      <button
                        onClick={() => onBan(profile.id, profile.username)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-0.5 w-full text-left"
                      >
                        🔨 Expulsar
                      </button>
                      {isOwner && member.role === 'member' && (
                        <button
                          onClick={() => onPromote(profile.id)}
                          className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 px-2 py-0.5 w-full text-left"
                        >
                          🛡️ Hacer mod
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {members.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-400">
            Nadie por aquí...
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 mt-auto">
        <div className="text-xs text-gray-400 text-center">
          💬 {room.name}
          <br />
          📅 {formatRelativeTime(room.created_at || room.createdAt)}
        </div>
      </div>
    </div>
  )
}
