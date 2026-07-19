import archiver from "archiver";
import { createWriteStream, statSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = "C:/HR Portal";
const OUTPUT = path.join(ROOT, "hr-portal-deploy.zip");

// Everything the app needs to run, mirroring the previous manual deploy zip —
// EXCLUDING lib/prisma-client (Prisma's generated client output) and .next
// (the build output). Hostinger runs its own `npm install && npm run build`
// on the server, and shipping our own pre-built copies of these caused
// repeated EACCES errors there — first regenerating the Prisma client over
// our copy, then Next.js's own build trying to clean up our copy of `.next`.
// Leaving both out entirely means Hostinger's build creates them fresh,
// owned by whatever user runs it there, with nothing pre-existing to conflict
// with.
const TOP_LEVEL_ITEMS = [
  ".env.production.local",
  // ".next" is deliberately NOT shipped — see note above
  ".prettierrc.json",
  "actions",
  "app",
  "components",
  "components.json",
  "eslint.config.mjs",
  "features",
  "hooks",
  "lib", // minus lib/prisma-client — filtered out below
  "middleware",
  "next-env.d.ts",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "prisma",
  "prisma.config.ts",
  "proxy.ts",
  "public",
  "scripts",
  "services",
  "tests",
  "tsconfig.json",
  "types",
];

// Paths (relative to ROOT, forward slashes) to leave out of the deploy zip —
// generated output, plus local-only scratch/debug scripts that aren't part
// of the app and pull in devtools (e.g. playwright) not in package.json,
// which fails Next.js's build-time type check.
const EXCLUDE_PATHS = new Set(["lib/prisma-client", "scripts/_debug-login-live2.ts"]);

const FILE_MODE = 0o644;
const DIR_MODE = 0o755;

const output = createWriteStream(OUTPUT);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Zip created: ${OUTPUT} (${(archive.pointer() / 1024 / 1024).toFixed(1)} MB)`);
});
archive.on("warning", (err) => console.warn("archiver warning:", err.message));
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);

// Walks a directory and adds every entry individually with the CORRECT mode
// for its type (files: 644, directories: 755) — archiver's `.directory()`
// and `.glob()` both apply one `mode` value to every matched entry regardless
// of type, which silently produced directories with file-style 644 (missing
// the execute bit a directory needs to be traversed on Linux) or files with
// directory-style 755. The former is what caused repeated, seemingly random
// "permission denied" build failures on the server: whichever file's parent
// directory got 644 became unreadable, and it was a different directory
// (and so a different file) each time depending on build order.
function addDirRecursive(fullPath, zipPath) {
  const entries = readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryFullPath = path.join(fullPath, entry.name);
    const entryZipPath = `${zipPath}/${entry.name}`;
    const relFromRoot = path.relative(ROOT, entryFullPath).split(path.sep).join("/");
    if (EXCLUDE_PATHS.has(relFromRoot)) continue;

    if (entry.isDirectory()) {
      archive.append(null, { name: `${entryZipPath}/`, mode: DIR_MODE });
      addDirRecursive(entryFullPath, entryZipPath);
    } else if (entry.isFile()) {
      archive.file(entryFullPath, { name: entryZipPath, mode: FILE_MODE });
    }
  }
}

for (const item of TOP_LEVEL_ITEMS) {
  const fullPath = path.join(ROOT, item);
  const stat = statSync(fullPath, { throwIfNoEntry: false });
  if (!stat) {
    console.warn("Skipping missing:", item);
    continue;
  }
  if (stat.isDirectory()) {
    archive.append(null, { name: `${item}/`, mode: DIR_MODE });
    addDirRecursive(fullPath, item);
  } else {
    archive.file(fullPath, { name: item, mode: FILE_MODE });
  }
}

await archive.finalize();
