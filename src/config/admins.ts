/**
 * নির্ধারিত ৩ জন স্থায়ী অ্যাডমিনের তালিকা।
 * এই ৩টি জিমেইল ছাড়া অন্য কোনো অ্যাকাউন্ট কখনোই অ্যাডমিন হতে পারবে না।
 */
export const FIXED_ADMIN_EMAILS = [
  'itvdrive84@gmail.com',
  'itisamgfx@gmail.com',
  'whitepenguin110@gmail.com',
] as const;

export const INITIAL_ADMIN_EMAILS = [...FIXED_ADMIN_EMAILS];

export function isFixedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return FIXED_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized);
}
