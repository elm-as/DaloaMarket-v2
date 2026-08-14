/**
 * Anti-Spam & Validation Utilities
 * Filters disposable emails & dummy test phone numbers.
 */

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'kierko.com',
  'aganseo.com',
  'tempmail.com',
  'yopmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'dispostable.com',
  'trashmail.com',
  'getnada.com',
]);

const DUMMY_PHONE_NUMBERS = new Set([
  '0101010101',
  '0710101010',
  '0000000000',
  '1234567890',
  '0102030405',
  '0505050505',
  '0707070707',
  '0808080808',
  '0909090909',
  '0101010100',
]);

/**
 * Checks if an email uses a disposable email provider.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}

/**
 * Checks if a phone number is a known dummy/test number.
 */
export function isDummyPhone(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return DUMMY_PHONE_NUMBERS.has(cleanPhone);
}
