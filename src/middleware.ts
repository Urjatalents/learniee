import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const roleRoutes: Record<string, string> = {
  "/admin": "admin",
  "/teacher": "teacher",
  "/parent": "parent",
  "/hr": "hr",
  "/it": "it",
  "/accounts": "accounts",
};

interface MiddlewareTokenPayload {
  exp?: number;
  [key: string]: unknown;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const matchedPrefix = Object.keys(roleRoutes).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const token = req.cookies.get("idToken")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const decoded = jwtDecode<MiddlewareTokenPayload>(token);

    // This still only decodes the JWT - it does not verify the
    // Cognito signature (see 06-OPEN-DECISIONS.md #21 / the
    // JWT-verification tracking item). What it does catch: an
    // EXPIRED token used to pass this check indefinitely as long
    // as it still decoded, because only "custom:role" was ever
    // checked. `exp` is a Unix timestamp in seconds; without this
    // check a stale idToken cookie kept granting route access
    // forever instead of forcing a re-login.
    if (typeof decoded.exp !== "number" || decoded.exp * 1000 <= Date.now()) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (decoded["custom:role"] !== roleRoutes[matchedPrefix]) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/parent/:path*",
    "/hr/:path*",
    "/it/:path*",
    "/accounts/:path*",
  ],
};