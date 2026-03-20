/**
 * Patch for @opennextjs/cloudflare compatibility with Next.js 16.
 *
 * Next.js 16 standalone output doesn't include server/middleware.js even
 * though the trace file references it. OpenNext's copyTracedFiles throws
 * when it can't find the file. This script copies or stubs the missing
 * file into the standalone directory.
 */
import { existsSync, copyFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const dotNextServer = join(".next", "server");
const standaloneServer = join(".next", "standalone", ".next", "server");

mkdirSync(standaloneServer, { recursive: true });

const MIDDLEWARE_STUB = "// Next.js 16 proxy (middleware stub)\nmodule.exports = {};\n";
const NFT_STUB = JSON.stringify({ version: 1, files: [] });

// Copy middleware.js from .next/server/ to standalone, or create stub
const srcJs = join(dotNextServer, "middleware.js");
const dstJs = join(standaloneServer, "middleware.js");

if (existsSync(srcJs)) {
  console.log("Copying middleware.js to standalone...");
  copyFileSync(srcJs, dstJs);
} else if (!existsSync(dstJs)) {
  console.log("Creating middleware.js stub in standalone...");
  writeFileSync(dstJs, MIDDLEWARE_STUB);
}

// Copy nft.json trace file, or create stub
const srcNft = join(dotNextServer, "middleware.js.nft.json");
const dstNft = join(standaloneServer, "middleware.js.nft.json");

if (existsSync(srcNft)) {
  console.log("Copying middleware.js.nft.json to standalone...");
  copyFileSync(srcNft, dstNft);
} else if (!existsSync(dstNft)) {
  console.log("Creating middleware.js.nft.json stub in standalone...");
  writeFileSync(dstNft, NFT_STUB);
}

console.log("Cloudflare build patch complete.");
