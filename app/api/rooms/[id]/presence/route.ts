import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionFromCookies } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const cookieHeader = request.headers.get('cookie') || ''
  const session = await getSessionFromCookies(cookieHeader)

  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await prisma.roomPresence.upsert({
    where: { roomId_userId: { roomId, userId: session.id } },
    create: { roomId, userId: session.id, lastHeartbeat: new Date() },
    update: { lastHeartbeat: new Date() },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params
  const cookieHeader = request.headers.get('cookie') || ''
  const session = await getSessionFromCookies(cookieHeader)

  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await prisma.roomPresence.deleteMany({
    where: { roomId, userId: session.id },
  })

  return NextResponse.json({ success: true })
}
