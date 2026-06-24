// `||` (not `??`) so a present-but-blank ADMIN_EMAIL — exactly what an unset
// Vercel var or a pulled `.env.local` produces — still falls back to the owner
// account instead of locking everyone out of the dashboard.
export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL?.trim() || "murphyusc@gmail.com"
).toLowerCase();

export function isAdminEmail(email?: string | null): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}
