export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
}

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Chrome\//, "Chrome"],
  [/CriOS\//, "Chrome"],
  [/Firefox\//, "Firefox"],
  [/FxiOS\//, "Firefox"],
  [/Version\/.*Safari\//, "Safari"],
];

const OS_PATTERNS: Array<[RegExp, string]> = [
  [/Windows NT/, "Windows"],
  [/Mac OS X/, "macOS"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Linux/, "Linux"],
];

/** Lightweight, regex-based UA parsing — good enough for the optional Device Info report section. */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) return { browser: null, os: null };

  const browser = BROWSER_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
  const os = OS_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;

  return { browser, os };
}
