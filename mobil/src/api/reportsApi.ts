import { supabase } from '../lib/supabase';
import { mapDatabaseError } from '../lib/errors';

export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'harassment'
  | 'scam'
  | 'offensive'
  | 'other';

export type CreateReportInput = {
  reportedUserId?: string;
  messageId?: string;
  roomId?: number;
  conversationId?: string;
  reason: ReportReason | string;
  details?: string;
};

export type ReportRecord = {
  id: string;
  reporter_id: string;
  reported_user_id?: string | null;
  message_id?: string | null;
  room_id?: number | null;
  conversation_id?: string | null;
  reason: string;
  details?: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
};

export const createReport = async (input: CreateReportInput): Promise<ReportRecord> => {
  console.log('[createReport] Gönderiliyor:', input);

  const { data, error } = await supabase
    .from('reports')
    .insert([
      {
        reported_user_id: input.reportedUserId,
        message_id: input.messageId,
        room_id: input.roomId,
        conversation_id: input.conversationId,
        reason: input.reason,
        details: input.details,
      },
    ])
    .select('id, reason, status, created_at')
    .single();

  if (error) {
    console.error('[createReport] HATA:', error.message, error.code, error.details);
    throw mapDatabaseError(error);
  }

  return data as unknown as ReportRecord;
};
