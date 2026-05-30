import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth'
import { broadcastStore } from '@/lib/broadcast-store'

/**
 * Broadcast endpoint: recibe eventos de typing y buzz y los transmite
 * a los otros usuarios vía un store compartido.
 *
 * Por ahora almacena el evento en room_presence con metadata
 * y el cliente los recibe via SSE.
 *
 * En el futuro, esto se conecta a un WebSocket server.
 */

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
    broadcastStore.push(roomId, event)

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
  const events = broadcastStore.getAll(roomId)
  return NextResponse.json({ events })
}
