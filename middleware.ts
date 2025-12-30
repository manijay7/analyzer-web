import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();

    // Security Headers for Banking Environment
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Strict Transport Security (HSTS) for HTTPS enforcement in production
    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }

    // Content Security Policy (CSP) - Banking Environment Compliant
    // In development: Allow unsafe-eval and unsafe-inline for Next.js HMR and React Fast Refresh
    // In production: Strict CSP without unsafe directives
    const isDevelopment = process.env.NODE_ENV === "development";

    const cspDirectives = [
      "default-src 'self'",
      isDevelopment
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline'",
      isDevelopment ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'",
      "font-src 'self'",
      "img-src 'self'",
      isDevelopment ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-src 'none'",
    ];
    response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

    // Permissions Policy (formerly Feature Policy)
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );

    return response;
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|logos).*)",
  ],
};
