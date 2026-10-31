export type NotificationType = 'dm' | 'ban_appeal' | 'pin_expiry';

export interface BaseNotificationData {
  type: NotificationType;
}

export interface DmNotificationData extends BaseNotificationData {
  type: 'dm';
  conversationId: string;
  senderId?: string;
  senderName?: string;
}

export interface BanAppealNotificationData extends BaseNotificationData {
  type: 'ban_appeal';
  appealId?: string;
}

export interface PinExpiryNotificationData extends BaseNotificationData {
  type: 'pin_expiry';
  listingId?: string;
  cityId?: number | string;
}

export type AppNotificationData =
  | DmNotificationData
  | BanAppealNotificationData
  | PinExpiryNotificationData;
