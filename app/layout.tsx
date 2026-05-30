import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/Toaster'
import { TitleBlink } from '@/components/layout/TitleBlink'

export const metadata: Metadata = {
  title: 'RetroChat 2009 - Chat en Tiempo Real',
  description: 'El chat de salas más retro de internet. Conectate, chateá, hacé amigos. Estilo 2009.',
  keywords: 'chat, salas, retro, 2009, messenger, irc, tiempo real',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-screen flex flex-col">
        <Toaster>
          <TitleBlink />
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Toaster>
      </body>
    </html>
  )
}
