# Propuesta: RetroChat 2009

## Intención

Crear una aplicación web de chat con salas completamente funcional, inspirada estéticamente en las plataformas sociales y de mensajería del año 2009 (MSN Messenger, IRC, foros, salas de chat web). El sistema debe ser una plataforma real con usuarios reales, autenticación segura, chat en tiempo real, moderación y roles.

## Alcance

### Dentro del Alcance
- Autenticación completa: registro, login, logout, perfil público
- Salas de chat públicas y privadas con protección por contraseña
- Chat en tiempo real via Supabase Realtime
- Presencia de usuarios (online/away/busy/invisible) y typing indicators
- Moderación: reportes, bloqueos, ban por sala, eliminación de mensajes
- Roles: usuario, moderador de sala, creador, admin global
- Diseño visual 2009: gradientes, botones brillantes, emoticones, badges
- Emoticones clásicos convertidos a íconos visuales
- Comandos IRC: /me, /clear, /rules
- Botón "Zumbido" con cooldown
- Panel admin básico
- Row Level Security en Supabase
- Deploy en Vercel + Supabase

### Fuera del Alcance
- Mensajes directos/privados entre usuarios
- Video/audio llamadas
- Mobile app nativa
- OAuth social (Google, Facebook) — solo email/password
- Push notifications nativas
- File uploads (solo URLs de avatar)

## Enfoque

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (Auth + PostgreSQL + Realtime)

Arquitectura:
- Server Components para páginas estáticas/ISR
- Client Components para UI interactiva (chat, presencia, typing)
- Server Actions + API Routes para mutaciones seguras
- Supabase client-side para subscripciones Realtime
- Middleware Next.js para protección de rutas
- RLS policies en todas las tablas sensibles

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `app/` | Nuevo | 9 rutas principales del App Router |
| `components/` | Nuevo | 40+ componentes reutilizables |
| `lib/` | Nuevo | Supabase clients, utilidades, sanitización |
| `supabase/migrations/` | Nuevo | 1 migración SQL completa |
| `types/` | Nuevo | Tipos TypeScript centralizados |
| `hooks/` | Nuevo | Hooks de React (useMessages, usePresence, useTyping) |
| `stores/` | Nuevo | Estado global con Zustand |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Rate limiting de Supabase Realtime | Media | Debounce en typing events, cleanup en unmount |
| XSS por contenido de mensajes | Alta | DOMPurify + sanitización server-side |
| Contraseñas de salas en texto plano | Alta | Hash con bcryptjs antes de guardar |
| Performance con muchos mensajes | Media | Paginación, virtualización si >100 msgs |
| CORS/CSP en Vercel | Baja | Configurar next.config correctamente |

## Plan de Reversión (Rollback)

- Base de datos: Supabase permite restaurar desde snapshots
- Frontend: Git revert al commit anterior, redeploy en Vercel
- Migraciones: Script de rollback incluido en `supabase/migrations/`

## Dependencias

- Cuenta Supabase activa con proyecto creado
- Variables de entorno: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Node.js 18+ / npm

## Criterios de Éxito

- [ ] Usuario puede registrarse con email, contraseña y username único
- [ ] Usuario puede iniciar sesión y mantener sesión activa
- [ ] Usuario puede crear sala con campos completos
- [ ] Otro usuario puede entrar a la misma sala
- [ ] Ambos pueden enviarse mensajes en tiempo real (< 500ms latencia)
- [ ] Se muestra lista de usuarios conectados en sala
- [ ] Sala privada requiere contraseña para entrar
- [ ] Moderador puede eliminar mensajes de su sala
- [ ] Usuario puede reportar y bloquear a otro usuario
- [ ] Diseño visual es claramente inspirado en 2009
- [ ] App corre localmente con instrucciones claras
- [ ] RLS policies activas en todas las tablas
