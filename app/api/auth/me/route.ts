import { NextResponse } from 'next/server'
import { getSessionWithProfile } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getSessionWithProfile()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      status: true,
      bio: true,
      role: true,
      createdAt: true,
      lastSeenAt: true,
    },
  })

  return NextResponse.json(profile)
}
