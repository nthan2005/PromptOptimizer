import Dexie, { type Table } from "dexie";
import type { TemplateDoc, MetaRow } from "./types";

// add numeric enabledKey for fast where()
type TemplateRow = TemplateDoc & { enabledKey: 0 | 1 };

class EngineDB extends Dexie {
  templates!: Table<TemplateRow, string>;
  meta!: Table<MetaRow, string>;
  constructor() {
    super("AutoPromptDB");
    // fresh project? just start at v1 with enabledKey (no old migration)
    this.version(1).stores({
      templates: "id, family, *tags, enabledKey, updatedAt",
      meta: "key"
    });
  }
}
export const db = new EngineDB();

// helpers
export async function upsertTemplates(rows: TemplateDoc[]) {
  const withKeys: TemplateRow[] = rows.map(r => ({
    ...r,
    enabledKey: (r.enabled ? 1 : 0) as 0 | 1
  }));
  await db.transaction("rw", db.templates, async () => {
    await db.templates.bulkPut(withKeys);
  });
}

export async function getAllTemplates(enabledOnly = true) {
  return enabledOnly
    ? db.templates.where("enabledKey").equals(1).toArray()
    : db.templates.toArray();
}

export const setMeta = (key: string, value: string) => db.meta.put({ key, value });
export const getMeta = (key: string) => db.meta.get(key);

export const resetDbForTests = async () => {
  try { if (db.isOpen()) db.close(); } catch {}
  await db.delete();
  await db.open();
};