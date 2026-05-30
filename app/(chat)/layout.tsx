import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat Privado - RetroChat 2009',
  robots: 'noindex',
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      {children}
    </div>
  )
}
