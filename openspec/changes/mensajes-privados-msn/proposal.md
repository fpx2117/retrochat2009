# Propuesta: Mensajes Privados MSN-Style (2009)

## Intención

Agregar mensajería privada entre usuarios con la experiencia visual de MSN Messenger 2009: ventanas popup independientes, comando `/msg` estilo IRC, barra de alerta cuando alguien te escribe, y todo integrado con el sistema de salas existente. El usuario puede iniciar un chat privado desde el sidebar de cualquier sala, y la otra persona recibe una notificación instantánea estilo MSN.

## Alcance

### Dentro del Alcance
- Modelo `DirectMessage` en Prisma (senderId, receiverId, content, createdAt, readAt)
- Server actions: sendDirectMessage, getConversation, getUnreadCount, markAsRead
- SSE endpoint para notificar DMs en tiempo real
- Página `/messages/[username]` con chat privado (popup-friendly, diseño mínimo)
- Comando `/msg username texto` en cualquier sala → abre popup
- Opción "💬 Mensaje privado" en sidebar de usuarios de la sala → abre popup
- Ventana popup 400x500px centrada, estilo MSN (barra de título gradiente)
- Barra de alerta amarilla en Header cuando se recibe un mensaje ("*pepe te ha enviado un mensaje*")
- Badge de mensajes no leídos en Header
- Parpadeo en título de pestaña (`document.title`) cuando hay mensaje nuevo y el usuario está en otra pestaña
- Sonido opcional al recibir mensaje (usando Web Audio API, sutil)
- SSE global en el layout para mantener conexión de notificaciones

### Fuera del Alcance
- Adjuntar archivos/imágenes en mensajes privados
- Grupos de chat privado (más de 2 personas)
- Historial de búsqueda de mensajes
- Cifrado end-to-end
- Emoticones personalizados (usan los mismos globales)

## Enfoque

**Modelo**: Una sola tabla `direct_messages` sin tabla de conversaciones. La conversación entre A y B es el conjunto de mensajes donde `(sender=A AND receiver=B) OR (sender=B AND receiver=A)`, ordenados cronológicamente.

**Tiempo real**: SSE endpoint `/api/dm/events` que emite eventos `new_dm` cuando Prisma detecta un INSERT donde `receiverId = session.userId`. El layout se suscribe globalmente y emite notificaciones vía el sistema de toasts + barra de alerta + badge.

**Popups**: `window.open('/messages/username', '_blank', 'width=400,height=500')` con nombre de ventana fijo por conversación para reutilizar ventanas ya abiertas.

**Notificación MSN**: Barra amarilla en el Header estilo MSN Messenger: fondo amarillo gradiente, botón "Responder" que abre el popup.

**Comando /msg**: Se parsea en el input de ChatRoom. Si se detecta `/msg username texto`, se abre el popup y se envía el mensaje.

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `prisma/schema.prisma` | Modificado | +DirectMessage model + relaciones en Profile |
| `app/api/dm/actions.ts` | **Nuevo** | Server actions: sendDM, getConversation, getUnreadCount, markAsRead |
| `app/api/dm/events/route.ts` | **Nuevo** | SSE endpoint para DMs en tiempo real |
| `app/messages/[username]/page.tsx` | **Nuevo** | Página de chat privado (popup) |
| `components/dm/DirectChat.tsx` | **Nuevo** | Componente de chat privado con mensajes e input |
| `components/layout/Header.tsx` | Modificado | +barra alerta MSN, +badge DMs no leídos |
| `components/chat/ChatRoom.tsx` | Modificado | +opción "💬 Mensaje privado" en sidebar, +comando /msg |
| `app/layout.tsx` | Modificado | SSE global para notificaciones DM |
| `types/index.ts` | Modificado | +DirectMessage type |
| `lib/utils.ts` | Modificado | +parseMsgCommand para comando /msg |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Popups bloqueados por navegador | Media | Usar `window.open` en respuesta a click del usuario (no automático); fallback: navegación normal |
| SSE overload con muchos usuarios | Baja | Polling de 3s, solo emite si hay mensajes nuevos |
| Múltiples ventanas popup del mismo chat | Baja | Nombre de ventana fijo por conversación (`dm-{username}`) |
| XSS en mensajes | Baja | Reutilizar `sanitizeMessage` existente |
| Sonido molesto | Baja | Solo en primer mensaje, cooldown de 5s, desactivable |

## Plan de Reversión (Rollback)

- Git revert al commit anterior
- Migración Prisma reversa eliminar tabla `direct_messages`
- Sin datos críticos que requieran backup

## Dependencias

- Sistema de auth JWT existente
- Sistema de SSE existente (patrón a seguir)
- Componente `Avatar` y `ConfirmDialog` existentes
- Clases CSS retro existentes

## Criterios de Éxito

- [ ] Usuario A hace clic en "💬 Mensaje privado" en sidebar → se abre popup 400x500 con el chat
- [ ] Usuario A escribe `/msg lola hola!` en una sala → se abre popup y se envía el mensaje
- [ ] Usuario B recibe barra amarilla "*pepe te ha enviado un mensaje* [Responder]" en el Header
- [ ] Usuario B hace clic en [Responder] → se abre el popup de chat
- [ ] El chat muestra historial previo entre ambos usuarios
- [ ] Los mensajes aparecen en tiempo real vía SSE (ambos lados)
- [ ] Badge en Header muestra conteo de conversaciones no leídas
- [ ] Título de pestaña parpadea cuando llega mensaje y el usuario está en otra pestaña
- [ ] El popup se reutiliza si ya está abierto (no abre múltiples ventanas)
- [ ] El diseño visual es consistente con el tema retro 2009
