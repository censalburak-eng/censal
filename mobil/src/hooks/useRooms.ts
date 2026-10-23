import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRoomsApi, fetchRoomDetailApi } from '../api/roomsApi';
import { CITIES_DATA } from '../data/cities';
import { CityRoom } from '../types/rooms.types';

export const roomKeys = {
  all: ['rooms'] as const,
  list: () => [...roomKeys.all, 'list'] as const,
  detail: (id: number) => [...roomKeys.all, 'detail', id] as const,
  messages: (roomId: number) => [...roomKeys.all, roomId, 'messages'] as const,
};

/**
 * 81 İl Oda Listesi Hook'u.
 * Yerel CITIES_DATA initialData ile sıfır gecikmeli başlar,
 * arka planda DB'deki güncel kontenjan ve kilit durumlarını birleştirir.
 */
export const useRooms = () => {
  return useQuery({
    queryKey: roomKeys.list(),
    queryFn: fetchRoomsApi,
    initialData: CITIES_DATA,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
};

/**
 * Tekil Oda Detayı Hook'u.
 * Liste önbelleğinde (useRooms) varsa doğrudan oradan alır; 60 saniye içinde ikinci istek atmaz.
 */
export const useRoomDetail = (roomId: number) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: roomKeys.detail(roomId),
    queryFn: () => fetchRoomDetailApi(roomId),
    initialData: (): CityRoom | undefined => {
      const cachedRooms = queryClient.getQueryData<readonly CityRoom[]>(roomKeys.list());
      const cached = cachedRooms?.find((r) => r.id === roomId);
      if (cached && cached.maxPinnedLimit) return cached;
      return undefined;
    },
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(roomKeys.list())?.dataUpdatedAt;
    },
    placeholderData: () => {
      const local = CITIES_DATA.find((c) => c.id === roomId);
      return (
        local ?? {
          id: roomId,
          name: '',
          plateCode: String(roomId).padStart(2, '0'),
          region: 'Türkiye',
          pinnedCount: 0,
          isLocked: false,
          maxPinnedLimit: 3,
        }
      );
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
};
