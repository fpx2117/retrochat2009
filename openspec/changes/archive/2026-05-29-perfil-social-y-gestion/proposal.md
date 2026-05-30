# Propuesta: Perfil Social y Gestión Completa de Salas

## Intención

Completar las funcionalidades sociales y de autogestión que quedaron pendientes en RetroChat 2009. El usuario necesita: tener amigos en la plataforma, gestionar completamente su cuenta (cambiar contraseña, eliminar cuenta), y como dueño de una sala poder administrarla a fondo (configurar, cerrar, revisar baneados). Actualmente existe el perfil público pero no hay relaciones de amistad, los settings de cuenta son mínimos, y los owners de sala no tienen una interfaz para gestionar sus salas.

## Alcance

### Dentro del Alcance

1. **Sistema de amigos bidireccional**: solicitar amistad, aceptar, rechazar, eliminar amigo. Modelo `Friendship` con estados `pending | accepted | rejected`.
2. **Lista de amigos en perfil**: mostrar amigos en `/profile/[username]` y en el perfil propio (sección "Mis Amigos").
3. **Botón "Agregar amigo"** en perfil ajeno para enviar solicitud.
4. **Notificación visual** de solicitudes pendientes en el Header (badge en menú de usuario).
5. **Cambio de contraseña** en `/settings`: formulario con contraseña actual + nueva + confirmación.
6. **Eliminación de cuenta** en `/settings`: botón con doble confirmación, limpia datos en cascada.
7. **Página de settings de sala** (`/rooms/[id]/settings`): el owner puede editar nombre, descripción, categoría, privacidad; ver lista de miembros baneados; y cerrar la sala definitivamente.
8. **Botón "Cerrar sala"** visible en el header del `ChatRoom` cuando el usuario es owner.

### Fuera del Alcance

- Mensajes directos/privados entre amigos (ya estaba fuera del scope original).
- Notificaciones push/email de solicitudes de amistad.
- Recuperación de contraseña por email.
- Sistema de "mejores amigos" o favoritos.
- Transferencia de propiedad de sala a otro miembro.
- Re-apertura de salas cerradas.
- Desbanear usuarios (por ahora, el ban es permanente).

## Enfoque

**Arquitectura**: Server Components para carga de datos + Client Components para interactividad + Server Actions para mutaciones. Todo en español argentino.

**Modelo de datos**:
- Nueva tabla `friendships` con `requester_id`, `addressee_id`, `status` (enum `FriendshipStatus`: `pending | accepted | rejected`), `created_at`, `updated_at`.
- Índices compuestos para búsqueda rápida de amistades.
- Unique constraint en `(requester_id, addressee_id)` para evitar duplicados.

**Flujo de amistad**:
1. Usuario A visita perfil de B → botón "Agregar amigo" → `sendFriendRequest`
2. Usuario B ve solicitud pendiente → acepta o rechaza → `respondFriendRequest`
3. Amistad aceptada → ambos aparecen en listas de amigos mutuas
4. Cualquiera puede eliminar la amistad → `removeFriend`

**Settings de cuenta**:
- `changePassword`: verifica contraseña actual con bcrypt, hashea la nueva, actualiza.
- `deleteAccount`: confirma con contraseña, elimina en cascada (User → Profile → todos los registros relacionados).

**Settings de sala**:
- Ruta protegida: solo owner puede acceder.
- Componente server que carga datos de la sala y lista de baneados.
- `updateRoom`: editar name, description, category, isPrivate.
- `closeRoom`: ya existe, solo falta exponer en UI.

**UI**: Todo con el sistema de diseño retro 2009 existente (`.retro-*` classes). Reutilizar `ConfirmDialog` para confirmaciones peligrosas.

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `prisma/schema.prisma` | Modificado | Nuevo modelo `Friendship` + enum `FriendshipStatus` |
| `app/api/friends/actions.ts` | **Nuevo** | Server actions: sendRequest, respondRequest, removeFriend, getFriends, getPendingRequests |
| `app/api/profile/actions.ts` | Modificado | Nuevas actions: changePassword, deleteAccount |
| `app/api/rooms/actions.ts` | Modificado | Nuevo: updateRoom (editar sala) |
| `app/settings/page.tsx` | Modificado | Pasar más datos al cliente |
| `components/auth/SettingsClient.tsx` | Modificado | Secciones: Cambiar contraseña, Eliminar cuenta |
| `app/rooms/[id]/settings/page.tsx` | **Nuevo** | Página de configuración de sala (server + client) |
| `components/rooms/RoomSettingsClient.tsx` | **Nuevo** | Formulario de edición de sala + gestión de baneados + botón cerrar |
| `components/chat/ChatRoom.tsx` | Modificado | Botón "Cerrar sala" para owner, importar closeRoom |
| `app/profile/[username]/page.tsx` | Modificado | Sección de amigos, botón agregar/aceptar/rechazar |
| `components/profile/ProfileClient.tsx` | **Nuevo** | Componente cliente para acciones de amistad en perfil |
| `components/layout/Header.tsx` | Modificado | Badge de solicitudes pendientes en dropdown |
| `proxy.ts` | Modificado | Proteger `/rooms/*/settings` |
| `types/index.ts` | Modificado | Nuevos tipos: FriendshipStatus, Friendship |
| `app/globals.css` | Posible modificación | Estilos para lista de amigos si es necesario |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Eliminación de cuenta rompe integridad referencial | Baja | Prisma tiene `onDelete: Cascade` en todas las relaciones; verificar antes de deploy |
| Migración de BD falla en producción | Baja | Probar migración local primero; `prisma migrate dev` → `prisma migrate deploy` |
| Solicitudes de amistad duplicadas | Baja | Unique constraint en BD + validación en server action |
| Owner cierra sala accidentalmente | Media | Doble confirmación con `ConfirmDialog` y texto de advertencia explícito |
| Cambio de contraseña deja sesiones huérfanas | Baja | El JWT sigue siendo válido hasta que expire (7 días); aceptable para MVP |
| XSS en nombre de sala editado | Baja | Sanitización server-side antes de guardar |

## Plan de Reversión (Rollback)

1. **Código**: `git revert` al commit anterior al merge de este cambio.
2. **Base de datos**: Ejecutar migración de rollback (`prisma migrate diff` para generar el SQL inverso, o restaurar snapshot de Railway).
3. **Específico**: Si solo falla una parte (ej. amigos), se puede hacer rollback parcial del modelo sin afectar salas ni settings.

## Dependencias

- Prisma ORM ya configurado con PostgreSQL en Railway.
- Sistema de auth JWT funcionando.
- Sistema de salas y roles funcionando (owner, moderator, member).
- Componentes UI retro existentes (`retro-*` classes, `Avatar`, `ConfirmDialog`).

## Criterios de Éxito

- [ ] Un usuario puede enviar solicitud de amistad desde el perfil de otro usuario.
- [ ] El destinatario ve la solicitud pendiente y puede aceptarla o rechazarla.
- [ ] Los amigos aceptados aparecen en la lista de amigos de ambos perfiles.
- [ ] Un usuario puede eliminar a un amigo de su lista.
- [ ] El Header muestra un badge con la cantidad de solicitudes pendientes.
- [ ] Un usuario puede cambiar su contraseña desde `/settings` (requiere contraseña actual).
- [ ] Un usuario puede eliminar su cuenta desde `/settings` con doble confirmación.
- [ ] El owner de una sala ve el botón ⚙️ que lo lleva a `/rooms/[id]/settings`.
- [ ] En `/rooms/[id]/settings`, el owner puede editar el nombre y descripción de la sala.
- [ ] En `/rooms/[id]/settings`, el owner puede ver la lista de usuarios baneados.
- [ ] En `/rooms/[id]/settings`, el owner puede cerrar la sala con confirmación.
- [ ] En el ChatRoom, el owner ve un botón para cerrar la sala directamente.
- [ ] Una sala cerrada no permite nuevos mensajes ni nuevos miembros.
- [ ] Todas las nuevas rutas están protegidas por el middleware de autenticación.
- [ ] El diseño visual es consistente con el tema retro 2009 existente.
