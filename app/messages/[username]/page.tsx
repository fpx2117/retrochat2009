import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { DirectChat } from '@/components/dm/DirectChat'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ username: string }>
  searchParams: Promise<{ popup?: string }>
}

export default async function MessagesPage({ params, searchParams }: Props) {
  const { username } = await params
  const { popup } = await searchParams
  const session = await getSession()

  if (!session) redirect(`/login?redirect=/messages/${username}`)

  // Buscar el otro usuario
  const otherUser = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  })

  if (!otherUser) notFound()
  if (otherUser.id === session.id) {
    redirect(`/profile/${username}`)
  }

  // Obtener current user
  const currentUser = await prisma.profile.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  })

  if (!currentUser) redirect('/login')

  // Cargar historial
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: session.id, receiverId: otherUser.id },
        { senderId: otherUser.id, receiverId: session.id },
      ],
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  const isPopup = popup === '1'

  return (
    <>
      {isPopup ? (
        <div className="w-[400px] h-[500px] overflow-hidden">
          <DirectChat
            currentUser={currentUser}
            otherUser={otherUser}
            initialMessages={messages}
            isPopup={true}
          />
        </div>
      ) : (
        <div className="h-[calc(100vh-120px)] max-w-2xl mx-auto">
          <DirectChat
            currentUser={currentUser}
            otherUser={otherUser}
            initialMessages={messages}
            isPopup={false}
          />
        </div>
      )}
    </>
  )
}
