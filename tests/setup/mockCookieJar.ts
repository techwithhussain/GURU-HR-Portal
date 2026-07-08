/**
 * `next/headers`'s cookies() only works inside a real Next.js request scope.
 * Integration tests call services directly (no HTTP server), so each
 * integration test file mocks "next/headers" against this shared in-memory jar.
 */
export const mockCookieJar = new Map<string, string>();

export function mockCookiesImplementation() {
  return {
    get: (name: string) =>
      mockCookieJar.has(name) ? { name, value: mockCookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => {
      mockCookieJar.set(name, value);
    },
    delete: (name: string) => {
      mockCookieJar.delete(name);
    },
  };
}
