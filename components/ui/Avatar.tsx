'use client'

import { getDefaultAvatar } from '@/lib/utils'
import { USER_STATUSES, type UserStatus } from '@/types'

interface AvatarProps {
  username: string
  avatarUrl?: string | null
  displayName?: string
  status?: UserStatus
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showStatus?: boolean
}

const SIZES = {
  sm: { img: 'w-6 h-6', dot: 'w-2 h-2' },
  md: { img: 'w-8 h-8', dot: 'w-2.5 h-2.5' },
  lg: { img: 'w-12 h-12', dot: 'w-3 h-3' },
  xl: { img: 'w-24 h-24', dot: 'w-4 h-4' },
}

export function Avatar({
  username,
  avatarUrl,
  displayName,
  status = 'online',
  size = 'md',
  showStatus = false,
}: AvatarProps) {
  const { img, dot } = SIZES[size]
  const statusInfo = USER_STATUSES[status]

  return (
    <div className="relative inline-flex flex-shrink-0">
      <img
        src={avatarUrl || getDefaultAvatar(username)}
        alt={displayName || username}
        className={`${img} retro-avatar object-cover`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = getDefaultAvatar(username)
        }}
      />
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${dot} rounded-full border border-white`}
          style={{ background: statusInfo.color }}
          title={statusInfo.label}
        />
      )}
    </div>
  )
}
