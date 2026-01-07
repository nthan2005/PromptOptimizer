import { db, upsertTemplates, setMeta, getMeta } from "./db";
import type { TemplateDoc } from "./types";

// tiny non-crypto hash
function fnv1a(str: string) {
  let h = 0x811c9dc5 >>> 0;
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

export async function seedFromArray(rows: TemplateDoc[], manifestHash?: string) {
  // Prefer the manifest hash if provided; otherwise derive a hash from the rows.
  const hash = manifestHash ?? fnv1a(JSON.stringify(rows.map(r => [r.id, r.updatedAt])));
  const current = await getMeta("manifestHash");
  if (current?.value === hash) return;

  await db.transaction("rw", db.templates, db.meta, async () => {
    await db.templates.clear();
    for (let i = 0; i < rows.length; i += 800) {
      await upsertTemplates(rows.slice(i, i + 800));
    }
    await setMeta("manifestHash", hash);
  });
}
