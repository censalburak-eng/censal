export type MessageType = 'text' | 'image' | 'audio' | 'location';

export type RoomMessage = {
  id: string;
  roomId: number;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  userPlateCode?: string;
  isUserPhoneHidden?: boolean;
  phone?: string;
  type: MessageType;
  body: string;
  mediaPath?: string | null;
  /** Fotograf alti aciklama yazisi */
  caption?: string | null;
  lat?: number | null;
  lng?: number | null;
  replyToId?: string | null;
  replyToMessage?: {
    userName: string;
    body: string;
  } | null;
  isPinned?: boolean;
  pinnedExpiresAt?: string | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: string | null;
  /** Sesli mesaj suresi (saniye) */
  durationSec?: number | null;
  createdAt: string;
};

export type PinnedListing = {
  id: string;
  roomId: number;
  messageId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  isPhoneHidden?: boolean;
  avatarUrl?: string | null;
  body: string;
  type?: MessageType;
  mediaPath?: string | null;
  caption?: string | null;
  lat?: number | null;
  lng?: number | null;
  durationSec?: number | null;
  startsAt: string;
  expiresAt: string;
};

export type SendMessageInput = {
  roomId: number;
  type: MessageType;
  body: string;
  mediaPath?: string | null;
  caption?: string | null;
  optimisticMediaPath?: string | null;
  lat?: number | null;
  lng?: number | null;
  replyToId?: string | null;
  replyToMessage?: {
    userName: string;
    body: string;
  } | null;
  durationSec?: number | null;
};

export type UpdateMessageInput = {
  messageId: string;
  isDeleted?: boolean;
  body?: string;
  caption?: string | null;
};
