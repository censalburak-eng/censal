import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { DirectChatScreen } from '../../screens/DirectChatScreen';

export default function DirectChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return <DirectChatScreen conversationId={id} />;
}
