# PromptOptimizer
Local-first Chrome/Edge MV3 extension that optimizes your ChatGPT prompts on-page. All retrieval, ranking, and filling run in the browser—no post-install network calls—so drafts stay private while still getting ranked template suggestions.

GITHUB: https://github.com/nthan2005/PromptOptimizer
## What it does
- Captures the ChatGPT compose box via a content script overlay (“Optimize” button, status, results, collapse toggle).
- Normalizes and expands your draft (stopwords, NFKD folding, optional hyphen preservation, synonym expansion) for lexical recall.
- Prefilters on tags/title/family then ranks with a fielded BM25F scorer across title/tags/body.
- Fills template placeholders with heuristics (language, tone, audience, domain, draft) before inserting or copying to clipboard as fallback.
- Surfaces readiness/template counts in the popup and basic preferences in the options page (enable toggle, retrieval weight hook).

## Architecture (MV3)
- **Content Script (CS):** Injects overlay UI, reads the draft, renders candidates, inserts or copies on click.
- **Service Worker (SW):** Routes messages, ensures offscreen document exists, applies timeout/retry wrappers, seeds on install.
- **Offscreen Document (OSD):** Hosts the Engine; keeps IndexedDB/Dexie connections alive; responds to PROCESS_DRAFT/RECORD_EVENT.
- **Engine (packages/engine):** Loader → normalizer/synonyms → prefilter → BM25F → filler; Dexie-backed IndexedDB with manifest hash to avoid reseeding.
- IPC uses discriminated-message payloads; packaged assets (manifest, packs, synonyms) live under `public/engine`.

## Repo layout
- `apps/extension/src`: MV3 code (service-worker, offscreen, content-script, popup, options, components).
- `packages/engine/src`: Retrieval/filling modules (normalizer, synonyms, prefilter, bm25f, filler, loader, db/seeder, engine).
- `scripts/sync-engine-assets.mjs`: Copies generated engine assets into the extension `public/engine` before dev/build.
- `packages/engine/assets`: Contains the data (templates and synonyms) used for manual testing.

## Prerequisites
- Node 20+, pnpm 9+, Chrome/Edge with Developer Mode enabled.

## Install & build
```bash
pnpm install
# Build extension (runs sync-engine-assets, tsc, Vite/CRX bundle)
pnpm -C apps/extension build
```

## Load in Chrome/Edge
1. Open `chrome://extensions` (or Edge equivalent) and enable Developer Mode.
2. Click “Load unpacked” and select `apps/extension/dist`.
3. Open `chatgpt.com` and verify the overlay mounts near the compose box.

## Manual test checklist
- Overlay appears and stays fixed; does not shift page layout.
- Optimize shows loading then ranked candidates with scores/titles/snippets; errors display a message.
- Selecting inserts into the textbox; if blocked, clipboard contains the prompt and status reflects the fallback; caret ends at the tail.
- Popup reads “Ready” and template count matches manifest; persists across refresh/SW restart.
- Options changes (enable/disable, retrieval weight) persist via `chrome.storage.local`; disable hides/blocks overlay actions.
- DevTools Network stays quiet during optimize (privacy); end-to-end latency stays sub-second on a typical laptop.
- Clearing extension storage triggers reseed; offscreen document spins up on demand.
- Basic accessibility: tab order works, buttons/links labeled; overlay does not cover the ChatGPT send button.

## Future work (short list)
- Wire `recordEvent` to local telemetry; experiment with personalization/A-B of ranking weights.
- UI polish: card deck/grid, pagination or infinite scroll, inline previews, keyboard shortcuts, theme alignment, full a11y audit.
- Data: export/import packs, user templates, synonym editing, conflict resolution, versioned manifests.
- Resilience: hardened selectors for evolving chat UIs, richer error handling/retry, local logging, robustness to OSD/SW restarts.
- Tests: Playwright smoke for overlay/popup/options; unit tests for normalizer/synonyms/prefilter/BM25/filler; IPC contract checks.

## Notes on assets
- Engine assets (manifest, packs, synonyms) must be present under `public/engine` before building. If you regenerate them, rerun `scripts/sync-engine-assets.mjs` or the build script to copy into `dist/public/engine`.

## License
See [LICENSE](LICENSE).
