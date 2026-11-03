import type { TranslationStructure } from '../i18n/types';

export type AppErrorCode =
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'PIN_QUOTA_FULL'
  | 'CONTENT_BLOCKED'
  | 'NOT_FOUND'
  | 'CANCELLED'
  | 'INVALID_EMAIL'
  | 'DM_BLOCKED'
  | 'ACCOUNT_BANNED'
  | 'PIN_NOT_OWNER'
  | 'PIN_ALREADY_PINNED'
  | 'APPEAL_LIMIT_EXCEEDED'
  | 'UNKNOWN';

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorCodeToTranslationKey: Record<AppErrorCode, keyof TranslationStructure['errors']> = {
  NETWORK: 'network',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  RATE_LIMITED: 'rateLimited',
  PIN_QUOTA_FULL: 'pinQuotaFull',
  CONTENT_BLOCKED: 'contentBlocked',
  NOT_FOUND: 'notFound',
  CANCELLED: 'cancelled',
  INVALID_EMAIL: 'invalidEmail',
  DM_BLOCKED: 'dmBlocked',
  ACCOUNT_BANNED: 'accountBanned',
  PIN_NOT_OWNER: 'pinNotOwner',
  PIN_ALREADY_PINNED: 'pinAlreadyPinned',
  APPEAL_LIMIT_EXCEEDED: 'appealLimitExceeded',
  UNKNOWN: 'unknown',
};

/**
 * Ekranda gösterilecek hata metni:
 * - AppError → kullanıcının dilinde çeviri (UNKNOWN ise ekranın kendi bağlamsal `fallback` metni)
 * - Diğer hatalar → mesajı varsa mesajı (mağaza SDK'sı veya zaten çevrilmiş metinler), yoksa `fallback`
 * API katmanındaki Türkçe hata mesajları yalnızca log içindir, kullanıcıya doğrudan gösterilmez.
 */
export const getErrorText = (error: unknown, t: TranslationStructure, fallback: string): string => {
  if (error instanceof AppError) {
    if (error.code === 'UNKNOWN') return fallback;
    return t.errors[errorCodeToTranslationKey[error.code]] ?? fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const getLocalizedErrorMessage = (error: unknown, t: TranslationStructure): string => {
  if (typeof error === 'string') {
    // Eğer doğrudan AppErrorCode string'i gelmişse
    const codeKey = errorCodeToTranslationKey[error as AppErrorCode];
    if (codeKey && t.errors[codeKey]) {
      return t.errors[codeKey];
    }
  }

  const appError = error instanceof AppError ? error : mapAuthError(error);
  const key = errorCodeToTranslationKey[appError.code] ?? 'unknown';
  return t.errors[key] ?? t.errors.unknown;
};

export const mapAuthError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;

  const e = error as { message?: string; code?: string | number };
  const msg = (e?.message ?? '').toLowerCase();
  const code = String(e?.code ?? '').toLowerCase();

  if (__DEV__) console.warn('[auth error]', error);

  // Kullanıcı Apple/Google penceresini kapattı
  if (
    code === 'err_request_canceled' ||
    code === 'sign_in_cancelled' ||
    code === '12501' ||
    msg.includes('cancel')
  ) {
    return new AppError('CANCELLED', 'Giriş iptal edildi.', error);
  }

  if (code.includes('email_address_invalid') || msg.includes('email address') && msg.includes('invalid')) {
    return new AppError('INVALID_EMAIL', 'Geçersiz bir e-posta adresi girdiniz.', error);
  }

  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return new AppError('RATE_LIMITED', 'Çok fazla istek yapıldı. Lütfen biraz bekleyin.', error);
  }

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return new AppError('NETWORK', 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.', error);
  }

  if (
    code.includes('invalid_credentials') ||
    msg.includes('invalid login credentials') ||
    msg.includes('token has expired') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid')
  ) {
    return new AppError('UNAUTHORIZED', 'Oturum doğrulanamadı. Lütfen tekrar deneyin.', error);
  }

  return new AppError('UNKNOWN', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', error);
};

export const mapDatabaseError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  if (__DEV__) console.warn('[db error]', error);

  const e = error as { code?: string; message?: string; details?: string };
  if (
    e?.code === '23503' &&
    (e?.message?.includes('profiles_id_fkey') || e?.details?.includes('users') || e?.message?.includes('users'))
  ) {
    return new AppError('UNAUTHORIZED', 'Kullanıcı hesabı bulunamadı veya oturum geçersiz. Lütfen tekrar giriş yapın.', error);
  }

  return new AppError('UNKNOWN', 'Veritabanı işlemi sırasında bir hata oluştu.', error);
};
