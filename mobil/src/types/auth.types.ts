export type AuthSession = {
  phoneNumber: string;
  isVerified: boolean;
};

export type PhoneFormState = {
  phoneNumber: string;
  isLoading: boolean;
  errorMessage?: string;
};

export type VerifyFormState = {
  code: string;
  isLoading: boolean;
  resendCountdown: number;
  errorMessage?: string;
};
