import "server-only";

import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth/session";

/**
 * Guards a Server Component, Server Function or Route Handler behind the
 * shared session. Redirects to /login when no valid session is present.
 * The proxy layer redirects unauthenticated page navigations, but SPEC.md
 * section 7.4 requires every read and mutation to enforce this
 * independently as well.
 */
export async function requireSession(): Promise<void> {
  const authenticated = await validateSession();
  if (!authenticated) {
    redirect("/login");
  }
}
