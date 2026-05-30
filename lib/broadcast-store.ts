// Store en memoria compartida para broadcast events (zumbidos, etc.)
// En producción, esto debería ser Redis o similar

interface BroadcastEvent {
  type: string
  userId: string
  username: string
  timestamp: number
}

class BroadcastStore {
  private store = new Map<string, BroadcastEvent[]>()

  push(roomId: string, event: BroadcastEvent) {
    if (!this.store.has(roomId)) {
      this.store.set(roomId, [])
    }
    this.store.get(roomId)!.push(event)
    // Limpiar viejos (> 10s)
    this.store.set(
      roomId,
      this.store.get(roomId)!.filter(e => Date.now() - e.timestamp < 10000)
    )
  }

  getSince(roomId: string, since: number): BroadcastEvent[] {
    const events = this.store.get(roomId) || []
    return events.filter(e => e.timestamp > since)
  }

  getAll(roomId: string): BroadcastEvent[] {
    return this.store.get(roomId) || []
  }
}

export const broadcastStore = new BroadcastStore()
