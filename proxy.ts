import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

/**
 * Neon Auth keeps a signed `session_data` cache cookie (default TTL 5 min). Once
 * it lapses, `auth.getSession()` rewrites it — and a cookie write during an RSC
 * render throws "Cookies can only be modified in a Server Action or Route
 * Handler", crashing every protected page a few minutes after login.
 *
 * The refresh has to happen before the page renders. `auth.middleware()` mints
 * the fresh cookie, but only emits it on the *response* (for the next request) —
 * the render still reads the stale cookie off the *request* and writes anyway.
 * So we fold the refreshed cookie back into this request's `Cookie` header via
 * `NextResponse.next({ request: { headers } })`; the render's `getSession()` then
 * validates it locally and never needs to write.
 *
 * Scoped to GET on purpose: only navigations reach the RSC render path. Server
 * Actions POST to their own route (where cookie writes are legal) and running the
 * auth middleware over those POSTs previously redirected them and broke React's
 * action response — so non-GET requests pass through untouched. Auth stays
 * enforced by the page guards (`requireUsuario`) and inside each Server Action.
 */
const authMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" });

export default async function proxy(request: NextRequest) {
  if (request.method !== "GET") return NextResponse.next();

  const res = await authMiddleware(request);

  // Unauthenticated → auth.middleware redirects to sign-in; let it through as-is.
  if (res.headers.has("location")) return res;

  const setCookies = res.headers.getSetCookie();
  if (setCookies.length === 0) return res; // cache still valid → nothing refreshed

  // Mirror the refreshed cookie onto the request the page will render with, so
  // getSession() hits the local (no-write) fast path instead of rewriting cookies.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "cookie",
    mergeCookies(request.headers.get("cookie") ?? "", setCookies),
  );

  const merged = NextResponse.next({ request: { headers: requestHeaders } });
  for (const cookie of setCookies) merged.headers.append("set-cookie", cookie);
  return merged;
}

/** Apply `Set-Cookie` name/value pairs on top of the request's `Cookie` header. */
function mergeCookies(cookieHeader: string, setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

export const config = {
  // Refresh runs on protected navigations only. Excludes API, framework static
  // assets, any path with a file extension (everything served from `public/`,
  // e.g. /icons/whatsapp.png — the image optimizer fetches these internally with
  // no auth cookie, so a redirect here 400s the optimizer), and the
  // public/unauthenticated areas (auth pages, invitation acceptance, the public
  // "Quiero apoyar" form), which must not be redirected to sign-in.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth|invitacion|apoyar|.*\\..*).*)",
  ],
};
