import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RoomDetailScreen } from '../../screens/RoomDetailScreen';

export default function RoomRoute() {
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  if (!cityId) return null;
  const roomId = parseInt(cityId, 10);

  return <RoomDetailScreen roomId={roomId} />;
}
