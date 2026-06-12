/** Shared by the proposals route handlers. Lives outside route.ts because
 *  Next.js route files may only export HTTP-method handlers. */
export function dbError(e: unknown): Response {
  const message = e instanceof Error ? e.message : "database error";
  const status = message.includes("DATABASE_URL") ? 503 : 500;
  return Response.json({ error: message }, { status });
}
