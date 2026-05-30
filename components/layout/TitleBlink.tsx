'use client'

import { useEffect, useRef } from 'react'

export function TitleBlink() {
  const originalTitle = useRef('RetroChat 2009')
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    originalTitle.current = document.title

    const es = new EventSource('/api/dm/events')

    es.addEventListener('new_dm', () => {
      if (document.visibilityState === 'visible') return

      let on = false
      if (blinkRef.current) clearInterval(blinkRef.current)

      blinkRef.current = setInterval(() => {
        on = !on
        document.title = on ? '💬 ¡Nuevo mensaje!' : originalTitle.current
      }, 1200)

      const restore = () => {
        if (blinkRef.current) {
          clearInterval(blinkRef.current)
          blinkRef.current = null
        }
        document.title = originalTitle.current
        document.removeEventListener('visibilitychange', restore)
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') restore()
      })
    })

    return () => {
      es.close()
      if (blinkRef.current) clearInterval(blinkRef.current)
    }
  }, [])

  return null
}
