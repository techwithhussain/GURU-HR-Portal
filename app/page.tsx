// Root page: redirect is handled by next.config.ts HTTP redirect (/ → /dashboard)
// This file is kept as a fallback but should never render in production.
export default function Home() {
  return null;
}
