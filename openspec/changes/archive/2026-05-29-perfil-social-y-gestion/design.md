# Diseño: Perfil Social y Gestión Completa de Salas

## Enfoque Técnico

El cambio extiende la arquitectura existente de RetroChat 2009 (Server Components + Client Components + Server Actions + Prisma) con tres módulos nuevos que siguen estrictamente los patrones y convenciones del código base: server actions con `'use server'`, componentes cliente con estado local, clases CSS retro, y flujo de datos vía props de server a client components.

**Mapeo a especificaciones**: Cada requerimiento de las 3 specs (`friends`, `account`, `room-management`) se implementa con el patrón: Server Component (carga datos) → Client Component (interactividad) → Server Action (mutación con validación).

---

## Decisiones de Arquitectura

### Decisión 1: Modelo Friendship con unique constraint bidireccional

**Elección**: Tabla `friendships` con `requester_id`, `addressee_id`, `status` (enum: `pending | accepted | rejected`), y un unique constraint sobre `(requester_id, addressee_id)`.

**Alternativas consideradas**:
- Dos registros por amistad aceptada (A→B y B→A): duplicación innecesaria.
- Tabla separada para solicitudes (`friend_requests`) y amistades (`friends`): sobre-ingeniería para MVP.

**Justificación**: Un solo registro con `status` es suficiente. El unique constraint previene duplicados. La dirección (`requester` vs `addressee`) solo importa durante `pending`; una vez `accepted`, la consulta de amigos se hace con `WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'`.

### Decisión 2: Server Actions para amistad (no API Routes)

**Elección**: Todas las mutaciones de amistad como server actions en `app/api/friends/actions.ts`, siguiendo el patrón de `app/api/rooms/actions.ts` y `app/api/messages/actions.ts`.

**Alternativas consideradas**: API Routes REST (`/api/friends/...`). 

**Justificación**: El proyecto ya usa server actions para todas las mutaciones (createRoom, sendMessage, updateProfile, etc.). Mantener consistencia. Server actions simplifican el manejo de sesión (usan cookies automáticamente) y la revalidación (`revalidatePath`).

### Decisión 3: ProfileClient como Client Component separado

**Elección**: Crear `components/profile/ProfileClient.tsx` para encapsular las acciones de amistad (enviar solicitud, aceptar, rechazar, eliminar) como componente interactivo dentro de la página de perfil.

**Alternativas consideradas**: Poner la lógica directamente en `app/profile/[username]/page.tsx`.

**Justificación**: La página de perfil es un Server Component (carga datos). Las acciones de amistad requieren estado (loading, success, error). Separar el Client Component permite mantener la página como Server Component y pasarle los datos ya cargados como props, patrón idéntico al de `SettingsClient` o `AdminClient`.

### Decisión 4: Badge de solicitudes vía server action dedicada

**Elección**: Crear `getPendingRequestCount()` como server action que el `Header` (client component) llama en su `useEffect`.

**Alternativas consideradas**:
- Modificar `/api/auth/me` para incluir el count: acopla la API de auth con amigos.
- Pasar el count desde el layout: el layout es server component pero no puede pasar props dinámicas a client components anidados sin context.

**Justificación**: Una server action simple y enfocada mantiene el desacoplamiento. El Header ya hace fetch de usuario al montarse; agregar un segundo fetch ligero es aceptable.

### Decisión 5: Eliminación de cuenta con diálogo custom (no ConfirmDialog genérico)

**Elección**: Crear un diálogo inline en `SettingsClient` para la eliminación de cuenta, con campo de contraseña. Similar al patrón de `reportDialog` en `ChatRoom`.

**Alternativas consideradas**: Extender `ConfirmDialog` para soportar inputs.

**Justificación**: `ConfirmDialog` es un componente genérico para confirmaciones simples (sí/no). La eliminación de cuenta requiere un input de contraseña, lo que lo hace un caso especial. Crear un diálogo específico evita complejizar el componente genérico y sigue el patrón ya usado en `ChatRoom` para diálogos con formularios.

### Decisión 6: closeRoom ya existe — solo se expone en UI

**Elección**: No crear una nueva server action. Usar `closeRoom` existente desde `app/api/rooms/actions.ts`.

**Justificación**: La acción ya está implementada y probada. Solo falta: (a) importarla en `ChatRoom.tsx`, (b) agregar el botón con `ConfirmDialog`, (c) crear la página `/rooms/[id]/settings` que también la use.

---

## Flujo de Datos

### Flujo de Amistad

```
Perfil ajeno (/profile/lola)
  │
  ├── Server Component carga: profile, friends, friendshipStatus con visitante
  │     │
  │     └── Pasa props a ProfileClient
  │           │
  │           ├── [Sin relación] → Botón "Agregar amigo"
  │           │     └── onClick → sendFriendRequest(addresseeId)
  │           │           └── Server Action: INSERT friendship (pending)
  │           │                 └── revalidatePath('/profile/[username]')
  │           │
  │           ├── [Pendiente enviada] → "✓ Solicitud enviada" (disabled)
  │           ├── [Pendiente recibida] → Botones Aceptar / Rechazar
  │           │     └── onClick → respondFriendRequest(friendshipId, 'accepted')
  │           │           └── Server Action: UPDATE friendship status
  │           │
  │           └── [Amigos] → "✓ Amigos" + botón Eliminar
  │                 └── onClick → removeFriend(friendshipId)
  │                       └── Server Action: DELETE friendship

Header (layout)
  │
  └── useEffect → getPendingRequestCount()
        └── Server Action: COUNT friendships WHERE addressee_id = session.id AND status = 'pending'
              └── Badge numérico en dropdown
```

### Flujo de Account Settings

```
/settings (Server Component)
  │
  └── Carga profile → pasa a SettingsClient
        │
        ├── [Cambiar contraseña] → Formulario con 3 campos
        │     └── onSubmit → changePassword(currentPassword, newPassword)
        │           └── Server Action: bcrypt.compare → bcrypt.hash → UPDATE users
        │
        └── [Eliminar cuenta] → Botón "Zona de peligro"
              └── onClick → abre diálogo con input de contraseña
                    └── onConfirm(password) → deleteAccount(password)
                          └── Server Action: bcrypt.compare → DELETE users (cascade)
                                └── clearSessionCookie() → redirect('/')
```

### Flujo de Room Settings

```
/rooms/[id]/settings (Server Component)
  │
  ├── Verifica: session existe, sala existe, usuario es owner
  │     └── Si no: redirect con error
  │
  ├── Carga: room data + banned members (room_members WHERE bannedAt IS NOT NULL)
  │
  └── Pasa props a RoomSettingsClient
        │
        ├── [Editar sala] → Formulario (name, description, category, isPrivate)
        │     └── onSubmit → updateRoom(roomId, formData)
        │           └── Server Action: validación → UPDATE room → revalidatePath
        │
        ├── [Baneados] → Lista de miembros con bannedAt != null
        │
        └── [Cerrar sala] → Botón + ConfirmDialog
              └── onConfirm → closeRoom(roomId)
                    └── Server Action (existente): UPDATE room SET closedAt = now()
                          └── redirect('/rooms')

ChatRoom (header)
  └── [Owner] → Botón "🔒 Cerrar sala" + ConfirmDialog
        └── onConfirm → closeRoom(roomId) → redirect('/rooms')
```

---

## Cambios en Archivos

### Archivos Nuevos

| Archivo | Descripción |
|---|---|
| `app/api/friends/actions.ts` | Server actions: `sendFriendRequest`, `respondFriendRequest`, `removeFriend`, `getFriends`, `getPendingRequestCount` |
| `app/rooms/[id]/settings/page.tsx` | Server Component: verifica owner, carga datos de sala + baneados, renderiza `RoomSettingsClient` |
| `components/rooms/RoomSettingsClient.tsx` | Client Component: formulario editar sala, lista baneados, botón cerrar sala |
| `components/profile/ProfileClient.tsx` | Client Component: botones de amistad contextuales en perfil ajeno y propio |

### Archivos Modificados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Agregar `enum FriendshipStatus` + modelo `Friendship` con índices |
| `app/api/profile/actions.ts` | Agregar `changePassword` y `deleteAccount` server actions |
| `app/api/rooms/actions.ts` | Agregar `updateRoom` server action |
| `app/settings/page.tsx` | Pasar `email` del usuario al `SettingsClient` (necesario para deleteAccount) |
| `components/auth/SettingsClient.tsx` | Agregar secciones: Cambiar contraseña, Zona de peligro (eliminar cuenta) con diálogo custom |
| `components/chat/ChatRoom.tsx` | Importar `closeRoom`, agregar botón "Cerrar sala" con `ConfirmDialog` para owner |
| `app/profile/[username]/page.tsx` | Agregar sección de amigos + pasar datos a `ProfileClient` |
| `components/layout/Header.tsx` | Agregar `pendingCount` state, fetch a `getPendingRequestCount`, badge en dropdown |
| `proxy.ts` | Agregar patrón `/rooms/*/settings` a `protectedPaths` |
| `types/index.ts` | Agregar `FriendshipStatus`, `Friendship` interface |

---

## Interfaces / Contratos

### Schema Prisma (delta)

```prisma
enum FriendshipStatus {
  pending
  accepted
  rejected
}

model Friendship {
  id          String           @id @default(uuid()) @db.Uuid
  requesterId String           @map("requester_id") @db.Uuid
  addresseeId String           @map("addressee_id") @db.Uuid
  status      FriendshipStatus @default(pending)
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  requester  Profile @relation("Requester", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee  Profile @relation("Addressee", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
  @@index([requesterId])
  @@index([addresseeId])
  @@index([status])
  @@map("friendships")
}
```

**Relaciones en Profile** (agregar):
```prisma
model Profile {
  // ... existente ...
  sentRequests     Friendship[] @relation("Requester")
  receivedRequests Friendship[] @relation("Addressee")
}
```

### Tipos TypeScript Nuevos

```typescript
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
}

export interface FriendshipWithProfiles extends Friendship {
  requester: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'status'>
  addressee: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'status'>
}
```

### Server Actions — Contratos

**`sendFriendRequest(addresseeId: string)`**
```typescript
// Retorna: { success: true } | { error: string }
// Errores: "Debes iniciar sesión", "No podés enviarte una solicitud a vos mismo",
//          "Ya existe una solicitud de amistad pendiente con este usuario",
//          "Ya son amigos"
```

**`respondFriendRequest(friendshipId: string, response: 'accepted' | 'rejected')`**
```typescript
// Retorna: { success: true } | { error: string }
// Errores: "Debes iniciar sesión", "Sin permisos para responder esta solicitud"
```

**`removeFriend(friendshipId: string)`**
```typescript
// Retorna: { success: true } | { error: string }
```

**`getPendingRequestCount()`**
```typescript
// Retorna: { count: number } | { error: string }
```

**`changePassword(currentPassword: string, newPassword: string)`**
```typescript
// Retorna: { success: true } | { error: string }
// Errores: "La contraseña actual es incorrecta",
//          "La nueva contraseña debe tener al menos 6 caracteres"
```

**`deleteAccount(password: string)`**
```typescript
// Retorna: { success: true } | { error: string }
// Errores: "Contraseña incorrecta"
// Efecto: elimina user (cascade) + limpia cookie + redirect a "/"
```

**`updateRoom(roomId: string, formData: FormData)`**
```typescript
// Retorna: { success: true } | { error: string }
// Validaciones: mismas que createRoom (name 2-50, description max 200, categoría válida)
// Permisos: solo owner
```

### Props de Componentes Nuevos

**`ProfileClient`**
```typescript
interface ProfileClientProps {
  profile: Profile                  // perfil visitado
  currentUser: HeaderUser | null    // usuario autenticado (o null)
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
  friendshipId: string | null       // ID de la friendship si existe
  isOwnProfile: boolean
}
```

**`RoomSettingsClient`**
```typescript
interface RoomSettingsClientProps {
  room: Room
  bannedMembers: Array<{
    id: string
    bannedAt: string
    banReason: string | null
    bannedBy: string | null
    profile: { username: string; displayName: string; avatarUrl: string | null }
    bannedByProfile?: { username: string; displayName: string } | null
  }>
}
```

---

## Estrategia de Pruebas

| Capa | Qué Probar | Enfoque |
|------|------------|---------|
| **Server Actions** | Validaciones de `sendFriendRequest` (auto-solicitud, duplicados), `changePassword` (bcrypt compare), `deleteAccount` (cascade), `updateRoom` (permisos owner) | Tests unitarios con Prisma en memoria o mock |
| **Componentes** | `ProfileClient` renderiza el botón correcto según `friendshipStatus`, `SettingsClient` muestra/oculta secciones, `RoomSettingsClient` muestra baneados | Tests de snapshot o render con datos mock |
| **Integración** | Flujo completo: enviar solicitud → aceptar → aparecer en listas mutuas → eliminar amistad | E2E con Playwright (si se configura) o tests de integración con server actions reales |

**Nota**: El proyecto no tiene infraestructura de testing configurada aún. Los tests se implementarán como archivos `*.test.ts` si el usuario lo requiere, pero quedan fuera del alcance mínimo viable de este cambio.

---

## Migración / Despliegue

1. **Prisma Migrate**: Ejecutar `npx prisma migrate dev --name add-friendships` localmente.
2. **Deploy**: `prisma migrate deploy` en producción (Railway PostgreSQL).
3. **Sin datos que migrar**: La tabla `friendships` es nueva, no requiere migración de datos.
4. **Rollback**: Si es necesario, crear migración reversa con `prisma migrate diff` o restaurar backup de Railway.
5. **Sin feature flags**: Todos los cambios se activan inmediatamente al deploy. No hay riesgo de regresión en funcionalidades existentes (solo se agregan rutas y componentes nuevos, más secciones en página existente).

---

## Preguntas Abiertas

- [x] ~~¿Debe el admin global poder cerrar cualquier sala desde `/rooms/[id]/settings`?~~ → Sí, la acción `closeRoom` ya lo permite. La página mostrará el botón de cerrar solo al owner, pero el admin puede usar la acción vía otros medios.
- [x] ~~¿Transferencia de propiedad de sala?~~ → Fuera de alcance (explicitado en la propuesta). Se implementará en un cambio futuro si se requiere.
- [ ] ¿Las solicitudes rechazadas deben permitir reenvío después de 24 horas? La spec dice que sí ("PODRÁ"). Se implementa el modelo con `status = rejected` y `updatedAt`, pero la UI de reenvío se deja para una iteración posterior.
