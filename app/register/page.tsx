'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp, checkUsernameAvailable } from '@/app/api/auth/actions'
import { validateUsername } from '@/lib/utils'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameTimeout, setUsernameTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim().toLowerCase()

    if (usernameTimeout) clearTimeout(usernameTimeout)

    if (!value) {
      setUsernameStatus('idle')
      return
    }

    const validationError = validateUsername(value)
    if (validationError) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')
    const timeout = setTimeout(async () => {
      const available = await checkUsernameAvailable(value)
      setUsernameStatus(available ? 'available' : 'taken')
    }, 500)
    setUsernameTimeout(timeout)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (usernameStatus === 'taken') {
      setError('Ese nombre de usuario ya está en uso')
      return
    }
    if (usernameStatus === 'invalid') {
      setError('El nombre de usuario no es válido')
      return
    }

    const formData = new FormData(e.currentTarget)

    const password = formData.get('password') as string
    const confirm = formData.get('confirm_password') as string

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    startTransition(async () => {
      const result = await signUp(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <div className="retro-panel p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">¡Bienvenido/a a RetroChat!</h2>
          <p className="text-sm text-gray-600 mb-4">
            ¡Tu cuenta fue creada! Ya podés chatear con el mundo.
          </p>
          <div className="text-2xl opacity-50 mb-4">😊 :D ❤️ xD</div>
          <Link href="/login" className="retro-btn retro-btn-primary text-sm">
            Ir al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="retro-panel p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="retro-header px-5 py-3">
            <h1 className="text-white text-base font-bold flex items-center gap-2">
              ✨ Crear mi cuenta
            </h1>
            <p className="text-blue-200 text-xs mt-0.5">
              Gratis y rápido. Promesa de 2009.
            </p>
          </div>

          {/* Formulario */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Username */}
              <div>
                <label className="retro-label" htmlFor="username">
                  🏷️ Nombre de usuario
                </label>
                <div className="relative">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className="retro-input pr-8"
                    placeholder="mi_nombre_retro"
                    onChange={handleUsernameChange}
                    disabled={isPending}
                    maxLength={20}
                  />
                  {/* Estado del username */}
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {usernameStatus === 'checking' && <span className="retro-spinner w-3 h-3 inline-block" />}
                    {usernameStatus === 'available' && <span className="text-green-600">✓</span>}
                    {usernameStatus === 'taken' && <span className="text-red-500">✗</span>}
                    {usernameStatus === 'invalid' && <span className="text-orange-500">!</span>}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {usernameStatus === 'available' && <span className="text-green-600">✓ Disponible</span>}
                  {usernameStatus === 'taken' && <span className="text-red-500">✗ Ya está en uso</span>}
                  {usernameStatus === 'invalid' && <span className="text-orange-500">Solo letras, números y _</span>}
                  {usernameStatus === 'idle' && '3-20 caracteres, solo letras, números y _'}
                </p>
              </div>

              {/* Display name */}
              <div>
                <label className="retro-label" htmlFor="display_name">
                  😊 Nombre visible
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  type="text"
                  required
                  className="retro-input"
                  placeholder="Como te llaman tus amigos"
                  disabled={isPending}
                  maxLength={30}
                />
              </div>

              {/* Password */}
              <div>
                <label className="retro-label" htmlFor="password">
                  🔒 Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="retro-input"
                  placeholder="Mínimo 6 caracteres"
                  disabled={isPending}
                  minLength={6}
                />
              </div>

              {/* Confirm password */}
              <div>
                <label className="retro-label" htmlFor="confirm_password">
                  🔒 Confirmar contraseña
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="retro-input"
                  placeholder="Repetí la contraseña"
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
                disabled={isPending || usernameStatus === 'taken' || usernameStatus === 'invalid'}
                className="retro-btn retro-btn-primary w-full justify-center py-2 text-sm mt-2"
              >
                {isPending ? (
                  <>
                    <span className="retro-spinner w-3 h-3" />
                    Registrando...
                  </>
                ) : (
                  '🚀 ¡Crear mi cuenta!'
                )}
              </button>
            </form>

            <div className="retro-divider" />

            <p className="text-center text-xs text-gray-600">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-bold">
                Iniciá sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
