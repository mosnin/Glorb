/**
 * Patch for @opennextjs/cloudflare compatibility with Next.js 16.
 *
 * Next.js 16 (Turbopack) no longer outputs server/middleware.js into the
 * standalone directory. OpenNext hardcodes looking for this file and throws
 * if it's missing. This script copies it from .next/server/ to the
 * standalone directory, or creates a minimal stub if it doesn't exist.
 */
import { existsSync, copyFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const dotNext = ".next";
const standalone = join(".next", "standalone", ".next");
const serverDir = join(standalone, "server");

const middlewareJs = join(dotNext, "server", "middleware.js");
const middlewareNft = join(dotNext, "server", "middleware.js.nft.json");
const standaloneMiddlewareJs = join(serverDir, "middleware.js");
const standaloneMiddlewareNft = join(serverDir, "middleware.js.nft.json");

// Ensure server dir exists
mkdirSync(serverDir, { recursive: true });

// Copy or stub middleware.js
if (existsSync(middlewareJs)) {
  console.log("Copying middleware.js to standalone...");
  copyFileSync(middlewareJs, standaloneMiddlewareJs);
} else if (!existsSync(standaloneMiddlewareJs)) {
  console.log("Creating middleware.js stub in standalone (Next.js 16 Turbopack compat)...");
  // Minimal stub — OpenNext bundles middleware separately; this just needs to exist
  writeFileSync(standaloneMiddlewareJs, "// Next.js 16 proxy (middleware stub)\n");
}

// Copy or stub the .nft.json trace file
if (existsSync(middlewareNft)) {
  console.log("Copying middleware.js.nft.json to standalone...");
  copyFileSync(middlewareNft, standaloneMiddlewareNft);
} else if (!existsSync(standaloneMiddlewareNft)) {
  console.log("Creating middleware.js.nft.json stub...");
  writeFileSync(standaloneMiddlewareNft, JSON.stringify({ version: 1, files: [] }));
}

console.log("Cloudflare build patch complete.");
