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
