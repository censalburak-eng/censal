import { MessageType } from './messages.types';

export type BlockedUser = {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  // public_profiles join
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  city_id?: number;
  plate_code?: string;
};

export type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  created_at: string;
  user_a_cleared_at?: string | null;
  user_b_cleared_at?: string | null;
  // Karşı taraf bilgisi (Frontend join)
  otherUser?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
    city_id?: number;
    plate_code?: string;
    hide_phone?: boolean;
    last_seen_at?: string | null;
  };
  lastMessageSnippet?: string;
  unreadCount?: number;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  body: string;
  media_key?: string | null;
  duration_sec?: number | null;
  lat?: number | null;
  lng?: number | null;
  is_deleted: boolean;
  read_at?: string | null;
  created_at: string;
  reply_to?: string | null;
  replyToMessage?: {
    id: string;
    userName: string;
    body: string;
  } | null;
};

export type SendDirectMessageInput = {
  conversationId: string;
  type: MessageType;
  body: string;
  mediaKey?: string | null;
  durationSec?: number | null;
  lat?: number | null;
  lng?: number | null;
  replyTo?: string | null;
  replyToMessage?: {
    id: string;
    userName: string;
    body: string;
  } | null;
};
