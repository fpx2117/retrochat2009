# Especificación de Configuración de Cuenta (Account)

## Propósito

Definir las funcionalidades de autogestión de cuenta que permiten al usuario cambiar su contraseña y eliminar permanentemente su cuenta en RetroChat 2009.

---

## Requisitos

### Requisito: Cambiar contraseña

El sistema DEBE permitir a un usuario autenticado cambiar su contraseña desde la página `/settings`.

El cambio DEBE requerir la contraseña actual para verificar la identidad del usuario.

La nueva contraseña DEBE tener un mínimo de 6 caracteres.

La nueva contraseña DEBE ser confirmada (ingresada dos veces) para evitar errores de tipeo.

Al cambiar la contraseña, el hash almacenado en `users.passwordHash` DEBE actualizarse con el nuevo hash bcrypt.

La sesión actual NO DEBE invalidarse (el JWT sigue válido hasta su expiración natural).

#### Escenario: Cambio de contraseña exitoso

- **DADO QUE** "pepe" está autenticado y en `/settings`
- **Y** su contraseña actual es "oldpass123"
- **CUANDO** "pepe" completa el formulario:
  - Contraseña actual: "oldpass123"
  - Nueva contraseña: "newpass456"
  - Confirmar contraseña: "newpass456"
- **Y** presiona "Cambiar contraseña"
- **ENTONCES** el hash en `users.passwordHash` se actualiza
- **Y** se muestra el mensaje "✅ Contraseña actualizada correctamente"
- **Y** "pepe" puede iniciar sesión con "newpass456" en el futuro

#### Escenario: Contraseña actual incorrecta

- **DADO QUE** "pepe" está en `/settings`
- **CUANDO** ingresa una contraseña actual que no coincide con el hash almacenado
- **ENTONCES** el sistema retorna un error: "La contraseña actual es incorrecta"
- **Y** el hash NO se modifica

#### Escenario: Nueva contraseña muy corta

- **DADO QUE** "pepe" está en `/settings`
- **CUANDO** ingresa una nueva contraseña de menos de 6 caracteres
- **ENTONCES** el sistema retorna un error: "La nueva contraseña debe tener al menos 6 caracteres"
- **Y** el hash NO se modifica

#### Escenario: Las contraseñas nuevas no coinciden

- **DADO QUE** "pepe" está en `/settings`
- **CUANDO** la nueva contraseña y la confirmación no coinciden
- **ENTONCES** el sistema retorna un error: "Las contraseñas no coinciden"
- **Y** el hash NO se modifica

#### Escenario: Usuario no autenticado

- **DADO QUE** un usuario no autenticado intenta cambiar la contraseña
- **CUANDO** se invoca la acción `changePassword`
- **ENTONCES** el sistema retorna un error: "Debes iniciar sesión"

---

### Requisito: Eliminar cuenta

El sistema DEBE permitir a un usuario autenticado eliminar permanentemente su cuenta desde `/settings`.

La eliminación DEBE requerir confirmación explícita en dos pasos:
  1. El usuario presiona "Eliminar cuenta" → se muestra un diálogo de advertencia.
  2. El usuario DEBE ingresar su contraseña actual en el diálogo para confirmar.

Al eliminar la cuenta, el registro en `users` DEBE ser eliminado, lo que por cascada (`onDelete: Cascade`) DEBE eliminar:
  - `profiles` (y por ende username, displayName, avatarUrl, bio)
  - `room_members` (membresías en salas)
  - `messages` (mensajes enviados)
  - `blocks` (bloqueos realizados y recibidos)
  - `reports` (reportes realizados y recibidos)
  - `room_presence` (presencia en salas)
  - `friendships` (relaciones de amistad)

Las salas donde el usuario era owner DEBERÍAN transferirse o cerrarse. Para MVP, el `onDelete: Cascade` en `Room.ownerId` implica que las salas owned SE ELIMINAN (esto debe ser advertido al usuario).

La cookie de sesión DEBE ser limpiada y el usuario redirigido a la página principal.

#### Escenario: Eliminación de cuenta exitosa

- **DADO QUE** "pepe" está autenticado y en `/settings`
- **CUANDO** presiona "🗑️ Eliminar cuenta"
- **ENTONCES** se muestra un diálogo con el texto: 
  "⚠️ Esta acción es irreversible. Se eliminarán: tu perfil, mensajes, salas donde sos dueño, y todas tus relaciones. Ingresá tu contraseña para confirmar."
- **Y** el diálogo tiene un campo de contraseña y botones "Cancelar" / "Eliminar definitivamente"
- **CUANDO** "pepe" ingresa su contraseña correcta y presiona "Eliminar definitivamente"
- **ENTONCES** su registro en `users` es eliminado
- **Y** todos los datos en cascada son eliminados
- **Y** la cookie `rc_session` es limpiada
- **Y** "pepe" es redirigido a `/`
- **Y** se muestra un toast: "Tu cuenta ha sido eliminada."

#### Escenario: Contraseña incorrecta en confirmación

- **DADO QUE** "pepe" está en el diálogo de eliminación de cuenta
- **CUANDO** ingresa una contraseña incorrecta y presiona "Eliminar definitivamente"
- **ENTONCES** el sistema retorna un error: "Contraseña incorrecta"
- **Y** la cuenta NO se elimina

#### Escenario: Cancelar eliminación

- **DADO QUE** "pepe" está en el diálogo de eliminación de cuenta
- **CUANDO** presiona "Cancelar"
- **ENTONCES** el diálogo se cierra
- **Y** no se realiza ninguna acción

#### Escenario: Usuario no autenticado

- **DADO QUE** un usuario no autenticado intenta eliminar una cuenta
- **CUANDO** se invoca la acción `deleteAccount`
- **ENTONCES** el sistema retorna un error: "Debes iniciar sesión"

---

### Requisito: UI de secciones en Settings

La página `/settings` DEBE organizar sus funcionalidades en secciones visualmente separadas:

1. **Perfil** (existente): displayName, bio, avatarUrl, status.
2. **Seguridad** (nuevo): formulario de cambio de contraseña.
3. **Zona de peligro** (nuevo): botón de eliminar cuenta.

La sección "Zona de peligro" DEBE estar claramente diferenciada visualmente (borde rojo, fondo rojo claro) para advertir sobre la irreversibilidad.

#### Escenario: Settings con todas las secciones

- **DADO QUE** "pepe" está autenticado y visita `/settings`
- **CUANDO** la página carga
- **ENTONCES** se muestran tres secciones distintas:
  - "😊 Perfil" con los campos de edición existentes
  - "🔒 Seguridad" con el formulario de cambio de contraseña
  - "⚠️ Zona de peligro" con el botón de eliminar cuenta y fondo/borde rojo

#### Escenario: Navegación entre secciones

- **DADO QUE** la página de settings tiene múltiples secciones
- **CUANDO** el usuario hace scroll
- **ENTONCES** todas las secciones son visibles en una sola página (sin tabs ni navegación interna)
