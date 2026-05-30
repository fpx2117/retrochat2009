// tipos/database.ts - Tipos generados para Supabase

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserStatus = 'online' | 'away' | 'busy' | 'invisible'
export type UserRole = 'user' | 'moderator' | 'admin'
export type RoomMemberRole = 'member' | 'moderator' | 'owner'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status: UserStatus
  bio: string
  role: UserRole
  created_at: string
  last_seen_at: string
}

export interface Room {
  id: string
  name: string
  slug: string
  description: string
  category: string
  is_private: boolean
  password_hash: string | null
  owner_id: string
  max_users: number | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface RoomWithOwner extends Room {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
  member_count?: number
  active_users?: number
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  role: RoomMemberRole
  joined_at: string
  banned_at: string | null
  banned_by: string | null
  ban_reason: string | null
}

export interface RoomMemberWithProfile extends RoomMember {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url' | 'status'>
}

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  is_system: boolean
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface MessageWithProfile extends Message {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

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

export interface DirectMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read_at: string | null
}

export interface DirectMessageWithProfile extends DirectMessage {
  sender: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export interface Report {
  id: string
  reporter_id: string
  reported_user_id: string | null
  message_id: string | null
  room_id: string | null
  reason: string
  status: ReportStatus
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface TypingEvent {
  user_id: string
  username: string
  room_id: string
  timestamp: number
}

export interface PresenceState {
  user_id: string
  username: string
  avatar_url: string | null
  status: UserStatus
  online_at: string
}

// Categorías de sala
export const ROOM_CATEGORIES = [
  'general',
  'entretenimiento',
  'tecnologia',
  'musica',
  'deportes',
  'gaming',
  'anime',
  'humor',
  'adultos',
  'otros',
] as const

export type RoomCategory = (typeof ROOM_CATEGORIES)[number]

// Estados de usuario
export const USER_STATUSES: Record<UserStatus, { label: string; color: string; emoji: string }> = {
  online: { label: 'En línea', color: '#00aa00', emoji: '🟢' },
  away: { label: 'Ausente', color: '#ffaa00', emoji: '🟡' },
  busy: { label: 'Ocupado', color: '#cc0000', emoji: '🔴' },
  invisible: { label: 'Invisible', color: '#888888', emoji: '⚫' },
}

// Emoticones clásicos 2009
export const EMOTICONS: Record<string, string> = {
  // Felices
  ':)': '😊',
  ':-)': '😊',
  ':D': '😄',
  ':-D': '😄',
  '^_^': '😊',
  '^^': '😊',
  // Risa
  'xD': '😂',
  'XD': '😂',
  'xP': '😝',
  'XP': '😝',
  // Lengua
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ';P': '😜',
  // Guiño
  ';)': '😉',
  ';-)': '😉',
  // Triste
  ':(': '😢',
  ':-(': '😢',
  ":'(": '😢',
  'D:': '😨',
  // Corazón
  '<3': '❤️',
  '</3': '💔',
  // Sorpresa
  ':O': '😮',
  ':-O': '😮',
  ':o': '😮',
  'O.O': '😳',
  'o.O': '😳',
  // Confuso
  ':S': '😕',
  ':-S': '😕',
  ':/': '😕',
  ':-/': '😕',
  // Serio
  ':|': '😐',
  ':-|': '😐',
  '-_-': '😑',
  // Beso
  ':*': '😘',
  ':-*': '😘',
  // Cool
  'B)': '😎',
  'B-)': '😎',
  '8)': '😎',
  // Ángel / Diablo
  'O:)': '😇',
  '0:)': '😇',
  '3:)': '😈',
  '>:)': '😈',
  // Enojado
  '>:(': '😠',
  '>:O': '😡',
  ':@': '😡',
  // Vergüenza
  ':$': '😳',
  ':-$': '😳',
  // Otros
  ':3': '😺',
  ':B': '😬',
  ':v': '😛',
  ':V': '😛',
  ':^)': '🤡',
  '(Y)': '👍',
  '(N)': '👎',
}
