import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { broadcastStore } from '@/lib/broadcast-store'

/**
 * SSE Endpoint para eventos en tiempo real de una sala.
 * Cliente se conecta a /api/rooms/[id]/events y recibe:
 * - Nuevos mensajes (INSERT en messages)
 * - Mensajes eliminados (soft-delete)
 * - Typing indicators (broadcast via polling del cliente)
 * - Zumbidos (broadcast via polling del cliente)
 *
 * El enfoque es simple: cada 3 segundos se envía el último mensaje ID
 * que el cliente ya conoce. Si hay uno nuevo, se envía como evento SSE.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const searchParams = request.nextUrl.searchParams
  const lastMessageId = searchParams.get('since')

  // Crear stream SSE
  const encoder = new TextEncoder()
  let lastCheckedId = lastMessageId || ''
  let lastBuzzTimestamp = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      // Enviar evento inicial de conexión
      controller.enqueue(encoder.encode(`event: connected\ndata: ok\n\n`))

      // Polling cada 3 segundos
      const interval = setInterval(async () => {
        try {
          const latestMessages = await prisma.message.findMany({
            where: {
              roomId,
              deletedAt: null,
            },
            include: {
              profile: {
                select: { username: true, displayName: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })

          // Verificar mensajes nuevos desde el último conocido
          const newMessages: any[] = []
          for (const msg of latestMessages) {
            if (msg.id === lastCheckedId) break
            newMessages.push(msg)
          }

          // También verificar mensajes eliminados (últimos 10s basado en createdAt)
          const tenSecondsAgo = new Date(Date.now() - 10000)
          const deletedMessages = await prisma.message.findMany({
            where: {
              roomId,
              deletedAt: { not: null, gte: tenSecondsAgo },
            },
            select: { id: true, deletedAt: true },
          })

          if (lastCheckedId) lastCheckedId = latestMessages[0]?.id || lastCheckedId

          if (newMessages.length > 0) {
            for (const msg of newMessages.reverse()) {
              controller.enqueue(encoder.encode(
                `event: new_message\ndata: ${JSON.stringify(msg)}\n\n`
              ))
            }
          }

          if (deletedMessages.length > 0) {
            for (const dm of deletedMessages) {
              controller.enqueue(encoder.encode(
                `event: message_deleted\ndata: ${JSON.stringify({ id: dm.id, deletedAt: dm.deletedAt?.toISOString() })}\n\n`
              ))
            }
          }

          // Emitir zumbidos
          const buzzEvents = broadcastStore.getSince(roomId, lastBuzzTimestamp)
          lastBuzzTimestamp = Date.now()
          for (const be of buzzEvents) {
            controller.enqueue(encoder.encode(
              `event: buzz\ndata: ${JSON.stringify(be)}\n\n`
            ))
          }

          // Heartbeat
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`))
        } catch (err) {
          console.error('SSE poll error:', err)
        }
      }, 3000)

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
