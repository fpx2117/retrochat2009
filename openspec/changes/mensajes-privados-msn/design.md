# Diseño: Mensajes Privados MSN-Style (2009)

## Enfoque Técnico

Implementar un sistema de mensajería directa con una sola tabla `direct_messages`, SSE para tiempo real, y ventanas popup como interfaz principal. El layout principal tendrá una ruta `/messages/[username]` que detecta si está en popup (`?popup=1`) para mostrar un diseño mínimo sin header/footer.

## Decisiones de Arquitectura

### Decisión 1: Una sola tabla sin conversaciones

**Elección**: Tabla `direct_messages` con `senderId`, `receiverId`, `content`, `createdAt`, `readAt`. Sin tabla de conversaciones.

**Justificación**: La conversación entre A y B se recupera con `WHERE (sender=A AND receiver=B) OR (sender=B AND receiver=A)`. Más simple, menos joins, mismo resultado. El "unread count" se calcula como `COUNT(DISTINCT senderId) WHERE receiverId = me AND readAt IS NULL`.

### Decisión 2: SSE dedicado para DMs

**Elección**: Nuevo endpoint `GET /api/dm/events` con polling cada 3 segundos (mismo patrón que `/api/rooms/[id]/events`).

**Justificación**: Mantiene el patrón existente. El layout se suscribe una vez y distribuye eventos a través de un store/context. Separado de los eventos de sala para no mezclar responsabilidades.

### Decisión 3: Popups con window.open + nombre fijo

**Elección**: `window.open('/messages/username?popup=1', 'dm-username', 'width=400,height=500')`.

**Justificación**: El nombre fijo (`dm-username`) asegura que solo existe una ventana por conversación. Si ya está abierta, gana foco. El parámetro `?popup=1` permite que la página use un layout mínimo.

### Decisión 4: Comando /msg integrado en el parseCommand existente

**Elección**: Extender `parseCommand` en `lib/utils.ts` para detectar `/msg` y retornar `{ isCommand: true, command: 'msg', args: 'username texto' }`. El ChatRoom maneja el comando abriendo el popup y llamando `sendDirectMessage`.

### Decisión 5: Barra de notificación como estado en Header

**Elección**: Estado `notification: { from: string, username: string } | null` en Header. El evento SSE lo setea. La barra se renderiza condicionalmente con clases retro.

### Decisión 6: Parpadeo de título con setInterval

**Elección**: `useEffect` en el layout que monitorea `document.visibilityState` y alterna `document.title` cuando hay mensajes no leídos y la pestaña está oculta.

## Flujo de Datos

```
Envío de DM:
  ChatRoom sidebar / /msg comando
    │
    ├── window.open('/messages/username?popup=1', 'dm-username', '400x500')
    │
    └── DirectChat component
          └── sendDirectMessage(receiverId, content)
                └── Server Action: INSERT direct_messages
                      └── SSE para receiver emite new_dm

Recepción de DM:
  Layout → SSE /api/dm/events
    │
    ├── Nuevo mensaje → evento 'new_dm'
    │     ├── setNotification({ from: senderName, username })
    │     ├── setUnreadCount(prev => prev + 1)
    │     └── Si popup abierto → DirectChat actualiza mensajes
    │
    └── Barra amarilla en Header
          └── Click [Responder] → window.open a la conversación
```

## Cambios en Archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `prisma/schema.prisma` | Modificar | +DirectMessage model + relaciones |
| `app/api/dm/actions.ts` | **Nuevo** | sendDirectMessage, getConversation, getUnreadCount, markAsRead |
| `app/api/dm/events/route.ts` | **Nuevo** | SSE polling cada 3s para nuevos DMs |
| `app/messages/[username]/page.tsx` | **Nuevo** | Server component que carga conversación + perfil |
| `components/dm/DirectChat.tsx` | **Nuevo** | Client component: mensajes + SSE + input + scroll |
| `components/layout/Header.tsx` | Modificar | +barra notificación, +badge unread, +import getUnreadCount |
| `components/chat/ChatRoom.tsx` | Modificar | +"💬 Mensaje privado" en sidebar, +comando /msg |
| `app/layout.tsx` | Modificar | +SSE global para DMs, +parpadeo título |
| `lib/utils.ts` | Modificar | +parseMsgCommand (extender parseCommand) |
| `types/index.ts` | Modificar | +DirectMessage interface |

## Interfaces / Contratos

### Schema Prisma (delta)

```prisma
model DirectMessage {
  id         String   @id @default(uuid()) @db.Uuid
  senderId   String   @map("sender_id") @db.Uuid
  receiverId String   @map("receiver_id") @db.Uuid
  content    String
  createdAt  DateTime @default(now()) @map("created_at")
  readAt     DateTime? @map("read_at")

  sender   Profile @relation("DMSender", fields: [senderId], references: [id], onDelete: Cascade)
  receiver Profile @relation("DMReceiver", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([senderId])
  @@index([receiverId])
  @@index([receiverId, readAt])
  @@index([createdAt])
  @@map("direct_messages")
}
```

### Relaciones en Profile (agregar)
```prisma
sentDMs     DirectMessage[] @relation("DMSender")
receivedDMs DirectMessage[] @relation("DMReceiver")
```

### Server Actions

```typescript
sendDirectMessage(receiverId: string, content: string): { success, error? }
getConversation(otherUserId: string): { messages: DMWithProfile[], error? }
getUnreadCount(): { count: number }
markAsRead(senderId: string): { success }
```

### SSE Evento

```json
// GET /api/dm/events
// event: new_dm
{
  "id": "uuid",
  "senderId": "uuid",
  "senderName": "pepe",
  "content": "hola!",
  "createdAt": "2026-05-29T..."
}
```

## Migración

- `npx prisma db push` para sincronizar nuevo modelo
- `npx prisma generate` para regenerar cliente
- Sin migración de datos (tabla nueva)

## Preguntas Abiertas

- [x] ¿Sonido al recibir mensaje? → Sí, sutil con Web Audio API, solo en primer mensaje de cada conversación, cooldown 5s.
- [ ] ¿El popup debe cerrarse solo si el otro cierra? → No, independiente.
