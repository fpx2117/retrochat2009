'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth/client'
import { getPendingRequestCount } from '@/app/api/friends/actions'
import { getUnreadCount } from '@/app/api/dm/actions'
import { playMsnBeep } from '@/lib/audio'
import type { UserStatus } from '@/types'
import { getDefaultAvatar } from '@/lib/utils'
import { USER_STATUSES } from '@/types'

interface HeaderUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  status: string
  role: string
}

export function Header() {
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadDMs, setUnreadDMs] = useState(0)
  const [dmNotification, setDmNotification] = useState<{ from: string; username: string } | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const loadUser = async () => {
      const u = await getCurrentUser()
      setUser(u as any)
      setLoading(false)
    }
    loadUser()
  }, [pathname])

  useEffect(() => {
    if (!user) return
    const loadPending = async () => {
      const result = await getPendingRequestCount()
      if (result.count !== undefined) setPendingCount(result.count)
      const dmResult = await getUnreadCount()
      if (dmResult.count !== undefined) setUnreadDMs(dmResult.count)
    }
    loadPending()
  }, [user, pathname])

  const handleLogout = async () => {
    await signOut()
    setMenuOpen(false)
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const statusInfo = user ? USER_STATUSES[(user.status as UserStatus) || 'online'] : null

  return (
    <header className="retro-header sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="retro-logo text-xl hover:opacity-90 transition-opacity">
          💬 RetroChat 2009
        </Link>

        {/* Navegación central */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/rooms"
            className="text-blue-100 hover:text-white hover:bg-white/10 px-3 py-1 rounded text-xs font-bold transition-all"
          >
            🏠 Salas
          </Link>
          {user && (
            <Link
              href="/rooms/new"
              className="text-blue-100 hover:text-white hover:bg-white/10 px-3 py-1 rounded text-xs font-bold transition-all"
            >
              ✨ Crear sala
            </Link>
          )}
        </nav>

        {/* Usuario */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="retro-spinner w-4 h-4" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-all border border-white/20"
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={user.avatarUrl || getDefaultAvatar(user.username)}
                    alt={user.displayName}
                    className="w-7 h-7 retro-avatar"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getDefaultAvatar(user.username)
                    }}
                  />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 status-dot"
                    style={{ background: USER_STATUSES[(user.status || 'online') as UserStatus].color }}
                    title={USER_STATUSES[(user.status || 'online') as UserStatus].label}
                  />
                </div>
                <span className="text-white text-xs font-bold hidden sm:block max-w-20 truncate">
                  {user.displayName}
                </span>
                <span className="text-blue-200 text-xs">▼</span>
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 retro-panel z-50 shadow-xl py-1">
                    {/* Info usuario */}
                    <div className="px-3 py-2 border-b border-gray-200">
                      <div className="flex items-center gap-1 text-xs">
                        <span>{statusInfo?.emoji}</span>
                        <span className="font-bold text-gray-700 truncate">{user.username}</span>
                      </div>
                      <div className="text-xs text-gray-500">{statusInfo?.label}</div>
                    </div>

                    <Link
                      href={`/profile/${user.username}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      👤 Mi perfil
                      {pendingCount > 0 && (
                        <span className="retro-badge ml-auto text-xs" style={{
                          background: 'linear-gradient(180deg, #cc0000 0%, #990000 100%)',
                          color: '#fff', padding: '0 6px', borderRadius: '8px', fontSize: '10px'
                        }}>
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/messages"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      💬 Mensajes
                      {unreadDMs > 0 && (
                        <span className="retro-badge ml-auto text-xs" style={{
                          background: 'linear-gradient(180deg, #0078d4 0%, #005a9e 100%)',
                          color: '#fff', padding: '0 6px', borderRadius: '8px', fontSize: '10px'
                        }}>
                          {unreadDMs}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      ⚙️ Configuración
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        🛡️ Panel Admin
                      </Link>
                    )}
                    <div className="border-t border-gray-200 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                      >
                        🚪 Salir
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="retro-btn retro-btn-secondary text-xs">
                Entrar
              </Link>
              <Link href="/register" className="retro-btn retro-btn-primary text-xs">
                Registrarse ✨
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Barra de notificación MSN */}
      {dmNotification && (
        <div className="px-4 py-1.5 flex items-center justify-between gap-3 text-xs"
          style={{ background: 'linear-gradient(180deg, #fff9c4 0%, #fff176 100%)', borderBottom: '1px solid #f9a825' }}>
          <span className="text-gray-800 font-bold">
            ✉️ <strong>{dmNotification.from}</strong> te ha enviado un mensaje
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => {
                window.open(
                  `/messages/${dmNotification.username}?popup=1`,
                  `dm-${dmNotification.username}`,
                  'width=400,height=500'
                )
                setDmNotification(null)
                setUnreadDMs(prev => Math.max(0, prev - 1))
              }}
              className="retro-btn retro-btn-primary text-xs"
            >
              Responder
            </button>
            <button
              onClick={() => setDmNotification(null)}
              className="text-gray-500 hover:text-gray-800 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Barra decorativa */}
      <div className="bg-black/20 px-4 py-0.5 text-center">
        <span className="text-blue-200 text-xs opacity-70">
          ★ Bienvenido a RetroChat 2009 - El chat más retro de internet ★
        </span>
      </div>
    </header>
  )
}
