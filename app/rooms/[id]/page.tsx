import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ChatRoom } from '@/components/chat/ChatRoom'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getRoomData(roomId: string) {
  const session = await getSession()

  const room = await prisma.room.findFirst({
    where: { id: roomId, closedAt: null },
    include: {
      owner: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  })

  if (!room) return null

  let currentMember: any = null
  let blockedUsers: string[] = []

  if (session) {
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: session.id } },
    })
    currentMember = member

    const blocks = await prisma.block.findMany({
      where: { blockerId: session.id },
      select: { blockedId: true },
    })
    blockedUsers = blocks.map((b: { blockedId: string }) => b.blockedId)
  }

  const members = await prisma.roomMember.findMany({
    where: { roomId, bannedAt: null },
    include: {
      profile: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
      },
    },
    orderBy: { role: 'desc' },
  })

  const messages = await prisma.message.findMany({
    where: { roomId },
    include: {
      profile: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return {
    room,
    currentMember,
    members,
    messages: messages.reverse(),
    currentUser: session ? { id: session.id } : null,
    blockedUsers,
  }
}

export default async function RoomPage({ params }: PageProps) {
  const { id } = await params
  const data = await getRoomData(id)

  if (!data) redirect('/rooms')

  const { room, currentMember, members, messages, currentUser, blockedUsers } = data

  return (
    <ChatRoom
      room={{
        ...room,
        profiles: room.owner,
      }}
      currentMember={currentMember}
      initialMembers={members}
      initialMessages={messages}
      currentUser={currentUser}
      blockedUsers={blockedUsers}
    />
  )
}
