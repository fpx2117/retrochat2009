'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'

export async function updateReportStatus(reportId: string, status: string) {
  const session = await getSession()
  if (!session) return { error: 'No autenticado' }

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
    select: { role: true },
  })

  if (profile?.role !== 'admin') return { error: 'Sin permisos' }

  const validStatuses = ['reviewed', 'resolved', 'dismissed']
  if (!validStatuses.includes(status)) return { error: 'Estado inválido' }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: status as any,
      reviewedAt: new Date(),
      reviewedBy: session.id,
    },
  })

  return { success: true }
}
