import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  let lastCheck = new Date()

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'))

      const interval = setInterval(async () => {
        try {
          const newMessages = await prisma.directMessage.findMany({
            where: {
              receiverId: session.id,
              createdAt: { gt: lastCheck },
            },
            include: {
              sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
          })

          lastCheck = new Date()

          for (const msg of newMessages) {
            const data = JSON.stringify({
              id: msg.id,
              senderId: msg.senderId,
              senderName: msg.sender.displayName || msg.sender.username,
              senderUsername: msg.sender.username,
              content: msg.content,
              createdAt: msg.createdAt.toISOString(),
            })
            controller.enqueue(encoder.encode(`event: new_dm\ndata: ${data}\n\n`))
          }
        } catch {
          // Silenciar errores de polling
        }
      }, 3000)

      // Cleanup on close
      return () => clearInterval(interval)
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
