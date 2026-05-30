import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionFromCookies } from '@/lib/auth'

/**
 * Broadcast endpoint: recibe eventos de typing y buzz y los transmite
 * a los otros usuarios vía un store compartido.
 *
 * Por ahora almacena el evento en room_presence con metadata
 * y el cliente los recibe via SSE.
 *
 * En el futuro, esto se conecta a un WebSocket server.
 */

// Store en memoria para broadcast events (MVP)
const broadcastStore = new Map<string, any[]>()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const cookieHeader = request.headers.get('cookie') || ''
  const session = await getSessionFromCookies(cookieHeader)

  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { type, userId, username } = body

    const event = { type, userId, username, timestamp: Date.now() }

    if (!broadcastStore.has(roomId)) {
      broadcastStore.set(roomId, [])
    }
    broadcastStore.get(roomId)!.push(event)

    // Limpiar eventos viejos (> 10s)
    broadcastStore.set(
      roomId,
      broadcastStore.get(roomId)!.filter(e => Date.now() - e.timestamp < 10000)
    )

    return NextResponse.json({ success: true, event })
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params

  const events = broadcastStore.get(roomId) || []
  // Limpiar viejos
  broadcastStore.set(roomId, events.filter(e => Date.now() - e.timestamp < 10000))

  return NextResponse.json({ events })
}
