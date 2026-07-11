const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/tv", "/api/tv"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
