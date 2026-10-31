export const PHONE_MAX_DIGITS = 10;

export const formatPhone = (digits: string) =>
    [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
        .filter(Boolean)
        .join(' ');

export const sanitizePhone = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.length > PHONE_MAX_DIGITS && digits.startsWith('90')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(0, PHONE_MAX_DIGITS);
};
