import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/auth/SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login?redirect=/settings')

  const profile = await prisma.profile.findUnique({
    where: { id: session.id },
  })

  if (!profile) redirect('/login')

  return (
    <div className="min-h-[calc(100vh-120px)] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <SettingsClient profile={profile as any} />
      </div>
    </div>
  )
}
