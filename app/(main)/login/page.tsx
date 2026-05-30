'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from '@/app/api/auth/actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Panel login estilo 2009 */}
        <div className="retro-panel p-0 overflow-hidden shadow-2xl">
          {/* Título */}
          <div className="retro-header px-5 py-3">
            <h1 className="text-white text-base font-bold flex items-center gap-2">
              🔑 Iniciar Sesión
            </h1>
            <p className="text-blue-200 text-xs mt-0.5">
              Accedé a tu cuenta de RetroChat 2009
            </p>
          </div>

          {/* Formulario */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="retro-label" htmlFor="username">
                  👤 Usuario
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className="retro-input"
                  placeholder="Tu nombre de usuario"
                  disabled={isPending}
                />
              </div>

              <div>
                <label className="retro-label" htmlFor="password">
                  🔒 Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="retro-input"
                  placeholder="••••••••"
                  disabled={isPending}
                />
              </div>

              {error && (
                <div className="retro-error">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="retro-btn retro-btn-primary w-full justify-center py-2 text-sm"
              >
                {isPending ? (
                  <>
                    <span className="retro-spinner w-3 h-3" />
                    Entrando...
                  </>
                ) : (
                  '✅ Entrar al chat'
                )}
              </button>
            </form>

            <div className="retro-divider" />

            <p className="text-center text-xs text-gray-600">
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="text-blue-600 hover:underline font-bold">
                ¡Registrate gratis!
              </Link>
            </p>

            {/* Emoticones decorativos */}
            <div className="text-center mt-4 text-base opacity-40">
              😊 😄 :D ;) ❤️ xD
            </div>
          </div>
        </div>

        {/* Tip retro */}
        <div className="mt-3 text-center text-xs text-blue-200 opacity-70">
          💡 Tip: ¿Olvidaste la contraseña? Eso era un problema en 2009 también.
        </div>
      </div>
    </div>
  )
}
