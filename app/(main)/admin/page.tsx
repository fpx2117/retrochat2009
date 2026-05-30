import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminClient } from '@/components/admin/AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
    select: { role: true },
  })

  if (profile?.role !== 'admin') redirect('/')

  const reports = await prisma.report.findMany({
    where: { status: 'pending' },
    include: {
      reporter: { select: { username: true, displayName: true } },
      reported: { select: { username: true, displayName: true } },
      message: { select: { content: true } },
      room: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const [userCount, roomCount, messageCount] = await Promise.all([
    prisma.profile.count(),
    prisma.room.count({ where: { closedAt: null } }),
    prisma.message.count({ where: { deletedAt: null } }),
  ])

  return (
    <div className="min-h-[calc(100vh-120px)] py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <AdminClient
          reports={reports as any}
          stats={{
            users: userCount,
            rooms: roomCount,
            messages: messageCount,
          }}
        />
      </div>
    </div>
  )
}
