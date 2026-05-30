# 💬 RetroChat 2009

> El chat de salas más nostálgico de la web. Estética MSN Messenger 2009, tecnología 2026.

**RetroChat 2009** es una aplicación de chat con salas en tiempo real, inspirada en MSN Messenger, IRC, MetroFLOG y las salas de chat de los 2000. Construida con Next.js 16, TypeScript, Prisma, PostgreSQL y JWT.

---

## ✨ Funcionalidades

### 🔐 Autenticación 2009
- Registro solo con **usuario + contraseña** (sin email, como en la época)
- Login con username, JWT con cookie `rc_session`
- Roles: usuario, moderador, admin global
- Cambio de contraseña y eliminación de cuenta

### 💬 Chat en Tiempo Real
- **SSE (Server-Sent Events)** para mensajes instantáneos, presencia y zumbidos
- **Typing indicators**: "Alguien está escribiendo…"
- Mensajes con scroll infinito (carga 30 por lote)
- Soft delete de mensajes (moderadores/owner)

### 👥 Salas
- Públicas y privadas (con contraseña hasheada bcrypt)
- Categorías: general, música, tecnología, juegos, deportes, random
- Sidebar de usuarios con estados (online, away, busy, invisible)
- **Owner** puede: editar sala, banear usuarios, promover moderadores, **cerrar sala**
- **Moderador** puede: banear, eliminar mensajes
- `/rooms/[id]/settings` para configurar sala

### 👤 Perfil Social
- Perfil público con avatar, bio, estado, salas
- **Sistema de amigos** bidireccional: enviar, aceptar, rechazar, eliminar
- Badge de solicitudes pendientes en el Header

### 💬 Mensajes Privados MSN-Style
- **Ventana popup** 400x500 estilo MSN Messenger
- **Barra de notificación amarilla** parpadeante al recibir mensaje
- **Sonido MSN** al recibir DM (beep) y zumbido (buzz)
- **Título parpadeante** cuando la pestaña está en segundo plano
- Comando `/msg usuario texto`
- Chat privado con SSE en tiempo real
- Lista de conversaciones en `/messages`

### 😊 Emoticones 2009 (45+)
`:D` `:)` `:P` `;)` `:(` `xD` `<3` `:O` `:S` `:/` `:*` `B)` `O:)` `3:)` `>:(` `^_^` `-_-` `:3` `:v` `:$` `:@` `:'(` `(Y)` `(N)` y más

### 🎸 ASCII Art
- Detección automática de arte ASCII (monospace + pre-wrap)
- Sin escape de caracteres especiales (`/`, `\`, `¶`, `ø`, `¢`)
- Soporte para mensajes de hasta 5000 caracteres

### ⌨️ Comandos IRC
| Comando | Descripción |
|---|---|
| `/help` | Mostrar todos los comandos |
| `/clear` | Limpiar pantalla del chat |
| `/rules` | Reglas de la sala |
| `/me texto` | Acción (`* pepe baila`) |
| `/msg usuario texto` | Mensaje privado (abre popup) |
| `/topic` | Info de la sala |
| `/online` | Usuarios conectados |

### 🔔 Zumbido MSN
- Botón 🔔 con cooldown de 30s
- Sonido vibrante (Web Audio API)
- Animación de pantalla para todos los usuarios
- Mensaje sistema: "🔔 ¡Pepe envió un zumbido!"

### 🔗 URLs Cliqueables
- Detección automática de links
- Emoticones no se aplican dentro de URLs
- `target="_blank"` con `rel="noopener noreferrer"`

### 🎨 Customización
- **Zoom de letra**: 5 niveles (xs → xl) con botones A-/A+
- **Auto-focus**: cualquier tecla enfoca el chat
- **Shift+Enter**: salto de línea en mensajes
- Estados de usuario personalizables

### 🛡️ Moderación
- Reportes anónimos con panel admin
- Bloqueo de usuarios
- Ban de sala (permanente)
- Soft delete de mensajes

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router + Route Groups) + TypeScript |
| Estilos | Tailwind CSS v4 + CSS custom (estética retro 2009) |
| Base de Datos | PostgreSQL en Railway |
| ORM | **Prisma** v6 (schema, migrations, db push) |
| Autenticación | **JWT** con `jose` + cookies httpOnly |
| Tiempo Real | **SSE** (Server-Sent Events) con polling 3s |
| Sonido | **Web Audio API** (beep MSN + zumbido) |
| Deploy | **Railway** |
| Seguridad | bcryptjs + validación server-side + headers HTTP |

---

## 📁 Estructura del Proyecto

```
chat.com/
├── app/
│   ├── layout.tsx                    # Root layout (html/body)
│   ├── globals.css                   # Estilos retro 2009
│   ├── (main)/                       # Route Group: layout con Header/Footer
│   │   ├── layout.tsx                # Header + Footer + TitleBlink
│   │   ├── page.tsx                  # Landing page
│   │   ├── login/page.tsx            # Login (username + contraseña)
│   │   ├── register/page.tsx         # Registro (sin email)
│   │   ├── rooms/
│   │   │   ├── page.tsx              # Listado de salas
│   │   │   ├── new/page.tsx          # Crear sala
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Chat de sala
│   │   │       └── settings/page.tsx # Config de sala (owner)
│   │   ├── profile/[username]/       # Perfil público + amigos
│   │   ├── messages/page.tsx         # Lista de conversaciones
│   │   ├── settings/page.tsx         # Config de cuenta
│   │   └── admin/page.tsx            # Panel admin
│   ├── (chat)/                       # Route Group: layout SIN Header/Footer
│   │   └── messages/[username]/      # Chat privado (popup MSN)
│   └── api/
│       ├── auth/                     # Auth (signup, signin, me, actions)
│       ├── rooms/                    # Salas (actions, events SSE, broadcast)
│       ├── messages/                 # Mensajes de sala (actions)
│       ├── dm/                       # Mensajes privados (actions, events SSE)
│       ├── friends/                  # Sistema de amigos (actions)
│       └── profile/                  # Perfil (update, changePassword, deleteAccount)
├── components/
│   ├── layout/
│   │   ├── Header.tsx                # Nav, usuario, badge amigos/DMs, notificación MSN
│   │   ├── Footer.tsx                # Footer retro
│   │   └── TitleBlink.tsx            # Parpadeo de título + init audio
│   ├── ui/
│   │   ├── Avatar.tsx                # Avatar con DiceBear fallback
│   │   ├── ConfirmDialog.tsx         # Dialog de confirmación
│   │   └── Toaster.tsx               # Notificaciones toast
│   ├── chat/
│   │   ├── ChatRoom.tsx              # Chat principal (1000+ líneas)
│   │   └── EmojiPicker.tsx           # Picker de emoticones 2009
│   ├── dm/
│   │   └── DirectChat.tsx            # Chat privado MSN-Style
│   ├── profile/
│   │   └── ProfileClient.tsx         # Botones de amistad contextuales
│   ├── rooms/
│   │   └── RoomSettingsClient.tsx    # Form editar sala + baneados
│   ├── auth/
│   │   └── SettingsClient.tsx        # Perfil, seguridad, zona peligro
│   └── admin/
│       └── AdminClient.tsx           # Panel admin
├── lib/
│   ├── auth/
│   │   ├── index.ts                  # JWT: createSessionToken, getSession, cookies
│   │   └── client.ts                 # Cliente HTTP: signIn, signUp, getCurrentUser
│   ├── db/
│   │   └── prisma.ts                 # Prisma client singleton
│   ├── audio.ts                      # Web Audio API: beep MSN + buzz
│   ├── broadcast-store.ts            # Store compartido para zumbidos
│   └── utils.ts                      # sanitizeMessage, convertEmoticons, isAsciiArt,
│                                      # processMessageContent, formatRelativeTime, etc.
├── prisma/
│   └── schema.prisma                 # Schema: User, Profile, Room, Message,
│                                      # Friendship, DirectMessage, Block, Report, etc.
├── instrumentation.ts                # prisma db push automático al arrancar
├── proxy.ts                          # Middleware: protección de rutas + SSE proxy
├── types/index.ts                    # Tipos TypeScript + EMOTICONS
└── package.json                      # Scripts: dev, build, start, db:push
```

---

## 🗄️ Base de Datos (Prisma + PostgreSQL)

### Modelos

| Modelo | Tabla | Descripción |
|---|---|---|
| User | `users` | Autenticación (id, passwordHash) |
| Profile | `profiles` | Perfil público (username, displayName, avatar, status, bio, role) |
| Room | `rooms` | Salas (name, slug, description, category, isPrivate, passwordHash) |
| RoomMember | `room_members` | Membresías (role, bannedAt, banReason) |
| Message | `messages` | Mensajes de sala (content, isSystem, soft delete) |
| **Friendship** | `friendships` | Amistad (status: pending/accepted/rejected) |
| **DirectMessage** | `direct_messages` | Mensajes privados (senderId, receiverId, readAt) |
| Block | `blocks` | Usuarios bloqueados |
| Report | `reports` | Reportes de contenido |
| RoomPresence | `room_presence` | Presencia activa en salas |

---

## 🚀 Desarrollo Local

### Prerrequisitos
- Node.js 18+
- PostgreSQL (local o Railway)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de entorno
```env
# .env.local
DATABASE_URL="postgresql://user:pass@host:5432/retrochat"
JWT_SECRET="tu-secreto-jwt-min-32-chars"
```

### 3. Sincronizar base de datos
```bash
npx prisma db push
npx prisma generate
```

### 4. Correr
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy en Railway

1. Conectar repositorio de GitHub
2. Agregar variable `DATABASE_URL` (Railway PostgreSQL)
3. Agregar `JWT_SECRET`
4. Deploy automático al pushear a `main`

El build ejecuta `prisma generate && next build`.  
Al arrancar, `instrumentation.ts` ejecuta `prisma db push` automáticamente.

---

## 🔐 Seguridad

- **JWT** con `jose` (HS256), cookies `httpOnly`, `sameSite: lax`, 7 días
- **Contraseñas** hasheadas con bcryptjs (salt 10)
- **Validación server-side** en todas las mutaciones (Server Actions)
- **Headers**: X-Frame-Options, X-XSS-Protection, X-Content-Type-Options
- **React** escapa XSS automáticamente al renderizar `{text}`

---

*"Mejor visto en Internet Explorer 7 a 1024x768 resolución" — RetroChat 2009*
