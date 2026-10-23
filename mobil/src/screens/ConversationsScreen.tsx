import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import {
  useConversations,
  useConversationsRealtime,
  useDeleteConversation,
  useClearConversation,
  useBlockUser,
} from '../hooks/useDirectMessages';
import { Conversation } from '../types/directMessages.types';
import { ConversationListItem } from '../components/ConversationListItem';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';
import { BackButton, AppModal, LoadingView, ErrorView, EmptyView } from '../components/ui';
import { useModal } from '../hooks/useModal';

export const ConversationsScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const locale = t.common.locale;
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  const { data: conversations = [], isLoading, isError, refetch } = useConversations(user?.id);
  useConversationsRealtime(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const { show: showModal, hide: hideModal, modalProps } = useModal();
  const deleteConversationMutation = useDeleteConversation(user?.id);
  const clearChatMutation = useClearConversation('', user?.id);
  const blockUserMutation = useBlockUser();

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase(locale);
    if (!q) return conversations;

    return conversations.filter((c) => {
      const other = c.otherUser;
      if (!other) return false;
      const name = `${other.first_name} ${other.last_name}`.toLocaleLowerCase(locale);
      const plate = other.plate_code?.toLocaleLowerCase(locale) ?? '';
      const snippet = c.lastMessageSnippet?.toLocaleLowerCase(locale) ?? '';
      return name.includes(q) || plate.includes(q) || snippet.includes(q);
    });
  }, [conversations, searchQuery, locale]);

  const handleConversationPress = useCallback((conversation: Conversation) => {
    router.push({
      pathname: '/dm/[id]',
      params: { id: conversation.id },
    });
  }, [router]);

  // Onay modalı: İptal + yıkıcı aksiyon
  const confirmDestructive = useCallback(
    (title: string, message: string, label: string, onConfirm: () => void) => {
      showModal({
        title,
        message,
        actions: [
          { label: t.common.cancel, style: 'cancel', onPress: hideModal },
          {
            label,
            style: 'destructive',
            onPress: () => {
              hideModal();
              onConfirm();
            },
          },
        ],
      });
    },
    [showModal, hideModal, t]
  );

  const handleConversationLongPress = useCallback((conversation: Conversation) => {
    const other = conversation.otherUser;
    const name = other ? `${other.first_name} ${other.last_name}`.trim() : t.common.user;

    showModal({
      title: name,
      message: t.direct.optionsTitle,
      actions: [
        {
          label: t.chat.directMessage,
          style: 'default',
          onPress: () => {
            hideModal();
            handleConversationPress(conversation);
          },
        },
        {
          label: t.directChat.clearChat,
          style: 'default',
          onPress: () => {
            hideModal();
            confirmDestructive(
              t.directChat.clearChatTitle,
              t.directChat.clearChatConfirm,
              t.directChat.clearChat,
              () => clearChatMutation.mutate()
            );
          },
        },
        {
          label: t.direct.deleteUser,
          style: 'destructive',
          onPress: () => {
            hideModal();
            confirmDestructive(
              t.directChat.deleteUserTitle,
              t.directChat.deleteUserConfirm,
              t.directChat.deleteUser,
              () => deleteConversationMutation.mutate(conversation.id)
            );
          },
        },
        ...(other?.id
          ? [
            {
              label: t.chat.blockUser,
              style: 'destructive' as const,
              onPress: () => {
                hideModal();
                blockUserMutation.mutate(other.id);
              },
            },
          ]
          : []),
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
      ],
    });
  }, [showModal, hideModal, t, handleConversationPress, confirmDestructive, clearChatMutation, deleteConversationMutation, blockUserMutation]);

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationListItem
        item={item}
        onPress={handleConversationPress}
        onLongPress={handleConversationLongPress}
      />
    ),
    [handleConversationPress, handleConversationLongPress]
  );

  const isSearching = searchQuery.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <AppModal {...modalProps} />

      {/* Header */}
      <View
        style={{
          flexDirection: rowDirection,
          alignItems: 'center',
          paddingHorizontal: tokens.scale(tokens.spacing.base),
          paddingVertical: tokens.verticalScale(tokens.spacing.sm),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: tokens.scale(tokens.spacing.sm),
        }}
      >
        <BackButton onPress={() => router.back()} />
        <Text
          style={{
            color: colors.text,
            fontSize: tokens.moderateScale(tokens.typography.fontSize.lg),
            fontWeight: tokens.typography.fontWeight.bold,
          }}
        >
          {t.direct.title}
        </Text>
      </View>

      {/* Arama Barı */}
      {conversations.length > 0 && (
        <View
          style={{
            paddingHorizontal: tokens.scale(tokens.spacing.base),
            paddingVertical: tokens.verticalScale(tokens.spacing.xs + 2),
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: rowDirection,
              alignItems: 'center',
              backgroundColor: colors.bg,
              borderRadius: tokens.moderateScale(tokens.radii.md),
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: tokens.scale(tokens.spacing.sm),
              height: tokens.verticalScale(38),
              gap: tokens.scale(tokens.spacing.xs),
            }}
          >
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.direct.searchPlaceholder}
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                padding: 0,
                textAlign: isRTL ? 'right' : 'left',
              }}
            />
            {isSearching && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t.rooms.searchClear}
              >
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Liste & Durumlar */}
      {isLoading ? (
        <LoadingView />
      ) : isError ? (
        <ErrorView title={t.direct.loadFailed} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={10}
          windowSize={7}
          maxToRenderPerBatch={10}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyView
              icon="chatbubbles-outline"
              title={isSearching ? t.direct.searchEmptyTitle : t.direct.emptyTitle}
              subtitle={isSearching ? t.direct.searchEmptySubtitle : t.direct.emptySubtitle}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};