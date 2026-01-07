import type { SynonymsDict, TemplateDoc, TemplateManifest } from "./types";

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json() as Promise<T>;
};

export async function loadManifest(basePath: string): Promise<TemplateManifest> {
  return fetchJson<TemplateManifest>(`${basePath}/manifest.json`);
}

export async function loadSynonymsDict(basePath: string): Promise<SynonymsDict> {
  return fetchJson<SynonymsDict>(`${basePath}/synonyms.json`);
}

export async function loadAllPacks(
  manifest: TemplateManifest,
  basePath: string
): Promise<TemplateDoc[]> {
  const packs = manifest.categories.flatMap((c) =>
    c.packs.map((p) => p.file)
  );
  const unique = [...new Set(packs)];

  const results: TemplateDoc[] = [];
  for (const file of unique) {
    const rows = await fetchJson<TemplateDoc[]>(`${basePath}/${file}`);
    for (const t of rows) {
      if (t.enabled !== false) results.push(t);
    }
  }
  return results;
}
