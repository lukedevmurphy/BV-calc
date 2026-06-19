export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ?? "murphyusc@gmail.com"
).toLowerCase();

export function isAdminEmail(email?: string | null): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL;
}
