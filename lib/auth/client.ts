/**
 * Funciones de autenticación cliente.
 * Estas usan fetch a endpoints API.
 */

export async function signIn(username: string, password: string): Promise<{ error?: string }> {
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const data = await res.json()
    return { error: data.error || 'Error al iniciar sesión' }
  }
  return {}
}

export async function signUp(data: {
  password: string
  username: string
  display_name: string
}): Promise<{ error?: string }> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json()
    return { error: body.error || 'Error al registrarse' }
  }
  return {}
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/signout', { method: 'POST' })
}

export async function getCurrentUser(): Promise<{ id: string; username: string; displayName: string; role: string } | null> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) return null
  return res.json()
}
