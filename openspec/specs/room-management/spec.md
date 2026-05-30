# Especificación de Gestión de Salas (Room Management)

## Propósito

Definir las funcionalidades de administración que permiten al dueño (owner) de una sala gestionarla: editar sus propiedades, cerrarla definitivamente, y revisar el historial de usuarios expulsados.

---

## Requisitos

### Requisito: Página de configuración de sala

El sistema DEBE proveer una página accesible en `/rooms/[id]/settings` exclusivamente para el owner de la sala.

La página DEBE ser un Server Component que carga los datos de la sala y los miembros baneados, y delega la interactividad a un Client Component.

Si el usuario no es el owner de la sala, DEBE ser redirigido a `/rooms/[id]` con un mensaje de error.

Si la sala no existe o está cerrada, DEBE mostrar un estado de "Sala no encontrada".

#### Escenario: Owner accede a settings de su sala

- **DADO QUE** "pepe" es owner de la sala "Rock Nacional"
- **CUANDO** "pepe" navega a `/rooms/[id]/settings`
- **ENTONCES** la página carga mostrando:
  - Formulario de edición (nombre, descripción, categoría, privacidad)
  - Lista de miembros baneados (si los hay)
  - Botón "Cerrar sala definitivamente"
  - Enlace "← Volver a la sala"

#### Escenario: No-owner intenta acceder

- **DADO QUE** "lola" es miembro (rol `member`) de la sala pero no owner
- **CUANDO** "lola" intenta acceder a `/rooms/[id]/settings`
- **ENTONCES** es redirigida a `/rooms/[id]`
- **Y** se muestra un toast: "Solo el dueño puede configurar esta sala"

#### Escenario: Sala cerrada

- **DADO QUE** la sala "Rock Nacional" fue cerrada (`closedAt` no es null)
- **CUANDO** cualquier usuario intenta acceder a `/rooms/[id]/settings`
- **ENTONCES** se muestra un mensaje: "Esta sala fue cerrada"
- **Y** no se muestran controles de edición

#### Escenario: Usuario no autenticado

- **DADO QUE** un usuario no autenticado intenta acceder a `/rooms/[id]/settings`
- **CUANDO** el middleware procesa la solicitud
- **ENTONCES** es redirigido a `/login?redirect=/rooms/[id]/settings`

---

### Requisito: Editar sala

El sistema DEBE permitir al owner editar las siguientes propiedades de su sala:
- `name` (2-50 caracteres)
- `description` (máximo 200 caracteres)
- `category` (debe ser una de las categorías válidas)
- `isPrivate` (pública o privada)

El `slug` NO DEBE ser editable directamente (se regenera automáticamente si cambia el nombre).

La contraseña de sala privada NO DEBE ser editable desde esta interfaz en el MVP (se mantiene la que se configuró al crear).

Al guardar los cambios, el sistema DEBE validar los campos con las mismas reglas que `createRoom`.

#### Escenario: Editar nombre y descripción

- **DADO QUE** "pepe" es owner de "Rock Nacional" y está en `/rooms/[id]/settings`
- **CUANDO** cambia el nombre a "Rock Argentino" y la descripción a "Lo mejor del rock nacional e internacional"
- **Y** presiona "💾 Guardar cambios"
- **ENTONCES** la sala se actualiza con los nuevos valores
- **Y** el `slug` se regenera automáticamente si es necesario
- **Y** se muestra un toast: "✅ Sala actualizada"
- **Y** `updatedAt` se actualiza a la fecha/hora actual

#### Escenario: Nombre inválido

- **DADO QUE** "pepe" está en la configuración de su sala
- **CUANDO** deja el campo nombre vacío o con menos de 2 caracteres
- **ENTONCES** se muestra un error de validación: "El nombre debe tener entre 2 y 50 caracteres"
- **Y** no se guardan los cambios

#### Escenario: Cambiar categoría

- **DADO QUE** "pepe" quiere cambiar la categoría de "general" a "música"
- **CUANDO** selecciona "música" en el dropdown y guarda
- **ENTONCES** la categoría de la sala se actualiza a "música"

#### Escenario: Cambiar visibilidad

- **DADO QUE** "pepe" tiene una sala pública
- **CUANDO** marca "Sala privada" y guarda
- **ENTONCES** la sala pasa a ser privada (`isPrivate = true`)
- **Y** la contraseña existente (si la hay) se mantiene
- **Y** los miembros actuales no son expulsados

---

### Requisito: Cerrar sala definitivamente

El sistema DEBE permitir al owner cerrar su sala de forma permanente.

El cierre DEBE ser realizado mediante la acción existente `closeRoom(roomId)`, que establece `closedAt` a la fecha/hora actual.

El cierre DEBE requerir confirmación explícita mediante un diálogo de confirmación.

Una sala cerrada:
- NO DEBE aparecer en el listado de salas públicas.
- NO DEBE permitir nuevos mensajes.
- NO DEBE permitir nuevos miembros.
- NO DEBE poder ser re-abierta (en el MVP).
- Los miembros existentes PUEDEN seguir viendo el historial de mensajes.

#### Escenario: Cerrar sala con confirmación

- **DADO QUE** "pepe" es owner y está en `/rooms/[id]/settings`
- **CUANDO** presiona "🔒 Cerrar sala definitivamente"
- **ENTONCES** se muestra un `ConfirmDialog` con:
  - Título: "⚠️ ¿Cerrar esta sala?"
  - Mensaje: "La sala se cerrará permanentemente. Nadie más podrá entrar ni enviar mensajes. Esta acción no se puede deshacer."
  - Botones: "Cancelar" / "Cerrar sala"
- **CUANDO** "pepe" confirma presionando "Cerrar sala"
- **ENTONCES** `closedAt` se establece en el timestamp actual
- **Y** "pepe" es redirigido a `/rooms`
- **Y** se muestra un toast: "🔒 Sala cerrada permanentemente"

#### Escenario: Cancelar cierre

- **DADO QUE** "pepe" abrió el diálogo de confirmación de cierre
- **CUANDO** presiona "Cancelar"
- **ENTONCES** el diálogo se cierra y no se realiza ninguna acción

#### Escenario: Cerrar sala desde el ChatRoom (botón rápido)

- **DADO QUE** "pepe" es owner y está dentro del ChatRoom de su sala
- **CUANDO** presiona el botón "🔒 Cerrar sala" en el header de la sala
- **ENTONCES** se muestra el mismo `ConfirmDialog` de confirmación
- **Y** al confirmar, la sala se cierra
- **Y** "pepe" es redirigido a `/rooms`

#### Escenario: No-owner intenta cerrar sala

- **DADO QUE** "lola" es miembro regular de la sala
- **CUANDO** intenta ejecutar `closeRoom`
- **ENTONCES** el sistema retorna un error: "Sin permisos para cerrar esta sala"

#### Escenario: Admin global cierra sala

- **DADO QUE** "admin" tiene rol global `admin`
- **CUANDO** ejecuta `closeRoom` en cualquier sala
- **ENTONCES** la sala se cierra exitosamente
- **Y** el admin no necesita ser miembro de la sala

---

### Requisito: Lista de usuarios baneados

El sistema DEBE mostrar en `/rooms/[id]/settings` una lista de los usuarios que han sido expulsados (baneados) de la sala.

Cada entrada DEBE mostrar:
- Avatar y nombre del usuario baneado
- Fecha del ban (`bannedAt`)
- Motivo del ban (`banReason`)
- Usuario que ejecutó el ban (`bannedBy`)

La lista DEBE consultar `room_members` donde `bannedAt IS NOT NULL` para la sala actual.

En el MVP, el sistema NO DEBE permitir desbanear usuarios desde la UI.

#### Escenario: Ver lista de baneados

- **DADO QUE** la sala "Rock Nacional" tiene 2 miembros baneados
- **CUANDO** el owner visita `/rooms/[id]/settings`
- **ENTONCES** se muestra la sección "🚫 Usuarios expulsados (2)"
- **Y** cada entrada muestra: avatar, nombre, fecha de expulsión y motivo

#### Escenario: Sin usuarios baneados

- **DADO QUE** la sala no tiene miembros baneados
- **CUANDO** el owner visita `/rooms/[id]/settings`
- **ENTONCES** se muestra "No hay usuarios expulsados" en la sección correspondiente

---

### Requisito: Acceso a configuración desde el ChatRoom

El sistema DEBE mostrar en el header del `ChatRoom` un enlace o botón visible que lleve a `/rooms/[id]/settings` cuando el usuario es owner de la sala.

Este enlace ya existe parcialmente (ícono ⚙️ en línea 436 de ChatRoom.tsx) y DEBE seguir funcionando correctamente apuntando a la nueva ruta.

#### Escenario: Owner ve botón de configuración

- **DADO QUE** "pepe" es owner y está dentro del ChatRoom de su sala
- **CUANDO** observa el header de la sala
- **ENTONCES** ve un botón/badge "⚙️ Configurar" que enlaza a `/rooms/[id]/settings`

#### Escenario: Miembro regular no ve botón de configuración

- **DADO QUE** "lola" es miembro regular de la sala
- **CUANDO** observa el header de la sala
- **ENTONCES** NO ve el botón de configuración de sala
- **Y** solo ve el botón "🚪 Salir" (existente)

#### Escenario: Moderador no ve botón de configuración

- **DADO QUE** "juan" es moderador de la sala (pero no owner)
- **CUANDO** observa el header de la sala
- **ENTONCES** NO ve el botón de configuración de sala
- **Y** solo ve el botón "🚪 Salir" (existente)

---

### Requisito: Protección de ruta en middleware

La ruta `/rooms/[id]/settings` DEBE estar protegida por el middleware de autenticación (`proxy.ts`).

El patrón de ruta DEBE ser agregado a `protectedPaths` en `proxy.ts`.

#### Escenario: Middleware protege la ruta

- **DADO QUE** un usuario no autenticado intenta acceder a `/rooms/abc123/settings`
- **CUANDO** el middleware procesa la solicitud
- **ENTONCES** es redirigido a `/login?redirect=/rooms/abc123/settings`
