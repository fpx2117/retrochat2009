import { EMOTICONS } from '@/types'

/**
 * Sanitiza el contenido de un mensaje: elimina HTML potencialmente peligroso
 * y convierte caracteres especiales a entidades HTML.
 * NO usa DOMPurify en servidor (solo cliente), usa escape manual server-side.
 */
/**
 * Sanitiza el contenido de un mensaje: trim y límite de longitud.
 * React escapa XSS automáticamente al renderizar {text}.
 * Para ASCII art, se preserva el texto crudo.
 */
export function sanitizeMessage(content: string): string {
  const trimmed = content.trim().slice(0, 5000)
  if (isAsciiArt(trimmed)) return trimmed
  return trimmed
}

/**
 * Convierte emoticones de texto a emojis unicode
 */
export function convertEmoticons(text: string): string {
  // No convertir emoticones en ASCII art
  if (isAsciiArt(text)) return text
  return convertEmoticonsOnly(text)
}

function convertEmoticonsOnly(text: string): string {
  let result = text
  const sorted = Object.entries(EMOTICONS).sort(([a], [b]) => b.length - a.length)
  for (const [emoticon, emoji] of sorted) {
    const escaped = emoticon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), emoji)
  }
  return result
}

/**
 * Procesa mensaje para display: URLs cliqueables, emoticones en texto normal.
 * Retorna HTML seguro para dangerouslySetInnerHTML.
 */
export function processMessageContent(text: string): string {
  if (isAsciiArt(text)) {
    // ASCII art: escapar HTML y preservar
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  // Regex para detectar URLs
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi

  // Dividir texto en partes: URLs y no-URLs
  const parts: string[] = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    // Texto antes de la URL
    if (match.index > lastIndex) {
      parts.push(convertEmoticonsOnly(text.slice(lastIndex, match.index)))
    }
    // La URL como link
    const url = match[0]
    parts.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">${url}</a>`)
    lastIndex = urlRegex.lastIndex
  }

  // Texto restante después de la última URL
  if (lastIndex < text.length) {
    parts.push(convertEmoticonsOnly(text.slice(lastIndex)))
  }

  return parts.length > 0 ? parts.join('') : convertEmoticonsOnly(text)
}

/**
 * Procesa comandos IRC básicos
 * Retorna null si el comando debe ser procesado localmente (sin enviar al servidor)
 */
export function parseCommand(content: string): {
  isCommand: boolean
  command?: string
  args?: string
  displayContent?: string
} {
  if (!content.startsWith('/')) {
    return { isCommand: false }
  }

  const parts = content.slice(1).split(' ')
  const command = parts[0].toLowerCase()
  const args = parts.slice(1).join(' ')

  return { isCommand: true, command, args }
}

/**
 * Genera un slug único para una sala de chat
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '') // solo alfanumérico
    .replace(/\s+/g, '-') // espacios a guiones
    .replace(/-+/g, '-') // múltiples guiones a uno
    .replace(/^-|-$/g, '') // trim de guiones
    .slice(0, 40) // límite de 40 chars
}

/**
 * Formatea fecha relativa estilo 2009
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '--'
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'justo ahora'
  if (minutes < 60) return `hace ${minutes} min`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`

  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: days > 365 ? 'numeric' : undefined,
  })
}

/**
 * Formatea hora de mensaje HH:mm
 */
export function formatMessageTime(dateStr: string): string {
  if (!dateStr) return '--:--'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Valida username: 3-20 chars, solo letras, números y guion bajo
 */
export function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Mínimo 3 caracteres'
  if (username.length > 20) return 'Máximo 20 caracteres'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Solo letras, números y guion bajo'
  return null
}

/**
 * Throttle simple para evitar rate limiting
 */
export function createThrottle(ms: number) {
  let lastCall = 0
  return function throttled(): boolean {
    const now = Date.now()
    if (now - lastCall >= ms) {
      lastCall = now
      return true
    }
    return false
  }
}

/**
 * Detecta ASCII art: múltiples líneas con caracteres especiales (¶ ø ¢ $ ´ etc.)
 */
export function isAsciiArt(content: string): boolean {
  if (!content) return false
  const lines = content.split('\n')
  if (lines.length < 3) return false
  const asciiChars = /[´`¶ø¢$▀▄█▌▐░▒▓■□▪▫●○◘◙◦♠♣♥♦♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼]/
  const artLines = lines.filter(l => asciiChars.test(l)).length
  return artLines >= lines.length * 0.3 || lines.length >= 6
}

/**
 * Genera un avatar URL por defecto basado en el username
 * Usa DiceBear para avatares únicos
 */
export function getDefaultAvatar(username: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9`
}
