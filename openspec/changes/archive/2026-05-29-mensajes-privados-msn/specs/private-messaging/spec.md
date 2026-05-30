# Especificación de Mensajería Privada (Private Messaging)

## Propósito

Definir el sistema de mensajes directos entre usuarios de RetroChat 2009, inspirado en MSN Messenger: ventanas popup, comando `/msg`, notificaciones amarillas, y tiempo real vía SSE.

---

## Requisitos

### Requisito: Enviar mensaje privado desde sidebar de sala

El sistema DEBE permitir a un usuario, desde el sidebar de usuarios de cualquier sala, iniciar una conversación privada con otro miembro.

Al hacer clic, DEBE abrirse una ventana popup de 400x500px centrada con la ruta `/messages/[username]`.

Si ya existe una ventana popup abierta para esa conversación, DEBE reutilizarse (mismo `window.name`).

#### Escenario: Abrir chat desde sidebar

- **DADO QUE** "pepe" está en la sala "Rock Nacional"
- **Y** "lola" es miembro de la sala
- **CUANDO** "pepe" hace clic en "lola" en el sidebar y selecciona "💬 Mensaje privado"
- **ENTONCES** se abre un popup 400x500px centrado con la ruta `/messages/lola`
- **Y** la ventana tiene nombre `dm-lola` para reutilización

#### Escenario: Popup ya abierto se reutiliza

- **DADO QUE** "pepe" ya tiene abierto el popup de chat con "lola" (`dm-lola`)
- **CUANDO** "pepe" vuelve a seleccionar "💬 Mensaje privado" a "lola"
- **ENTONCES** la ventana existente `dm-lola` recibe foco (no se abre otra)

---

### Requisito: Comando /msg

El sistema DEBE interpretar el comando `/msg username texto` en el input de cualquier sala.

Al detectar el comando, DEBE abrir el popup de chat con `username` y enviar `texto` como primer mensaje privado.

Si el username no existe, DEBE mostrar un error local.

#### Escenario: Enviar mensaje con /msg

- **DADO QUE** "pepe" está en cualquier sala
- **CUANDO** escribe `/msg lola Hola, como estas?` y presiona Enter
- **ENTONCES** se abre popup a `/messages/lola`
- **Y** el mensaje "Hola, como estas?" se envía a "lola" como DM
- **Y** el input de la sala queda limpio

#### Escenario: /msg sin texto

- **DADO QUE** "pepe" escribe `/msg lola` sin texto adicional
- **CUANDO** presiona Enter
- **ENTONCES** se abre el popup a `/messages/lola` sin enviar mensaje

---

### Requisito: Recibir notificación MSN-Style

El sistema DEBE mostrar una barra de alerta amarilla en el Header cuando un usuario recibe un mensaje privado.

La barra DEBE contener el texto "*{username} te ha enviado un mensaje*" y un botón "Responder".

Al hacer clic en "Responder", DEBE abrirse el popup de chat con ese usuario.

La barra DEBE desaparecer al hacer clic en "✕" o al abrir la conversación.

#### Escenario: Barra de notificación

- **DADO QUE** "pepe" está en la aplicación
- **CUANDO** "lola" envía un mensaje privado a "pepe"
- **ENTONCES** aparece una barra amarilla en el Header:
  - Texto: "*lola te ha enviado un mensaje*"
  - Botón: "[Responder]"
  - Botón: "✕" para cerrar

#### Escenario: Click en Responder

- **DADO QUE** "pepe" ve la barra de notificación de "lola"
- **CUANDO** hace clic en "[Responder]"
- **ENTONCES** se abre el popup `/messages/lola`
- **Y** la barra de notificación desaparece

---

### Requisito: Chat privado en tiempo real

El sistema DEBE actualizar la conversación en tiempo real para ambos participantes vía SSE.

Cuando un participante envía un mensaje, el otro DEBE verlo aparecer sin recargar la página.

El sistema DEBE hacer scroll automático al último mensaje.

#### Escenario: Mensaje en tiempo real

- **DADO QUE** "pepe" y "lola" tienen abierto el popup de chat `/messages/lola`
- **CUANDO** "pepe" envía "hola!"
- **ENTONCES** el mensaje aparece inmediatamente en el chat de "lola" vía SSE
- **Y** el scroll baja automáticamente

---

### Requisito: Badge de mensajes no leídos

El sistema DEBE mostrar en el Header un badge con la cantidad de conversaciones con mensajes no leídos.

El badge DEBE decrementarse al abrir la conversación correspondiente.

#### Escenario: Badge de no leídos

- **DADO QUE** "pepe" no está chateando con nadie
- **CUANDO** "lola" y "juan" le envían mensajes privados
- **ENTONCES** el badge en Header muestra "2"
- **Y** al abrir el chat con "lola", el badge cambia a "1"

#### Escenario: Sin mensajes no leídos

- **DADO QUE** "pepe" leyó todos sus mensajes
- **CUANDO** observa el Header
- **ENTONCES** no se muestra badge de mensajes

---

### Requisito: Parpadeo de título

El sistema DEBE hacer parpadear el título de la pestaña del navegador cuando llega un mensaje privado y el usuario no tiene el foco en la pestaña.

El parpadeo DEBE alternar entre "💬 Nuevo mensaje!" y el título original cada 1 segundo.

El parpadeo DEBE detenerse cuando el usuario vuelve a la pestaña.

#### Escenario: Parpadeo al recibir mensaje en otra pestaña

- **DADO QUE** "pepe" tiene la pestaña de RetroChat en segundo plano
- **CUANDO** recibe un mensaje privado
- **ENTONCES** `document.title` alterna entre "💬 Nuevo mensaje!" y "RetroChat 2009" cada 1s
- **Y** al volver a la pestaña, el título se restaura a "RetroChat 2009"

---

### Requisito: Historial de conversación

El sistema DEBE cargar el historial completo de mensajes entre dos usuarios al abrir el chat.

Los mensajes DEBEN mostrarse en orden cronológico ascendente, con los más recientes al fondo.

Cada mensaje DEBE mostrar: avatar del remitente, nombre, hora (HH:mm), y contenido con emoticones convertidos.

#### Escenario: Cargar historial

- **DADO QUE** "pepe" y "lola" ya se enviaron 5 mensajes previamente
- **CUANDO** "pepe" abre `/messages/lola`
- **ENTONCES** se muestran los 5 mensajes en orden cronológico
- **Y** el más reciente está visible (scroll al fondo)

#### Escenario: Sin historial previo

- **DADO QUE** "pepe" nunca chateó con "lola"
- **CUANDO** abre `/messages/lola`
- **ENTONCES** se muestra un placeholder: "No hay mensajes todavía. ¡Decí hola! 👋"

---

### Requisito: Diseño visual MSN-Style

La página de chat DEBE tener un diseño mínimo optimizado para popup 400x500px:
- Barra de título gradiente azul con "💬 Chat con {username}" y botón cerrar "✕"
- Área de mensajes con scroll
- Barra inferior con input y botón enviar
- Sin header/footer global (layout mínimo)

Los mensajes propios DEBEN alinearse a la derecha (estilo burbuja).

#### Escenario: Layout del popup

- **DADO QUE** "pepe" abre `/messages/lola`
- **CUANDO** la página carga
- **ENTONCES** no se muestran el Header ni Footer globales
- **Y** la página ocupa 400x500px sin scroll horizontal
