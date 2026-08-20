import type { NextConfig } from "next";

// A conservative CSP: 'unsafe-inline'/'unsafe-eval' on scripts are needed
// because Next.js's App Router injects inline hydration scripts and this app
// doesn't run a per-request nonce pipeline — tightening that further is a
// separate, larger change. Everything else here (frame-ancestors, connect-src,
// form-action, base-uri) is safe to lock down with zero functional risk.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:47800",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // @react-pdf/renderer uses Node.js-only APIs (canvas, zlib, etc.) — keep it
  // server-side only so the client bundle never tries to import it.
  serverExternalPackages: ["@react-pdf/renderer"],
  // HTTP-level redirects — handled before Next.js page rendering, so they
  // never call redirect() from next/navigation which triggers an internal
  // server-to-server fetch that fails on Hostinger.
  async redirects() {
    return [
      { source: "/", destination: "/dashboard", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
