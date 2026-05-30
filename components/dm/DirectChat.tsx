'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { sendDirectMessage, getConversation, markAsRead } from '@/app/api/dm/actions'
import { convertEmoticons, formatMessageTime, isAsciiArt } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { EmojiPicker } from '@/components/chat/EmojiPicker'

interface DirectChatProps {
  currentUser: { id: string; username: string; displayName: string; avatarUrl: string | null }
  otherUser: { id: string; username: string; displayName: string; avatarUrl: string | null }
  initialMessages: any[]
  isPopup: boolean
}

export function DirectChat({ currentUser, otherUser, initialMessages, isPopup }: DirectChatProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base' | 'lg' | 'xl'>('sm')
  const fontSizes = ['xs', 'sm', 'base', 'lg', 'xl'] as const
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll al final
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages])

  // Marcar como leídos al montar
  useEffect(() => {
    markAsRead(otherUser.id)
  }, [otherUser.id])

  // Auto-focus al tipear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key.startsWith('F') && e.key.length <= 3) return
      if (['Escape', 'Tab'].includes(e.key)) return
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // SSE para nuevos mensajes
  useEffect(() => {
    const es = new EventSource('/api/dm/events')
    eventSourceRef.current = es

    es.addEventListener('new_dm', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        // Solo mensajes de esta conversación
        if (
          (data.senderId === otherUser.id) ||
          (data.senderId === currentUser.id)
        ) {
          setMessages(prev => {
            if (prev.find(m => m.id === data.id)) return prev
            return [...prev, {
              id: data.id,
              senderId: data.senderId,
              content: data.content,
              createdAt: data.createdAt,
              sender: { username: data.senderUsername, displayName: data.senderName },
            }]
          })
          markAsRead(otherUser.id)
        }
      } catch {}
    })

    return () => { es.close() }
  }, [otherUser.id, currentUser.id])

  // Enviar mensaje
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const content = inputValue.trim()
    if (!content) return

    setInputValue('')
    setIsSending(true)
    setError(null)

    // Agregar optimistamente al estado local
    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      id: tempId,
      senderId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      sender: { id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName },
    }
    setMessages(prev => [...prev, optimisticMsg])

    const result = await sendDirectMessage(otherUser.id, content)
    if (result.error) {
      setError(result.error)
      setInputValue(content)
      // Remover mensaje optimista fallido
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else if (result.message) {
      // Reemplazar mensaje optimista con el real de la DB
      setMessages(prev => prev.map(m =>
        m.id === tempId ? {
          id: result.message.id,
          senderId: result.message.senderId,
          content: result.message.content,
          createdAt: result.message.createdAt,
          sender: result.message.sender,
        } : m
      ))
    }
    setIsSending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Barra de título MSN-Style */}
      <div className="retro-header px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Avatar username={otherUser.username} avatarUrl={otherUser.avatarUrl}
            displayName={otherUser.displayName} size="sm" />
          <span className="text-white text-xs font-bold">
            💬 Chat con {otherUser.displayName || otherUser.username}
          </span>
        </div>
        <button onClick={() => window.close()}
          className="text-white hover:text-red-200 text-xs font-bold px-2">✕</button>
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={() => {
              const idx = fontSizes.indexOf(fontSize)
              if (idx > 0) setFontSize(fontSizes[idx - 1] as any)
            }}
            disabled={fontSize === 'xs'}
            className="text-white/70 hover:text-white text-xs px-1 disabled:opacity-30"
            title="Letra más chica"
          >A-</button>
          <button
            onClick={() => {
              const idx = fontSizes.indexOf(fontSize)
              if (idx < fontSizes.length - 1) setFontSize(fontSizes[idx + 1] as any)
            }}
            disabled={fontSize === 'xl'}
            className="text-white/70 hover:text-white text-xs px-1 disabled:opacity-30"
            title="Letra más grande"
          >A+</button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-2" style={{
        background: 'linear-gradient(180deg, #f0f4ff 0%, #e8ecf8 50%, #dce4f4 100%)'
      }}>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No hay mensajes todavía.<br />¡Decí hola! 👋
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.senderId === currentUser.id || msg.sender?.id === currentUser.id
            const sender = msg.sender || {}
            const content = convertEmoticons(msg.content)

            return (
              <div key={msg.id} className={`flex mb-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                  <div className="flex-shrink-0 mr-1.5 mt-0.5">
                    <Avatar username={sender.username || otherUser.username}
                      avatarUrl={sender.avatarUrl || otherUser.avatarUrl}
                      displayName={sender.displayName || otherUser.displayName} size="sm" />
                  </div>
                )}
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <span className="text-xs text-gray-500 ml-1">
                      {sender.displayName || sender.username || otherUser.displayName}
                    </span>
                  )}
                  <div className={`px-2.5 py-1.5 rounded-lg ${fontSize === 'xs' ? 'text-xs' : fontSize === 'sm' ? 'text-sm' : fontSize === 'base' ? 'text-base' : fontSize === 'lg' ? 'text-lg' : 'text-xl'} whitespace-pre-wrap break-words ${
                    isAsciiArt(msg.content) ? 'font-mono' : ''
                  } ${
                    isOwn
                      ? 'bg-blue-400 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {content}
                  </div>
                  <div className={`text-xs text-gray-400 mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatMessageTime(msg.createdAt || msg.created_at)}
                  </div>
                </div>
                {isOwn && (
                  <div className="flex-shrink-0 ml-1.5 mt-0.5">
                    <Avatar username={currentUser.username} avatarUrl={currentUser.avatarUrl}
                      displayName={currentUser.displayName} size="sm" />
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1 flex-shrink-0">
          <div className="retro-error text-xs flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-bar flex-shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <EmojiPicker onSelect={(code) => {
            setInputValue(prev => prev + ' ' + code + ' ')
          }} />
          <textarea
            ref={inputRef as any}
            className="retro-input flex-1 text-xs resize-none"
            rows={1}
            placeholder={`Mensaje a ${otherUser.displayName || otherUser.username}...`}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={isSending}
            autoFocus
          />
          <button
            type="submit"
            className="retro-btn retro-btn-primary text-xs"
            disabled={isSending || !inputValue.trim()}
          >
            {isSending ? <span className="retro-spinner w-3 h-3" /> : '➤'}
          </button>
        </form>
        <div className="text-xs text-gray-400 mt-0.5">
          {inputValue.length > 0 ? `${inputValue.length}/5000` : '😊 :D :P xD ;) ❤️'}
        </div>
      </div>
    </div>
  )
}
