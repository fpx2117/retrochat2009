# Tareas: Mensajes Privados MSN-Style

## Fase 1: Infraestructura

- [ ] 1.1 Agregar modelo `DirectMessage` en `prisma/schema.prisma` + relaciones en `Profile`
- [ ] 1.2 `npx prisma db push` + `npx prisma generate`
- [ ] 1.3 Agregar `DirectMessage` interface en `types/index.ts`

## Fase 2: Server Actions + SSE

- [ ] 2.1 Crear `app/api/dm/actions.ts`: `sendDirectMessage`, `getConversation`, `getUnreadCount`, `markAsRead`
- [ ] 2.2 Crear `app/api/dm/events/route.ts`: SSE polling cada 3s para nuevos DMs

## Fase 3: UI — Chat privado

- [ ] 3.1 Crear `components/dm/DirectChat.tsx`: mensajes, input, SSE, scroll, popup-aware
- [ ] 3.2 Crear `app/messages/[username]/page.tsx`: server component que carga datos + renderiza DirectChat

## Fase 4: Integración con la app

- [ ] 4.1 Modificar `lib/utils.ts`: extender `parseCommand` para `/msg username texto`
- [ ] 4.2 Modificar `ChatRoom.tsx`: +"💬 Mensaje privado" en sidebar, +manejo comando /msg
- [ ] 4.3 Modificar `Header.tsx`: +barra notificación MSN, +badge unread DMs
- [ ] 4.4 Modificar `app/layout.tsx`: SSE global DMs + parpadeo título

## Fase 5: Audio + CSS

- [ ] 5.1 Agregar sonido MSN al recibir DM (Web Audio API, sutil)
- [ ] 5.2 Estilos retro para chat popup (barra título, burbujas mensajes)

## Fase 6: Verificación

- [ ] 6.1 `npx tsc --noEmit`
- [ ] 6.2 Prueba visual con `npm run dev`
