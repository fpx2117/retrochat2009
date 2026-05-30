import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { RoomsClientWrapper } from '@/components/rooms/RoomsClientWrapper'

export const dynamic = 'force-dynamic'

async function getRooms(search?: string, category?: string) {
  const where: any = { isPrivate: false, closedAt: null }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  if (category && category !== 'all') {
    where.category = category
  }

  const rooms = await prisma.room.findMany({
    where,
    include: {
      owner: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return rooms
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>
}) {
  const params = await searchParams
  const rooms = await getRooms(params.search, params.category)

  const mapped = rooms.map((r: { owner: any; [key: string]: any }) => ({
    ...r,
    profiles: r.owner
  }))

  return (
    <div className="min-h-[calc(100vh-120px)] py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <RoomsClientWrapper
          initialRooms={mapped as any}
          initialSearch={params.search}
          initialCategory={params.category}
        />
      </div>
    </div>
  )
}
