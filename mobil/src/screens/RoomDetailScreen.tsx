import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Linking,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import {
  useRoomMessages,
  usePinnedListings,
  useSendMessage,
  usePinMessage,
  useDeleteMessage,
  useEditMessage,
} from "../hooks/useMessages";
import { useProfile } from "../hooks/useProfile";
import { useStartConversation, useBlockUser } from "../hooks/useDirectMessages";
import { useCreateReport } from "../hooks/useReports";
import { useModal } from "../hooks/useModal";
import { useEntitlement } from "../hooks/useEntitlement";
import { useRevenueCat } from "../hooks/useRevenueCat";
import { useRoomDetail } from "../hooks/useRooms";
import { useRoomCounts, setMyRoom } from "../hooks/usePresence";
import { useQueryClient } from "@tanstack/react-query";
import { CITIES_DATA } from "../data/cities";
import { RoomMessage, MessageType, PinnedListing } from "../types/messages.types";
import { ChatRoomHeader } from "../components/ChatRoomHeader";
import { requestPayment } from "../api/subscriptionApi";
import { PinnedListingsBar } from "../components/PinnedListingsBar";
import { ChatMessageItem } from "../components/ChatMessageItem";
import { ChatInputBar } from "../components/ChatInputBar";
import { EditMessageSheet } from "../components/ui/EditMessageSheet";
import { PinListingSheet } from "../components/ui/PinListingSheet";
import { PinnedListingsModal } from "../components/ui/PinnedListingsModal";
import { PinnedListingDetailModal } from "../components/ui/PinnedListingDetailModal";
import { AppModal, LoadingView, ErrorView, EmptyView, ModalAction } from "../components/ui";
import { requestNotificationPermissionAsync } from "../lib/notifications";
import { useTheme } from "../theme";
import { tokens } from "../theme/tokens";
import { useI18n } from "../i18n";
import { fetchCallablePhone } from "@/api/messagesApi";

type RoomDetailScreenProps = {
  roomId: number;
};

export const RoomDetailScreen: React.FC<RoomDetailScreenProps> = ({ roomId }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const { show: showModal, hide: hideModal, modalProps } = useModal();
  const { settings } = useEntitlement(user?.id);

  // Odaya girince anında optimistic + presence track, çıkınca anında 0 + untrack
  useFocusEffect(
    useCallback(() => {
      setMyRoom(roomId);
      // Odaya girilince app_settings tazele (sabitleme fiyatı güncel gelsin)
      queryClient.invalidateQueries({ queryKey: ['app_settings'] });
      return () => {
        setMyRoom(null);
      };
    }, [roomId, queryClient])
  );

  const { data: roomDetail, refetch: refetchRoomDetail } = useRoomDetail(roomId);
  const roomCounts = useRoomCounts();
  const onlineCount = roomCounts[roomId] ?? 0;

  const city = CITIES_DATA.find((c) => c.id === roomId) ?? {
    id: roomId,
    name: t.roomDetail.fallbackCity,
    plateCode: "01",
    region: t.roomDetail.fallbackRegion,
    pinnedCount: 0,
    isLocked: false,
  };

  const roomName = roomDetail?.name || city.name;
  const plateCode = roomDetail?.plateCode || city.plateCode;
  const maxPins = roomDetail?.maxPinnedLimit ?? 3;

  const { data: messages = [], isLoading, isError, error, refetch, loadMore } = useRoomMessages(roomId);
  const { data: pinnedListings = [] } = usePinnedListings(roomId);


  const { packages, pinPriceString, purchasePin, purchase: purchaseRevenueCatPackage } = useRevenueCat();
  const [isPurchasingPin, setIsPurchasingPin] = useState(false);

  // Sabit ilan fiyatı — yalnızca app_settings'ten gelir (admin panelinden kontrol edilir)
  const pinPrice = settings?.price_pin_24h
    ? `${String(settings.price_pin_24h).replace('₺', '').trim()} ₺`
    : '300,00 ₺';

  const handlePaywallPress = () => router.push('/paywall');
  const sendMessageMutation = useSendMessage(roomId);
  const pinMessageMutation = usePinMessage(roomId);
  const deleteMessageMutation = useDeleteMessage(roomId);
  const editMessageMutation = useEditMessage(roomId);
  const startConversationMutation = useStartConversation();
  const blockUserMutation = useBlockUser();
  const createReportMutation = useCreateReport();

  const [replyingTo, setReplyingTo] = useState<RoomMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<RoomMessage | null>(null);
  const [pinningMessage, setPinningMessage] = useState<RoomMessage | null>(null);
  const [isPinnedListingsModalVisible, setIsPinnedListingsModalVisible] = useState(false);
  const [selectedPinnedListing, setSelectedPinnedListing] = useState<PinnedListing | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const isInitialScrollDone = useRef(false);

  useEffect(() => {
    isInitialScrollDone.current = false;
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      if (!isInitialScrollDone.current) {
        const t1 = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 50);
        const t2 = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          isInitialScrollDone.current = true;
        }, 200);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      } else {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
        return () => clearTimeout(timer);
      }
    }
  }, [messages.length]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => sub.remove();
  }, []);

  // Tek tuşlu bilgi/hata modalı (tekrarı azaltır)
  const showInfo = (title: string, message: string) =>
    showModal({
      title,
      message,
      actions: [{ label: t.common.ok, style: "default", onPress: hideModal }],
    });

  const showError = (err: unknown, fallback: string) =>
    showInfo(t.common.error, err instanceof Error && err.message ? err.message : fallback);

  const handleCallUser = async (message: RoomMessage) => {
    if (message.isUserPhoneHidden) return;
    try {
      const phone = await fetchCallablePhone(message.userId);
      if (!phone) {
        showInfo(t.common.info, t.roomDetail.phoneHidden);
        return;
      }
      await Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    } catch {
      showInfo(t.common.error, t.roomDetail.callFailed);
    }
  };

  const handleCallUserFromPinned = async (listing: PinnedListing) => {
    try {
      const phone = await fetchCallablePhone(listing.userId);
      if (!phone) {
        showInfo(t.common.info, t.roomDetail.phoneHidden);
        return;
      }
      await Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    } catch {
      showInfo(t.common.error, t.roomDetail.callFailed);
    }
  };

  const handleRequestPinPress = () => {
    if (!user?.id) {
      router.push("/(auth)/phone");
      return;
    }
    const userLastMsg = (messages as RoomMessage[])
      .slice()
      .reverse()
      .find((m) => m.userId === user?.id);
    if (userLastMsg) {
      setPinningMessage(userLastMsg);
    } else {
      showModal({
        title: t.roomDetail.requestPinTitle,
        message: t.roomDetail.requestPinMessage,
        actions: [{ label: t.common.understood, style: "default", onPress: hideModal }],
      });
    }
  };

  // ─── Alıntılanan mesaja scroll et ─────────────────────
  const scrollToMessage = (messageId: string) => {
    const idx = (messages as RoomMessage[]).findIndex((m) => m.id === messageId);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
  };

  const { data: myProfile } = useProfile(user?.id);
  const myUserName = myProfile
    ? `${myProfile.first_name ?? myProfile.ad ?? ''} ${myProfile.last_name ?? myProfile.soyad ?? ''}`.trim() || t.common.user
    : t.common.user;

  const handleSendError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : t.errors.unknown;
    showModal({
      title: t.common.error,
      message: msg,
      actions: [{ label: t.common.understood, style: "default", onPress: hideModal }],
    });
  }, [t, showModal, hideModal]);

  // ─── Mesaj Gönder: Text ────────────────────────────────────
  const handleSendText = (text: string) => {
    if (!user?.id) return;
    const replyTarget = replyingTo
      ? {
          userName: replyingTo.userName,
          body: replyingTo.body || (replyingTo.type === "image" ? "📷 Fotoğraf" : replyingTo.type === "audio" ? "🎤 Ses" : "📍 Konum"),
        }
      : null;

    sendMessageMutation.mutate(
      {
        userId: user.id,
        userName: myUserName,
        userAvatarUrl: myProfile?.avatar_url,
        input: {
          roomId,
          type: "text",
          body: text,
          replyToId: replyingTo?.id,
          replyToMessage: replyTarget,
        },
      },
      { onError: handleSendError }
    );
    setReplyingTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ─── Mesaj Gönder: Medya (foto) ───────────────────────────
  const handleSendMedia = (type: MessageType, body: string, localUri?: string, caption?: string) => {
    if (!user?.id) return;
    const isMedia = type === "image" || type === "audio";
    const replyTarget = replyingTo
      ? {
          userName: replyingTo.userName,
          body: replyingTo.body || (replyingTo.type === "image" ? "📷 Fotoğraf" : replyingTo.type === "audio" ? "🎤 Ses" : "📍 Konum"),
        }
      : null;

    sendMessageMutation.mutate(
      {
        userId: user.id,
        userName: myUserName,
        userAvatarUrl: myProfile?.avatar_url,
        input: {
          roomId,
          type,
          body: isMedia ? (type === "image" ? "📷 Fotoğraf" : "🎤 Ses") : body,
          mediaPath: isMedia ? body : null,
          caption: type === "image" ? (caption ?? null) : null,
          optimisticMediaPath: type === "image" && localUri ? localUri : null,
          replyToId: replyingTo?.id,
          replyToMessage: replyTarget,
        },
      },
      { onError: handleSendError }
    );
    setReplyingTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ─── Mesaj Gönder: Konum ──────────────────────────────────
  const handleSendLocation = (lat: number, lng: number, label: string) => {
    if (!user?.id) return;
    const replyTarget = replyingTo
      ? {
          userName: replyingTo.userName,
          body: replyingTo.body || (replyingTo.type === "image" ? "📷 Fotoğraf" : replyingTo.type === "audio" ? "🎤 Ses" : "📍 Konum"),
        }
      : null;

    sendMessageMutation.mutate(
      {
        userId: user.id,
        userName: myUserName,
        userAvatarUrl: myProfile?.avatar_url,
        input: {
          roomId,
          type: "location",
          body: label,
          lat,
          lng,
          replyToId: replyingTo?.id,
          replyToMessage: replyTarget,
        },
      },
      { onError: handleSendError }
    );
    setReplyingTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ─── Mesaj Gönder: Ses ────────────────────────────────────
  const handleSendVoice = (url: string, durationSec: number) => {
    if (!user?.id) return;
    const replyTarget = replyingTo
      ? {
          userName: replyingTo.userName,
          body: replyingTo.body || (replyingTo.type === "image" ? "📷 Fotoğraf" : replyingTo.type === "audio" ? "🎤 Ses" : "📍 Konum"),
        }
      : null;

    sendMessageMutation.mutate(
      {
        userId: user.id,
        userName: myUserName,
        userAvatarUrl: myProfile?.avatar_url,
        input: {
          roomId,
          type: "audio",
          body: "🎤 Ses",
          mediaPath: url,
          durationSec,
          replyToId: replyingTo?.id,
          replyToMessage: replyTarget,
        },
      },
      { onError: handleSendError }
    );
    setReplyingTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ─── Pin Sheet Aç ────────────────────────────────────────
  const handlePin = useCallback((message: RoomMessage) => {
    if (!user?.id) {
      router.push("/(auth)/phone");
      return;
    }

    // 1. Ön Kontrol: Bu mesaj zaten odada aktif olarak sabitli mi?
    const isAlreadyPinned = pinnedListings.some((p) => p.messageId === message.id);
    if (isAlreadyPinned) {
      showInfo(t.roomDetail.warning, t.roomDetail.pinAlreadyPinned);
      return;
    }

    // 2. Ön Kontrol: Odanın sabit ilan kontenjanı dolu mu?
    if (pinnedListings.length >= maxPins) {
      showInfo(t.roomDetail.warning, t.roomDetail.pinQuotaFullMessage);
      return;
    }

    setPinningMessage(message);
  }, [user?.id, router, pinnedListings, maxPins, showInfo, t]);

  // ─── Pin Onayla & Ödeme (Android: Google Play / iOS: Onay Talebi) ─
  const handlePinConfirm = async () => {
    if (!pinningMessage) return;

    // Çifte güvenlik kontrolü:
    const isAlreadyPinned = pinnedListings.some((p) => p.messageId === pinningMessage.id);
    if (isAlreadyPinned) {
      setPinningMessage(null);
      showInfo(t.roomDetail.warning, t.roomDetail.pinAlreadyPinned);
      return;
    }

    if (pinnedListings.length >= maxPins) {
      setPinningMessage(null);
      showInfo(t.roomDetail.warning, t.roomDetail.pinQuotaFullMessage);
      return;
    }

    setIsPurchasingPin(true);
    try {
      if (Platform.OS === 'android') {
        const purchaseRes = await purchasePin();
        if (purchaseRes.userCancelled) {
          setIsPurchasingPin(false);
          return;
        }

        if (purchaseRes.error) {
          setIsPurchasingPin(false);
          setPinningMessage(null);
          showInfo(t.common.error, purchaseRes.error.message);
          return;
        }

        if (user?.id) {
          requestNotificationPermissionAsync(user.id, language);
        }

        pinMessageMutation.mutate(
          { message: pinningMessage },
          {
            onSuccess: () => {
              setPinningMessage(null);
              showInfo(t.common.success, t.roomDetail.pinSuccess);
            },
            onError: (err) => {
              setPinningMessage(null);
              showInfo(
                t.roomDetail.warning,
                err instanceof Error && err.message ? err.message : t.errors.pinQuotaFull
              );
            },
          }
        );
        return;
      }

      // iOS ve Web için:
      await requestPayment('pin_24h', pinningMessage.id, roomId);
      setPinningMessage(null);
      showInfo(t.roomDetail.pinRequestedTitle, t.roomDetail.pinRequestedMessage);
    } catch (err: unknown) {
      setPinningMessage(null);
      showInfo(
        t.common.error,
        err instanceof Error && err.message ? err.message : 'Ödeme talebi oluşturulamadı'
      );
    } finally {
      setIsPurchasingPin(false);
    }
  };

  // ─── Mesaj Sil ────────────────────────────────────────────
  const handleDeleteMessage = (message: RoomMessage) => {
    showModal({
      title: t.roomDetail.deleteTitle,
      message: t.roomDetail.deleteConfirm,
      actions: [
        { label: t.common.cancel, style: "cancel", onPress: hideModal },
        {
          label: t.common.delete,
          style: "destructive",
          onPress: () => {
            hideModal();
            deleteMessageMutation.mutate(message.id, {
              onError: (err) => showError(err, t.roomDetail.deleteFailed),
            });
          },
        },
      ],
    });
  };

  // ─── Mesaj Düzenle ────────────────────────────────────────
  const handleEditSave = (messageId: string, newBody: string, newCaption?: string | null) => {
    editMessageMutation.mutate(
      { messageId, body: newBody, caption: newCaption },
      { onError: (err) => showError(err, t.roomDetail.editFailed) }
    );
  };

  // ─── DM ──────────────────────────────────────────────────
  const handleDirectMessage = useCallback((message: RoomMessage) => {
    if (!user?.id) { router.push("/(auth)/phone"); return; }
    if (message.userId === user.id) return;

    // Özel mesaj başlatırken karşı tarafın yanıtlarını alabilmesi için izin iste
    requestNotificationPermissionAsync(user.id, language);

    startConversationMutation.mutate(message.userId, {
      onSuccess: (conversationId) =>
        router.push({ pathname: "/dm/[id]", params: { id: conversationId } }),
      onError: (err) =>
        showInfo(
          t.roomDetail.dmFailedTitle,
          err instanceof Error && err.message ? err.message : t.errors.unknown
        ),
    });
  }, [user?.id, router, startConversationMutation, t, language]);

  // ─── Engelle ─────────────────────────────────────────────
  const handleBlockUser = useCallback((message: RoomMessage) => {
    showModal({
      title: t.chat.blockUser,
      message: t.roomDetail.blockConfirmMessage(message.userName),
      actions: [
        { label: t.common.cancel, style: "cancel", onPress: hideModal },
        {
          label: t.roomDetail.blockConfirm,
          style: "destructive",
          onPress: () => {
            hideModal();
            blockUserMutation.mutate(message.userId, {
              onSuccess: () =>
                showInfo(t.roomDetail.blockedTitle, t.roomDetail.blockedMessage(message.userName)),
              onError: (err) => showError(err, t.roomDetail.blockFailed),
            });
          },
        },
      ],
    });
  }, [blockUserMutation, t]);

  // ─── Şikayet ─────────────────────────────────────────────
  const handleReport = useCallback((message: RoomMessage) => {
    const sendReport = (reason: string, alsoBlock: boolean) => {
      hideModal();
      createReportMutation.mutate(
        {
          reportedUserId: message.userId,
          messageId: message.id,
          roomId,
          reason,
          details: `${message.userName}: ${message.body}`,
        },
        {
          onSuccess: () => {
            if (alsoBlock) {
              handleBlockUser(message);
            } else {
              showInfo(t.roomDetail.reportSentTitle, t.roomDetail.reportSentMessage);
            }
          },
          onError: (err) => showError(err, t.roomDetail.reportFailed),
        }
      );
    };

    showModal({
      title: t.roomDetail.reportTitle,
      message: t.roomDetail.reportMessage(message.userName),
      actions: [
        { label: t.roomDetail.reasonInappropriate, style: "destructive", onPress: () => sendReport("inappropriate", false) },
        { label: t.roomDetail.reasonSpam, style: "default", onPress: () => sendReport("spam", false) },
        { label: t.roomDetail.reasonHarassment, style: "default", onPress: () => sendReport("harassment", false) },
        { label: t.roomDetail.blockAndReport, style: "destructive", onPress: () => sendReport("inappropriate", true) },
        { label: t.common.cancel, style: "cancel", onPress: hideModal },
      ],
    });
  }, [createReportMutation, roomId, handleBlockUser, t]);

  // ─── Mesaj Seçenekleri (long press) ──────────────────────
  const handleMessageOptions = useCallback((message: RoomMessage) => {
    const isCurrentUser = message.userId === user?.id;
    const actions: ModalAction[] = [];

    const quoteActions: ModalAction[] = [
      {
        label: t.chat.quoteReply,
        style: "default",
        onPress: () => { hideModal(); setReplyingTo(message); },
      },
      ...(message.replyToId
        ? [{
          label: t.roomDetail.goToQuoted,
          style: "default" as const,
          onPress: () => { hideModal(); scrollToMessage(message.replyToId!); },
        }]
        : []),
    ];

    if (isCurrentUser) {
      actions.push(
        ...quoteActions,
        {
          label: t.roomDetail.editMessage,
          style: "default",
          onPress: () => { hideModal(); setEditingMessage(message); },
        },
        {
          label: t.roomDetail.deleteMessage,
          style: "destructive",
          onPress: () => { hideModal(); handleDeleteMessage(message); },
        },
        {
          label: t.chat.pinMessage,
          style: "default",
          onPress: () => { hideModal(); handlePin(message); },
        }
      );
    } else {
      actions.push(
        {
          label: t.chat.directMessage,
          style: "default",
          onPress: () => { hideModal(); handleDirectMessage(message); },
        },
        {
          label: message.isUserPhoneHidden ? t.roomDetail.phoneHiddenLabel : t.roomDetail.callUser,
          style: message.isUserPhoneHidden ? "cancel" : "default",
          onPress: () => { hideModal(); handleCallUser(message); },
        },
        ...quoteActions,
        {
          label: t.chat.blockUser,
          style: "destructive",
          onPress: () => { hideModal(); handleBlockUser(message); },
        },
        {
          label: t.chat.reportMessage,
          style: "destructive",
          onPress: () => { hideModal(); handleReport(message); },
        }
      );
    }

    actions.push({ label: t.common.cancel, style: "cancel", onPress: hideModal });

    showModal({
      title: t.roomDetail.optionsTitle,
      message: `${message.userName}: ${message.body.slice(0, 60)}`,
      actions,
    });
  }, [user?.id, t, handlePin, handleDirectMessage, handleBlockUser, handleReport]);

  const keyExtractor = useCallback((item: RoomMessage) => item.id, []);

  const handleReplyMessage = useCallback((msg: RoomMessage) => {
    setReplyingTo(msg);
  }, []);

  const renderMessageItem = useCallback(
    ({ item }: { item: RoomMessage }) => (
      <ChatMessageItem
        message={item}
        isCurrentUser={item.userId === user?.id}
        onReply={handleReplyMessage}
        onPin={handlePin}
        onReport={handleReport}
        onDirectMessage={handleDirectMessage}
        onBlockUser={handleBlockUser}
        onOptionsPress={handleMessageOptions}
      />
    ),
    [user?.id, handleReplyMessage, handlePin, handleReport, handleDirectMessage, handleBlockUser, handleMessageOptions]
  );

  // Klavye açılınca otomatik en alta kaydır
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

      <AppModal {...modalProps} />

      {/* Düzenleme Sheet */}
      <EditMessageSheet
        visible={!!editingMessage}
        message={editingMessage}
        onClose={() => setEditingMessage(null)}
        onSave={handleEditSave}
      />

      {/* Sabitleme Bottom Sheet */}
      <PinListingSheet
        visible={!!pinningMessage}
        message={pinningMessage}
        activeCount={pinnedListings.length}
        maxPins={maxPins}
        price={pinPrice}
        isPinning={pinMessageMutation.isPending || isPurchasingPin}
        onClose={() => setPinningMessage(null)}
        onConfirm={handlePinConfirm}
      />

      {/* Sabit İlanlar Listesi Modalı */}
      <PinnedListingsModal
        visible={isPinnedListingsModalVisible}
        listings={pinnedListings}
        maxPins={maxPins}
        pinPrice={pinPrice}
        onClose={() => setIsPinnedListingsModalVisible(false)}
        onSelectListing={(listing) => {
          setIsPinnedListingsModalVisible(false);
          setSelectedPinnedListing(listing);
        }}
        onRequestPinPress={handleRequestPinPress}
        onPaywallPress={handlePaywallPress}
      />

      {/* Sabit İlan Detayı & İletişim Modalı */}
      <PinnedListingDetailModal
        visible={!!selectedPinnedListing}
        listing={selectedPinnedListing}
        cityName={roomName}
        plateCode={plateCode}
        onClose={() => setSelectedPinnedListing(null)}
        onCallUser={handleCallUserFromPinned}
        onDirectMessage={(listing) => handleDirectMessage({ userId: listing.userId } as any)}
        onGoToMessage={(msgId) => scrollToMessage(msgId)}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* 1. Üst Başlık */}
        <ChatRoomHeader
          roomName={roomName}
          plateCode={plateCode}
          region={city.region}
          onlineCount={onlineCount}
          onInfoPress={() =>
            showModal({
              title: t.roomDetail.roomInfoTitle(plateCode, roomName),
              message: t.roomDetail.roomInfoMessage,
              actions: [{ label: t.common.understood, style: "default", onPress: hideModal }],
            })
          }
        />

        {/* 2. Sabit İlanlar Barı */}
        <PinnedListingsBar
          listings={pinnedListings}
          pinPrice={pinPrice}
          maxPins={maxPins}
          onOpenModal={() => {
            setIsPinnedListingsModalVisible(true);
          }}
          onRequestPinPress={() => {
            handleRequestPinPress();
          }}
          onPaywallPress={handlePaywallPress}
        />

        {/* 3. Mesaj Akışı */}
        {isLoading || (isAuthLoading && !user) ? (
          <LoadingView />
        ) : isError ? (
          <ErrorView
            title={t.roomDetail.loadFailed}
            subtitle={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderMessageItem}
            initialNumToRender={30}
            windowSize={7}
            maxToRenderPerBatch={20}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => {
              if (messages.length > 0 && !isInitialScrollDone.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              if (messages.length > 0 && !isInitialScrollDone.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            contentContainerStyle={{
              paddingVertical: tokens.verticalScale(tokens.spacing.sm),
              flexGrow: 1,
            }}
            ListEmptyComponent={
              <EmptyView icon="chatbubbles-outline" title={t.chat.emptyRoomSubtitle} />
            }
          />
        )}

        {/* 4. Alt Mesaj Giriş Barı */}
        <ChatInputBar
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          onSendLocation={handleSendLocation}
          onSendVoice={handleSendVoice}
          onError={(errorMessage) => showInfo(t.roomDetail.securityWarning, errorMessage)}
          isSending={sendMessageMutation.isPending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};