/**
 * Formats and validates phone numbers.
 * Defaults to Botswana country code (+267) if no international prefix is provided.
 */
export function formatAndValidatePhone(input: string): { isValid: boolean; formatted: string; error?: string } {
  if (!input || !input.trim()) {
    return { isValid: false, formatted: '', error: 'Phone number is required.' };
  }

  // Remove spaces, dashes, brackets
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  if (cleaned.startsWith('+')) {
    // Already has +
    const digits = cleaned.substring(1);
    if (!/^\d+$/.test(digits)) {
      return { isValid: false, formatted: input, error: 'Phone number must contain only digits.' };
    }
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, formatted: input, error: 'Phone number must be between 7 and 15 digits.' };
    }
    return { isValid: true, formatted: cleaned };
  }

  // If starts with 267 and is 11 digits (267 + 8 digits)
  if (cleaned.startsWith('267') && cleaned.length >= 10) {
    cleaned = '+' + cleaned;
    return { isValid: true, formatted: cleaned };
  }

  // If numeric without + prefix, treat as Botswana local number (+267)
  if (/^\d+$/.test(cleaned)) {
    // In Botswana, standard mobile and landlines are 7 or 8 digits (e.g. 71xxxxxx, 72xxxxxx, 74xxxxxx, 3xxxxxx)
    if (cleaned.length >= 7 && cleaned.length <= 9) {
      cleaned = '+267' + cleaned;
      return { isValid: true, formatted: cleaned };
    }
    // If user typed 8 digits or standard
    cleaned = '+267' + cleaned;
    return { isValid: true, formatted: cleaned };
  }

  return { isValid: false, formatted: input, error: 'Invalid phone number format.' };
}
