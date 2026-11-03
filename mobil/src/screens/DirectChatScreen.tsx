import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Linking,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import {
  useDirectMessages,
  useSendDirectMessage,
  useDeleteDirectMessage,
  useConversations,
  useConversation,
  useBlockedUsers,
  useBlockUser,
  useUnblockUser,
  useClearConversation,
  useDeleteConversation,
} from '../hooks/useDirectMessages';
import { useUserPresence } from '../hooks/usePresence';
import { useCreateReport } from '../hooks/useReports';
import { useModal } from '../hooks/useModal';
import { DirectMessage } from '../types/directMessages.types';
import { MessageType } from '../types/messages.types';
import { DirectMessageItem } from '../components/DirectMessageItem';
import { DirectChatHeader } from '../components/DirectChatHeader';
import { ChatInputBar, ChatReplyTarget } from '../components/ChatInputBar';
import { AppModal, AppButton, LoadingView, ErrorView, EmptyView, ModalAction } from '../components/ui';
import { useTheme } from '../theme';
import { tokens } from '../theme/tokens';
import { useI18n } from '../i18n';
import { fetchCallablePhone } from '@/api/messagesApi';
import { requestNotificationPermissionAsync } from '../lib/notifications';
import type { MediaUploadTarget } from '../api/storageApi';

type DirectChatScreenProps = {
  conversationId: string;
};

type ReportReason = 'inappropriate' | 'harassment' | 'scam';

export const DirectChatScreen: React.FC<DirectChatScreenProps> = ({ conversationId }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const { show: showModal, hide: hideModal, modalProps } = useModal();
  const insets = useSafeAreaInsets();

  // Konuşma bilgileri
  const { data: currentConversation } = useConversation(conversationId, user?.id);
  const otherUser = currentConversation?.otherUser;

  // Çevrim içi & son görülme durumu
  const presence = useUserPresence(otherUser?.id, otherUser?.last_seen_at);

  // Mesajlar ve Realtime
  const { data: messages = [], isLoading, isError, refetch } = useDirectMessages(conversationId, user?.id);
  const sendMutation = useSendDirectMessage(conversationId);
  const deleteMutation = useDeleteDirectMessage(conversationId);
  const clearChatMutation = useClearConversation(conversationId, user?.id);
  const deleteConversationMutation = useDeleteConversation(user?.id);

  // DM fotoğraf/ses dosyaları herkese açık değil; konuşmaya özel private bucket'a yüklenir
  const dmUploadTarget = useMemo<MediaUploadTarget>(
    () => ({ kind: 'dm', conversationId }),
    [conversationId]
  );

  // Engelleme durumu
  const { data: blockedList = [] } = useBlockedUsers();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const createReportMutation = useCreateReport();

  const isBlockedByMe = useMemo(() => {
    if (!otherUser?.id) return false;
    return blockedList.some((b) => b.blocked_id === otherUser.id);
  }, [blockedList, otherUser]);

  const [replyingTo, setReplyingTo] = useState<ChatReplyTarget | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fullName = otherUser
    ? `${otherUser.first_name} ${otherUser.last_name}`.trim()
    : t.directChat.fallbackTitle;

  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Tek tuşlu bilgi/hata modalı
  const showInfo = useCallback(
    (title: string, message: string) =>
      showModal({
        title,
        message,
        actions: [{ label: t.common.ok, style: 'default', onPress: hideModal }],
      }),
    [showModal, hideModal, t.common.ok]
  );

  const showError = useCallback(
    (err: unknown) =>
      showInfo(t.common.error, err instanceof Error && err.message ? err.message : t.errors.unknown),
    [showInfo, t.common.error, t.errors.unknown]
  );

  // Yeni mesaj geldiğinde listeyi aşağı kaydır
  useEffect(() => {
    if (Array.isArray(messages) && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => sub.remove();
  }, []);

  // ─── Mesaj Gönder: Metin ─────────────────────────────────
  const handleSendText = (text: string) => {
    if (!text.trim() || !user?.id) return;

    // Karşı taraftan gelecek yanıtların anlık bildirilebilmesi için izin kontrolü
    requestNotificationPermissionAsync(user.id, language);

    sendMutation.mutate(
      {
        senderId: user.id,
        input: {
          conversationId,
          type: 'text',
          body: text.trim(),
          replyTo: replyingTo?.id,
          replyToMessage: replyingTo
            ? { id: replyingTo.id, userName: replyingTo.userName, body: replyingTo.body }
            : null,
        },
      },
      {
        onError: (err) =>
          showInfo(
            t.directChat.sendFailedTitle,
            err instanceof Error && err.message ? err.message : t.errors.unknown
          ),
      }
    );
    setReplyingTo(null);
  };

  // ─── Mesaj Gönder: Medya (Fotoğraf) ───────────────────────
  const handleSendMedia = (type: MessageType, body: string, _localUri?: string, caption?: string) => {
    if (!user?.id) return;
    const isImage = type === 'image';

    sendMutation.mutate(
      {
        senderId: user.id,
        input: {
          conversationId,
          type,
          body: isImage ? (caption?.trim() || '📷 Fotoğraf') : body,
          mediaKey: isImage ? body : null,
          replyTo: replyingTo?.id,
          replyToMessage: replyingTo
            ? { id: replyingTo.id, userName: replyingTo.userName, body: replyingTo.body }
            : null,
        },
      },
      {
        onError: (err) =>
          showInfo(
            t.directChat.sendFailedTitle,
            err instanceof Error && err.message ? err.message : t.errors.unknown
          ),
      }
    );
    setReplyingTo(null);
  };

  // ─── Mesaj Gönder: Konum ──────────────────────────────────
  const handleSendLocation = (lat: number, lng: number, label: string) => {
    if (!user?.id) return;

    sendMutation.mutate(
      {
        senderId: user.id,
        input: {
          conversationId,
          type: 'location',
          body: label || '📍 Konum',
          lat,
          lng,
          replyTo: replyingTo?.id,
          replyToMessage: replyingTo
            ? { id: replyingTo.id, userName: replyingTo.userName, body: replyingTo.body }
            : null,
        },
      },
      {
        onError: (err) =>
          showInfo(
            t.directChat.sendFailedTitle,
            err instanceof Error && err.message ? err.message : t.errors.unknown
          ),
      }
    );
    setReplyingTo(null);
  };

  // ─── Mesaj Gönder: Ses ────────────────────────────────────
  const handleSendVoice = (url: string, durationSec: number) => {
    if (!user?.id) return;

    sendMutation.mutate(
      {
        senderId: user.id,
        input: {
          conversationId,
          type: 'audio',
          body: '🎤 Ses',
          mediaKey: url,
          durationSec,
          replyTo: replyingTo?.id,
          replyToMessage: replyingTo
            ? { id: replyingTo.id, userName: replyingTo.userName, body: replyingTo.body }
            : null,
        },
      },
      {
        onError: (err) =>
          showInfo(
            t.directChat.sendFailedTitle,
            err instanceof Error && err.message ? err.message : t.errors.unknown
          ),
      }
    );
    setReplyingTo(null);
  };

  // ─── Yanıtlama (Reply) ────────────────────────────────────
  const handleReply = useCallback(
    (item: DirectMessage) => {
      const senderName = item.sender_id === user?.id ? 'Sen' : fullName;
      let snippet = item.body;
      if (item.type === 'image') snippet = '📷 Fotoğraf';
      else if (item.type === 'audio') snippet = '🎤 Ses';
      else if (item.type === 'location') snippet = '📍 Konum';

      setReplyingTo({
        id: item.id,
        userName: senderName,
        body: snippet || '',
      });
    },
    [user?.id, fullName]
  );

  // ─── Mesaj Silme ──────────────────────────────────────────
  const handleDeleteMessage = useCallback(
    (item: DirectMessage) => {
      showModal({
        title: t.directChat.deleteMessageTitle,
        message: t.directChat.deleteMessageConfirm,
        actions: [
          { label: t.common.cancel, style: 'cancel', onPress: hideModal },
          {
            label: t.directChat.deleteMessage,
            style: 'destructive',
            onPress: () => {
              hideModal();
              deleteMutation.mutate(item.id, {
                onSuccess: () => showInfo(t.common.success, t.directChat.deleteMessageSuccess),
                onError: showError,
              });
            },
          },
        ],
      });
    },
    [showModal, hideModal, deleteMutation, t, showInfo, showError]
  );

  // ─── Mesaj Seçenekleri (Uzun Basış) ────────────────────────
  const handleMessageOptions = useCallback(
    (item: DirectMessage) => {
      const isMine = item.sender_id === user?.id;
      const actions: ModalAction[] = [
        {
          label: t.directChat.reply,
          style: 'default',
          onPress: () => {
            hideModal();
            handleReply(item);
          },
        },
      ];

      if (isMine) {
        actions.push({
          label: t.directChat.deleteMessage,
          style: 'destructive',
          onPress: () => {
            hideModal();
            handleDeleteMessage(item);
          },
        });
      }

      actions.push({
        label: t.common.cancel,
        style: 'cancel',
        onPress: hideModal,
      });

      let previewText = item.body;
      if (item.type === 'image') previewText = '📷 Fotoğraf';
      else if (item.type === 'audio') previewText = '🎤 Ses';
      else if (item.type === 'location') previewText = '📍 Konum';

      showModal({
        title: t.directChat.userActionsTitle,
        message: previewText || '',
        actions,
      });
    },
    [user?.id, t, showModal, hideModal, handleReply, handleDeleteMessage]
  );

  // ─── Şikayet ─────────────────────────────────────────────
  const submitReport = (reason: ReportReason) => {
    if (!otherUser?.id) return;
    hideModal();
    createReportMutation.mutate(
      {
        reportedUserId: otherUser.id,
        conversationId,
        reason,
        details: `${fullName} - DM report (${reason})`,
      },
      {
        onSuccess: () =>
          showInfo(t.roomDetail.reportSentTitle, t.directChat.reportSentMessage),
        onError: showError,
      }
    );
  };

  const openReportModal = () => {
    showModal({
      title: t.directChat.reportUser,
      message: t.directChat.reportReasonMessage(fullName),
      actions: [
        { label: t.directChat.reasonInappropriate, style: 'destructive', onPress: () => submitReport('inappropriate') },
        { label: t.directChat.reasonHarassment, style: 'destructive', onPress: () => submitReport('harassment') },
        { label: t.directChat.reasonScam, style: 'default', onPress: () => submitReport('scam') },
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
      ],
    });
  };

  // ─── Engelle ─────────────────────────────────────────────
  const openBlockModal = () => {
    if (!otherUser?.id) return;
    showModal({
      title: t.chat.blockUser,
      message: t.directChat.blockConfirmMessage,
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
        {
          label: t.roomDetail.blockConfirm,
          style: 'destructive',
          onPress: () => {
            hideModal();
            blockMutation.mutate(otherUser.id, {
              onSuccess: () =>
                showInfo(t.roomDetail.blockedTitle, t.roomDetail.blockedMessage(fullName)),
              onError: showError,
            });
          },
        },
      ],
    });
  };

  // ─── Engeli Kaldır ───────────────────────────────────────
  const openUnblockModal = () => {
    if (!otherUser?.id) return;
    showModal({
      title: t.direct.unblock,
      message: t.directChat.unblockConfirm(fullName),
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
        {
          label: t.direct.unblock,
          style: 'default',
          onPress: () => {
            hideModal();
            unblockMutation.mutate(otherUser.id, {
              onSuccess: () => showInfo(t.common.success, t.directChat.unblockSuccess),
              onError: showError,
            });
          },
        },
      ],
    });
  };

  const handleCallUser = async (targetId: string) => {
    try {
      const phone = await fetchCallablePhone(targetId);
      if (!phone) {
        showInfo(t.common.info, t.roomDetail.phoneHidden);
        return;
      }
      const digits = phone.replace(/\D/g, '');
      const number = digits.startsWith('90') ? `+${digits}` : `+90${digits.replace(/^0/, '')}`;
      await Linking.openURL(`tel:${number}`);
    } catch {
      showInfo(t.common.error, t.roomDetail.callFailed);
    }
  };

  const openClearChatModal = () => {
    showModal({
      title: t.directChat.clearChatTitle,
      message: t.directChat.clearChatConfirm,
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
        {
          label: t.directChat.clearChat,
          style: 'destructive',
          onPress: () => {
            hideModal();
            clearChatMutation.mutate(undefined, {
              onSuccess: () => showInfo(t.common.success, t.directChat.clearChatSuccess),
              onError: showError,
            });
          },
        },
      ],
    });
  };

  const openDeleteUserModal = () => {
    showModal({
      title: t.directChat.deleteUserTitle,
      message: t.directChat.deleteUserConfirm,
      actions: [
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
        {
          label: t.directChat.deleteUser,
          style: 'destructive',
          onPress: () => {
            hideModal();
            deleteConversationMutation.mutate(conversationId, {
              onSuccess: () => {
                router.back();
              },
              onError: showError,
            });
          },
        },
      ],
    });
  };

  const handleOptionsPress = () => {
    if (!otherUser?.id) return;

    if (isBlockedByMe) {
      openUnblockModal();
      return;
    }

    const canCall = !otherUser.hide_phone;

    showModal({
      title: t.directChat.userActionsTitle,
      message: fullName,
      actions: [
        canCall
          ? {
            label: t.roomDetail.callUser,
            style: 'default',
            onPress: () => { hideModal(); handleCallUser(otherUser.id); },
          }
          : {
            label: t.roomDetail.phoneHiddenLabel,
            style: 'default',
            onPress: () => { hideModal(); showInfo(t.common.info, t.roomDetail.phoneHidden); },
          },
        { label: t.directChat.reportUser, style: 'default', onPress: () => { hideModal(); openReportModal(); } },
        { label: t.directChat.clearChat, style: 'default', onPress: () => { hideModal(); openClearChatModal(); } },
        { label: t.directChat.deleteUser, style: 'destructive', onPress: () => { hideModal(); openDeleteUserModal(); } },
        { label: t.chat.blockUser, style: 'destructive', onPress: () => { hideModal(); openBlockModal(); } },
        { label: t.common.cancel, style: 'cancel', onPress: hideModal },
      ],
    });
  };

  const keyExtractor = useCallback((item: DirectMessage, index: number) => {
    return item?.id ? String(item.id) : `dm_msg_${index}`;
  }, []);

  const renderMessageItem = useCallback(
    ({ item }: { item: DirectMessage }) => {
      if (!item) return null;
      return (
        <DirectMessageItem
          item={item}
          isMe={item.sender_id === user?.id}
          onReply={handleReply}
          onOptionsPress={handleMessageOptions}
        />
      );
    },
    [user?.id, handleReply, handleMessageOptions]
  );

  // Klavye açılınca otomatik en alta kaydır
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      if (messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    return () => sub.remove();
  }, [messages.length]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      <AppModal {...modalProps} />

      {/* Mesaj Akışı ve Klavye */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <DirectChatHeader
          fullName={fullName}
          initials={initials}
          avatarUrl={otherUser?.avatar_url}
          isBlockedByMe={isBlockedByMe}
          isOnline={presence.isOnline}
          statusText={presence.statusText}
          onBackPress={() => router.back()}
          onOptionsPress={handleOptionsPress}
        />

        {isLoading ? (
          <LoadingView />
        ) : isError ? (
          <ErrorView
            title={t.roomDetail.loadFailed}
            onRetry={() => refetch()}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={Array.isArray(messages) ? messages : []}
            keyExtractor={keyExtractor}
            renderItem={renderMessageItem}
            initialNumToRender={10}
            windowSize={7}
            maxToRenderPerBatch={10}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingVertical: tokens.verticalScale(tokens.spacing.sm),
              flexGrow: 1,
            }}
            ListEmptyComponent={
              <EmptyView
                icon="chatbubble-ellipses-outline"
                title={t.directChat.emptyTitle}
                subtitle={t.directChat.emptySubtitle}
              />
            }
          />
        )}

        {/* Engelli Uyarısı veya ChatInputBar */}
        {isBlockedByMe ? (
          <View
            style={{
              padding: tokens.scale(tokens.spacing.base),
              paddingBottom: tokens.scale(tokens.spacing.base) + insets.bottom,
              backgroundColor: colors.dangerSurface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text
              style={{
                color: colors.danger,
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                fontWeight: tokens.typography.fontWeight.semibold,
                textAlign: 'center',
              }}
            >
              {t.directChat.blockedBanner}
            </Text>
            <AppButton
              label={t.direct.unblock}
              variant="outline"
              size="sm"
              onPress={() => otherUser?.id && unblockMutation.mutate(otherUser.id)}
              loading={unblockMutation.isPending}
            />
          </View>
        ) : (
          <ChatInputBar
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onSendText={handleSendText}
            onSendMedia={handleSendMedia}
            onSendLocation={handleSendLocation}
            onSendVoice={handleSendVoice}
            placeholder={t.directChat.inputPlaceholder}
            isSending={sendMutation.isPending}
            uploadTarget={dmUploadTarget}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};