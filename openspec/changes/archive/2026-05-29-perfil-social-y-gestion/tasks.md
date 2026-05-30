# Tareas: Perfil Social y Gestión Completa de Salas

---

## Fase 1: Infraestructura — Schema y Tipos

- [x] 1.1 Agregar `enum FriendshipStatus` (`pending | accepted | rejected`) en `prisma/schema.prisma`
- [x] 1.2 Crear modelo `Friendship` en `prisma/schema.prisma` con: `id` (UUID), `requesterId`, `addresseeId`, `status`, `createdAt`, `updatedAt`, unique constraint `(requesterId, addresseeId)`, índices, y relaciones `Requester`/`Addressee` a `Profile`
- [x] 1.3 Agregar relaciones `sentRequests` y `receivedRequests` al modelo `Profile` en `prisma/schema.prisma`
- [x] 1.4 Ejecutar `npx prisma db push` — DB sincronizada (no tenía historial de migraciones)
- [x] 1.5 Ejecutar `npx prisma generate` — Cliente regenerado exitosamente
- [x] 1.6 Agregar `FriendshipStatus` type y `Friendship`/`FriendshipWithProfiles` interfaces en `types/index.ts`

---

## Fase 2: Server Actions — Lógica de Negocio

### 2.A — Amistad

- [x] 2.1 Crear `app/api/friends/actions.ts` con `'use server'` e importaciones (prisma, getSession, revalidatePath)
- [x] 2.2 Implementar `sendFriendRequest(addresseeId: string)`: validar sesión, no self-request, check de duplicados (cualquier status), INSERT con `status = 'pending'`, revalidar `/profile/[username]`
- [x] 2.3 Implementar `respondFriendRequest(friendshipId: string, response: 'accepted' | 'rejected')`: validar sesión, verificar que el usuario es el `addressee`, UPDATE status, revalidar
- [x] 2.4 Implementar `removeFriend(friendshipId: string)`: validar sesión, verificar que es `requester` o `addressee`, DELETE físico, revalidar
- [x] 2.5 Implementar `getPendingRequestCount()`: contar `friendships WHERE addresseeId = session.id AND status = 'pending'`, retornar `{ count }`

### 2.B — Cuenta

- [x] 2.6 Implementar `changePassword(currentPassword: string, newPassword: string)` en `app/api/profile/actions.ts`: validar sesión, bcrypt.compare contraseña actual, validar newPassword ≥ 6 chars, bcrypt.hash nueva, UPDATE `users.passwordHash`
- [x] 2.7 Implementar `deleteAccount(password: string)` en `app/api/profile/actions.ts`: validar sesión, bcrypt.compare contraseña, DELETE `users WHERE id = session.id` (cascade elimina todo), limpiar cookie con `clearSessionCookie()`, redirect a `/`

### 2.C — Salas

- [x] 2.8 Implementar `updateRoom(roomId: string, formData: FormData)` en `app/api/rooms/actions.ts`

---

## Fase 3: Componentes UI — Client Components

### 3.A — Perfil y Amistad

- [x] 3.1 Crear `components/profile/ProfileClient.tsx` (`'use client'`): recibir `profile`, `currentUser`, `friendshipStatus`, `friendshipId`, `isOwnProfile`
- [x] 3.2 Implementar lógica de botones en `ProfileClient`: none/pending_sent/pending_received/accepted
- [x] 3.3 Manejar estados de loading/error/success con mensajes y actualización optimista

### 3.B — Settings de Cuenta

- [x] 3.4 Modificar `components/auth/SettingsClient.tsx`: reorganizar en 3 secciones visuales (Perfil | Seguridad | Zona de peligro)
- [x] 3.5 Agregar sección "🔒 Seguridad": formulario de cambio de contraseña con validación client-side
- [x] 3.6 Agregar sección "⚠️ Zona de peligro": diálogo inline con campo de contraseña para eliminar cuenta

### 3.C — Settings de Sala

- [x] 3.7 Crear `components/rooms/RoomSettingsClient.tsx`
- [x] 3.8 Formulario de edición con name, description, category, isPrivate
- [x] 3.9 Sección "🚫 Usuarios expulsados" con lista de baneados
- [x] 3.10 Botón "🔒 Cerrar sala definitivamente" con ConfirmDialog

### 3.D — Header y ChatRoom

- [x] 3.11 Modificar `components/layout/Header.tsx`: badge de solicitudes pendientes en dropdown
- [x] 3.12 Modificar `components/chat/ChatRoom.tsx`: botón "Cerrar sala" para owner

---

## Fase 4: Páginas y Rutas — Integración

### 4.A — Página de Settings de Sala

- [x] 4.1 Crear `app/rooms/[id]/settings/page.tsx`
- [x] 4.2 Lógica server: auth, verificación owner, carga de baneados
- [x] 4.3 Renderizar RoomSettingsClient con datos serializados

### 4.B — Página de Perfil con Amigos

- [x] 4.4 Modificar `app/profile/[username]/page.tsx`: sesión, friendships, amigos
- [x] 4.5 Sección "👥 Amigos (N)" con grid de avatares y estados
- [x] 4.6 Renderizar ProfileClient con estado de amistad contextual
- [x] 4.7 Pasar pendingRequests al ProfileClient en perfil propio

### 4.C — Página de Settings de Cuenta

- [x] 4.8 Pasar `email` del usuario al SettingsClient

### 4.D — Middleware

- [x] 4.9 Modificar `proxy.ts`: proteger rutas que terminan en `/settings`

---

## Fase 5: Verificación

- [x] 5.1 `npx tsc --noEmit` — 0 errores
- [x] 5.2 `npx prisma generate` — cliente sincronizado
- [ ] 5.3 Verificar visualmente en `npm run dev` (pendiente de ejecución manual)
- [ ] 5.4 Verificar sala cerrada no aparece en `/rooms`
- [ ] 5.5 Verificar middleware redirige correctamente
