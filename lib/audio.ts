// Sonido MSN simple usando Web Audio API
let audioCtx: AudioContext | null = null
let lastBeep = 0

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

export function playMsnBeep() {
  const now = Date.now()
  if (now - lastBeep < 5000) return // cooldown 5s
  lastBeep = now

  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(830, ctx.currentTime)
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  } catch {
    // Silenciar errores (mobile, permisos, etc.)
  }
}

// Sonido de zumbido MSN — vibración rápida
export function playMsnBuzz() {
  try {
    const ctx = getAudioContext()
    const duration = 0.6
    const now = ctx.currentTime

    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(80 + i * 30, now + i * 0.1)
      gain.gain.setValueAtTime(0.08, now + i * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.08)
      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.08)
    }
  } catch {
    // Silenciar errores
  }
}
