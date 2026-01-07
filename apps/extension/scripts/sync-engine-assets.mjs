// Copy packaged engine assets into the extension public folder for bundling.
import { cp, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../../../packages/engine/generated");
const DEST = resolve(__dirname, "../public/engine");

async function main() {
  await rm(DEST, { recursive: true, force: true });
  await cp(SRC, DEST, { recursive: true });
  console.log(`[sync-engine-assets] Copied engine assets -> ${DEST}`);
}

main().catch((err) => {
  console.error("[sync-engine-assets] Failed to copy engine assets", err);
  process.exit(1);
});
