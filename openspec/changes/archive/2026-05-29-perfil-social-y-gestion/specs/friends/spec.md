# Especificación de Amistad (Friends)

## Propósito

Definir el sistema de relaciones de amistad bidireccional entre usuarios de RetroChat 2009. Permite a los usuarios conectarse socialmente mediante solicitudes que requieren aceptación mutua.

---

## Requisitos

### Requisito: Enviar solicitud de amistad

El sistema DEBE permitir a un usuario autenticado enviar una solicitud de amistad a otro usuario desde su perfil público.

La solicitud DEBE registrar el usuario que la envía (`requesterId`), el usuario destinatario (`addresseeId`), y el estado inicial `pending`.

El sistema NO DEBE permitir enviar una solicitud si ya existe una amistad (en cualquier estado: `pending`, `accepted`, `rejected`) entre los mismos dos usuarios, en cualquier dirección.

El sistema NO DEBE permitir a un usuario enviarse una solicitud de amistad a sí mismo.

#### Escenario: Solicitud enviada exitosamente

- **DADO QUE** el usuario "pepe" está autenticado y visita el perfil de "lola"
- **Y** no existe ninguna relación de amistad previa entre "pepe" y "lola"
- **CUANDO** "pepe" presiona el botón "Agregar amigo" en el perfil de "lola"
- **ENTONCES** se crea un registro en `friendships` con `requester_id = pepe.id`, `addressee_id = lola.id`, `status = pending`
- **Y** "pepe" ve el botón cambiar a "Solicitud enviada ✓" (deshabilitado)
- **Y** "lola" recibe una notificación visual de solicitud pendiente en el Header

#### Escenario: Solicitud duplicada bloqueada

- **DADO QUE** "pepe" ya envió una solicitud pendiente a "lola"
- **CUANDO** "pepe" intenta enviar otra solicitud a "lola" (por cualquier medio)
- **ENTONCES** el sistema retorna un error: "Ya existe una solicitud de amistad pendiente con este usuario"

#### Escenario: Solicitud a uno mismo bloqueada

- **DADO QUE** "pepe" está autenticado
- **CUANDO** "pepe" intenta enviarse una solicitud de amistad a sí mismo
- **ENTONCES** el sistema retorna un error: "No podés enviarte una solicitud a vos mismo"

#### Escenario: Solicitud cuando ya son amigos

- **DADO QUE** "pepe" y "lola" ya son amigos (`status = accepted`)
- **CUANDO** "pepe" intenta enviar una nueva solicitud
- **ENTONCES** el sistema retorna un error: "Ya son amigos"

---

### Requisito: Responder solicitud de amistad

El sistema DEBE permitir al destinatario de una solicitud aceptarla o rechazarla.

Al aceptar, el estado DEBE cambiar a `accepted` y ambos usuarios DEBEN aparecer en las listas de amigos del otro.

Al rechazar, el estado DEBE cambiar a `rejected`. Una solicitud rechazada PODRÁ ser re-enviada por el solicitante original después de 24 horas.

#### Escenario: Aceptar solicitud

- **DADO QUE** "lola" tiene una solicitud pendiente de "pepe"
- **CUANDO** "lola" visita su lista de solicitudes pendientes y presiona "Aceptar"
- **ENTONCES** el registro de amistad cambia a `status = accepted`
- **Y** "pepe" aparece en la lista de amigos de "lola"
- **Y** "lola" aparece en la lista de amigos de "pepe"
- **Y** la notificación de solicitud pendiente desaparece del Header de "lola"

#### Escenario: Rechazar solicitud

- **DADO QUE** "lola" tiene una solicitud pendiente de "pepe"
- **CUANDO** "lola" presiona "Rechazar"
- **ENTONCES** el registro de amistad cambia a `status = rejected`
- **Y** la notificación desaparece del Header de "lola"
- **Y** "pepe" puede volver a enviar la solicitud después de 24 horas

#### Escenario: Responder sin estar autenticado

- **DADO QUE** un usuario no autenticado intenta responder una solicitud
- **CUANDO** se invoca la acción `respondFriendRequest`
- **ENTONCES** el sistema retorna un error: "Debes iniciar sesión"

#### Escenario: Responder solicitud que no es propia

- **DADO QUE** "pepe" intenta aceptar una solicitud dirigida a "lola"
- **CUANDO** se invoca la acción
- **ENTONCES** el sistema retorna un error: "Sin permisos para responder esta solicitud"

---

### Requisito: Eliminar amistad

El sistema DEBE permitir a cualquiera de los dos amigos eliminar la relación de amistad.

Al eliminar, el registro DEBE ser borrado físicamente de la base de datos (no soft-delete), y ambos usuarios DEBEN dejar de verse en sus listas de amigos mutuamente.

#### Escenario: Eliminar amigo

- **DADO QUE** "pepe" y "lola" son amigos (`status = accepted`)
- **CUANDO** "pepe" presiona "Eliminar amigo" desde su lista de amigos
- **ENTONCES** el registro de amistad es eliminado de la base de datos
- **Y** "lola" ya no aparece en la lista de amigos de "pepe"
- **Y** "pepe" ya no aparece en la lista de amigos de "lola"
- **Y** "pepe" puede volver a enviar una solicitud de amistad a "lola"

#### Escenario: Confirmación antes de eliminar

- **DADO QUE** "pepe" presiona "Eliminar amigo" junto a "lola"
- **CUANDO** se muestra el diálogo de confirmación
- **ENTONCES** el diálogo DEBE mostrar el mensaje "¿Eliminar a lola de tus amigos?"
- **Y** DEBE tener botones "Cancelar" y "Eliminar"
- **Y** solo al presionar "Eliminar" se ejecuta la acción

---

### Requisito: Listar amigos

El sistema DEBE mostrar la lista de amigos de un usuario en su perfil público (`/profile/[username]`).

La lista DEBE mostrar: avatar, displayName, @username, y estado (online/away/busy/invisible) de cada amigo.

La lista DEBE estar ordenada alfabéticamente por displayName.

Si el perfil visitado es el del usuario autenticado, DEBE mostrar también las solicitudes pendientes recibidas, con opciones para aceptar o rechazar.

#### Escenario: Ver amigos en perfil ajeno

- **DADO QUE** "pepe" visita el perfil de "lola" (`/profile/lola`)
- **Y** "lola" tiene 3 amigos aceptados
- **CUANDO** la página carga
- **ENTONCES** se muestra la sección "👥 Amigos (3)" con los 3 amigos listados
- **Y** cada amigo muestra su avatar, nombre y estado
- **Y** cada amigo es un enlace a su perfil

#### Escenario: Ver amigos en perfil propio

- **DADO QUE** "pepe" visita su propio perfil (`/profile/pepe`)
- **CUANDO** la página carga
- **ENTONCES** se muestra la sección "👥 Mis Amigos" con sus amigos aceptados
- **Y** se muestra la sub-sección "📨 Solicitudes pendientes (N)" si tiene solicitudes sin responder
- **Y** cada solicitud pendiente muestra botones "Aceptar" y "Rechazar"

#### Escenario: Perfil sin amigos

- **DADO QUE** "lola" no tiene amigos ni solicitudes pendientes
- **CUANDO** un usuario visita su perfil
- **ENTONCES** se muestra "Sin amigos todavía" en la sección de amigos

---

### Requisito: Badge de solicitudes pendientes

El sistema DEBE mostrar en el Header, dentro del dropdown del menú de usuario, un indicador numérico de solicitudes de amistad pendientes de respuesta.

El badge DEBE actualizarse al aceptar o rechazar una solicitud.

#### Escenario: Badge visible con solicitudes pendientes

- **DADO QUE** "lola" tiene 2 solicitudes de amistad pendientes
- **CUANDO** "lola" abre el menú de usuario en el Header
- **ENTONCES** la opción "👥 Solicitudes de amistad" muestra un badge con el número "2"
- **Y** al hacer clic, navega a su perfil donde puede gestionarlas

#### Escenario: Sin solicitudes pendientes

- **DADO QUE** "lola" no tiene solicitudes pendientes
- **CUANDO** "lola" abre el menú de usuario
- **ENTONCES** no se muestra ningún badge numérico junto a "Solicitudes de amistad"

---

### Requisito: Botón de acción contextual en perfil ajeno

El sistema DEBE mostrar en el perfil de otro usuario un botón contextual que refleje el estado de la relación:

- Si no hay relación: botón "👤 Agregar amigo".
- Si hay solicitud pendiente enviada por el visitante: botón "✓ Solicitud enviada" (deshabilitado).
- Si hay solicitud pendiente recibida del visitado: botones "Aceptar" / "Rechazar".
- Si son amigos: botón "✓ Amigos" con opción de eliminar.
- Si es el propio perfil: no mostrar botón de amistad.

#### Escenario: Sin relación previa

- **DADO QUE** "pepe" visita el perfil de "lola" y no tienen relación
- **CUANDO** la página carga
- **ENTONCES** se muestra el botón "👤 Agregar amigo"
- **Y** al presionarlo se envía la solicitud

#### Escenario: Solicitud pendiente enviada

- **DADO QUE** "pepe" envió solicitud a "lola" y está `pending`
- **CUANDO** "pepe" visita el perfil de "lola"
- **ENTONCES** se muestra "✓ Solicitud enviada" (deshabilitado)

#### Escenario: Ya son amigos

- **DADO QUE** "pepe" y "lola" son amigos
- **CUANDO** "pepe" visita el perfil de "lola"
- **ENTONCES** se muestra "✓ Amigos" con un botón secundario para eliminar la amistad
