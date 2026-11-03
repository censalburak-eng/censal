import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { RoomDetailScreen } from '../../screens/RoomDetailScreen';
import { useAuth } from '../../hooks/useAuth';
import { useEntitlement } from '../../hooks/useEntitlement';
import { LoadingView } from '../../components/ui';

export default function RoomRoute() {
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { user } = useAuth();
  const { canAccessRooms, isLoading } = useEntitlement(user?.id);

  if (!cityId) return null;
  const roomId = parseInt(cityId, 10);

  // Odaya her giriş yolu (liste, deep link, bildirim) aynı abonelik kontrolünden geçer
  if (isLoading) return <LoadingView />;
  if (!canAccessRooms) return <Redirect href="/paywall" />;

  return <RoomDetailScreen roomId={roomId} />;
}
