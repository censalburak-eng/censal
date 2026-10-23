export type CityRoom = {
  id: number;
  name: string;
  plateCode: string;
  region: string;
  pinnedCount: number;
  isLocked: boolean;
  // DB'de olmayan, sadece yerel datada bulunan opsiyonel alanlar
  activeUsersCount?: number;
  lastMessageSnippet?: string;
  lastMessageTime?: string;
  // DB'den gelen opsiyonel alanlar
  maxPinnedLimit?: number;
};

export type ScreenState = 'loading' | 'error' | 'empty' | 'success';

export type RoomItemProps = {
  room: CityRoom;
  onPress: (room: CityRoom) => void;
};
