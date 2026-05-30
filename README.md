# 💬 RetroChat 2009

> El chat de salas más nostálgico de la web moderna. Estética 2009, tecnología 2024.

**RetroChat 2009** es una aplicación web de chat con salas en tiempo real, inspirada visualmente en las plataformas sociales del año 2009: MSN Messenger, IRC, foros, salas de chat web. Construida con Next.js, TypeScript, Tailwind CSS y Supabase.

---

## ✨ Funcionalidades

- **Autenticación completa**: Registro, login, logout, perfil público
- **Salas de chat**: Públicas y privadas (con contraseña), creación, listado, búsqueda
- **Chat en tiempo real**: Mensajes instantáneos con Supabase Realtime
- **Presencia de usuarios**: Online, Ausente, Ocupado, Invisible
- **Typing indicators**: "Alguien está escribiendo…"
- **Emoticones clásicos**: `:)` → 😊, `:D` → 😄, `<3` → ❤️, etc.
- **Comandos IRC**: `/me acción`, `/clear`, `/rules`
- **Botón Zumbido**: Con cooldown de 30 segundos
- **Moderación**: Expulsar usuarios, eliminar mensajes, nombrar moderadores
- **Reportes y bloqueos**: Sistema completo de reporte y bloqueo de usuarios
- **Roles**: Usuario, Moderador de sala, Creador, Admin global
- **Panel Admin**: Ver y resolver reportes, stats globales
- **Diseño 2009**: Gradientes, botones brillantes, badges, avatares, estética retro

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS v4 + CSS custom (estética retro) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Deploy | Vercel + Supabase |
| Estado | React state + Supabase Realtime |
| Seguridad | Row Level Security (RLS) + bcryptjs + sanitización |

---

## 📁 Estructura del Proyecto

```
chat.com/
├── app/
│   ├── layout.tsx              # Layout principal con Header/Footer
│   ├── page.tsx                # Home/Landing page
│   ├── login/page.tsx          # Login
│   ├── register/page.tsx       # Registro
│   ├── rooms/
│   │   ├── page.tsx            # Listado de salas
│   │   ├── new/page.tsx        # Crear sala
│   │   └── [id]/page.tsx       # Chat de sala
│   ├── profile/[username]/     # Perfil público
│   ├── settings/page.tsx       # Configuración de perfil
│   ├── admin/page.tsx          # Panel admin
│   └── api/
│       ├── auth/actions.ts     # Server Actions: auth
│       ├── rooms/actions.ts    # Server Actions: salas
│       ├── messages/actions.ts # Server Actions: mensajes
│       └── profile/actions.ts  # Server Actions: perfil
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Header con nav y usuario
│   │   └── Footer.tsx          # Footer retro
│   ├── ui/
│   │   ├── Avatar.tsx          # Componente de avatar
│   │   ├── ConfirmDialog.tsx   # Dialog de confirmación
│   │   └── Toaster.tsx         # Sistema de notificaciones
│   ├── chat/
│   │   └── ChatRoom.tsx        # Componente principal de chat
│   ├── rooms/
│   │   └── RoomsClientWrapper.tsx  # Listado de salas con filtros
│   ├── auth/
│   │   └── SettingsClient.tsx  # Formulario de configuración
│   └── admin/
│       └── AdminClient.tsx     # Panel admin
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Supabase client (browser)
│   │   ├── server.ts           # Supabase client (servidor)
│   │   └── middleware.ts       # Actualización de sesión en middleware
│   └── utils.ts                # Utilidades: sanitización, slugs, emoticones
├── types/index.ts              # Tipos TypeScript centralizados
├── middleware.ts               # Next.js middleware (protección de rutas)
├── supabase/migrations/
│   └── 001_initial_schema.sql  # Migración SQL completa
└── .env.example                # Template de variables de entorno
```

---

## 🚀 Configuración y Desarrollo Local

### Prerrequisitos

- Node.js 18+
- npm
- Cuenta en [Supabase](https://supabase.com) (gratuita)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. En **Project Settings → API**, copia:
   - `Project URL`
   - `anon public` key
   - `service_role` key (mantenerla secreta)

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Ejecutar la migración SQL

1. Ve a **Supabase Dashboard → SQL Editor**
2. Abre el archivo `supabase/migrations/001_initial_schema.sql`
3. Copia y pega todo el contenido en el SQL Editor
4. Haz clic en **Run All**

Esto creará todas las tablas, funciones, triggers y políticas RLS automáticamente.

### 5. Configurar Auth en Supabase

En **Supabase Dashboard → Authentication → Settings**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/**`
- Para desarrollo, podés desactivar la confirmación de email

### 6. Habilitar Realtime

En **Supabase Dashboard → Database → Replication**:
- Habilitar replication para la tabla `messages`
- Habilitar replication para la tabla `room_members`

### 7. Correr localmente

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 8. Crear usuario Admin (opcional)

1. Regístrate normalmente en la app
2. En Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE username = 'tu_username';
```

---

## 🌐 Deploy en Vercel + Supabase

### 1. Deploy en Vercel

```bash
npx vercel --prod
```

O desde el dashboard de Vercel importando el repositorio.

### 2. Variables de entorno en Vercel

En Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGci...
NEXT_PUBLIC_APP_URL = https://tu-dominio.vercel.app
```

### 3. Actualizar URLs en Supabase

En **Supabase → Authentication → Settings**:
- **Site URL**: `https://tu-dominio.vercel.app`
- **Redirect URLs**: Agrega `https://tu-dominio.vercel.app/**`

---

## 🗄️ Base de Datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuarios (extiende auth.users) |
| `rooms` | Salas de chat |
| `room_members` | Membresías y roles en salas |
| `messages` | Mensajes (soft delete) |
| `blocks` | Usuarios bloqueados |
| `reports` | Reportes de contenido |
| `room_presence` | Presencia activa de usuarios |

### Políticas RLS activas

- ✅ Perfiles: lectura pública, escritura solo propia
- ✅ Salas: públicas visibles para todos; privadas solo para miembros
- ✅ Mensajes: solo miembros de sala pueden leer/escribir; no baneados
- ✅ Moderación: solo mods/owners pueden borrar mensajes
- ✅ Reportes: solo admins ven todos; usuarios ven los suyos
- ✅ Bloqueos: solo el bloqueador ve sus bloqueos

---

## 🎨 Diseño Visual

El diseño emula la estética Web 2.0 de 2009:

- **Fondo**: Gradiente azul/violeta oscuro (estilo Messenger/foro)
- **Paneles**: Fondo gradiente claro con bordes y sombras suaves
- **Botones**: Efecto brillante con gradiente (Web 2.0 glossy)
- **Tipografía**: Tahoma/Verdana/Arial (fuentes de la época)
- **Avatares**: Cuadrados 96x96, borde redondeado
- **Badges**: NEW!, HOT, ONLINE, PRIVADA
- **Emoticones**: Conversión automática de texto a emojis

---

## 💬 Comandos de Chat

| Comando | Descripción |
|---------|-------------|
| `/me <texto>` | Mensaje de acción estilo IRC |
| `/clear` | Limpiar vista del chat (local, sin borrar del servidor) |
| `/rules` | Ver reglas de la sala |

---

## 🔐 Seguridad

- **RLS (Row Level Security)** habilitado en todas las tablas
- **Contraseñas de salas** hasheadas con bcryptjs (salt 10)
- **Contenido sanitizado**: escape de HTML peligroso en mensajes
- **Rate limiting básico**: 1 mensaje por segundo por usuario (server-side)
- **Validación de permisos** en el servidor (Server Actions, nunca solo en frontend)
- **Claves privadas** nunca expuestas en el cliente
- **Headers de seguridad**: X-Frame-Options, X-XSS-Protection

---

## 📝 Datos de Ejemplo

Para probar la app, después de crear tu cuenta admin:

```sql
-- Reemplazá <tu-user-id> con tu UUID de auth.users
INSERT INTO rooms (name, slug, description, category, owner_id, is_private) VALUES
  ('Sala General', 'general', 'Bienvenidos a RetroChat 2009. ¡Hablen de todo!', 'general', '<tu-user-id>', false),
  ('Música 2009', 'musica-2009', 'Linkin Park, MCR, Soda Stereo...', 'musica', '<tu-user-id>', false),
  ('Geeks y Tecnología', 'tecnologia', 'Frikis del internet bienvenidos', 'tecnologia', '<tu-user-id>', false);

INSERT INTO room_members (room_id, user_id, role)
SELECT id, '<tu-user-id>', 'owner' FROM rooms WHERE owner_id = '<tu-user-id>';
```

---

## 🐛 Troubleshooting

**Los mensajes no llegan en tiempo real**
→ Verificá que Realtime está habilitado en Supabase → Database → Replication

**Error de autenticación al registrarse**
→ Revisá las Redirect URLs en Supabase Auth Settings

**RLS bloqueando operaciones**
→ Revisá las políticas en Supabase → Authentication → Policies

**Error "Column X does not exist"**
→ Ejecutá la migración completa desde el SQL Editor de Supabase

---

*"Mejor visto en Internet Explorer 7 a 800x600 resolución" — RetroChat 2009*
# retrochat2009
