import type { TemplateDoc } from "./types";
import { tokenize, normalizeText } from "./normalizer";
import { expandWithSynonyms } from "./synonyms";

export type LiteIndex = {
  byTag: Map<string, Set<string>>;
  titleLC: Map<string, string>;          // legacy
  byFamily: Map<string, Set<string>>;
  idToTemplate: Map<string, TemplateDoc>;

  byTagTok: Map<string, Set<string>>;
  byTitleTok: Map<string, Set<string>>;

  allIds: string[];
};

export function buildLiteIndex(rows: TemplateDoc[]): LiteIndex {
  const byTag = new Map<string, Set<string>>();
  const titleLC = new Map<string, string>();
  const byFamily = new Map<string, Set<string>>();
  const idToTemplate = new Map<string, TemplateDoc>();

  const byTagTok = new Map<string, Set<string>>();
  const byTitleTok = new Map<string, Set<string>>();
  const allIds: string[] = [];

  for (const t of rows) {
    allIds.push(t.id);
    idToTemplate.set(t.id, t);
    titleLC.set(t.id, t.title.toLowerCase());

    if (t.family) {
      const fam = t.family.toLowerCase();
      if (!byFamily.has(fam)) byFamily.set(fam, new Set());
      byFamily.get(fam)!.add(t.id);
    }

    for (const rawTag of t.tags) {
      if (!byTag.has(rawTag)) byTag.set(rawTag, new Set());
      byTag.get(rawTag)!.add(t.id);

      const tagToks = tokenize(normalizeText(rawTag), { dropStop: false });
      for (const tok of tagToks) {
        if (!byTagTok.has(tok)) byTagTok.set(tok, new Set());
        byTagTok.get(tok)!.add(t.id);
      }
    }

    const titleToks = tokenize(normalizeText(t.title), { dropStop: false });
    for (const tok of titleToks) {
      if (!byTitleTok.has(tok)) byTitleTok.set(tok, new Set());
      byTitleTok.get(tok)!.add(t.id);
    }
  }

  return { byTag, titleLC, byFamily, idToTemplate, byTagTok, byTitleTok, allIds };
}

export type PrefilterOpts = {
  min?: number;                 // default 200
  max?: number;                 // default 1000
  family?: string;

  // scoring knobs (optional)
  wTag?: number;                // default 2
  wTitle?: number;              // default 1
  wSynMultiplier?: number;      // default 0.8 (synonyms slightly weaker)
  capQuery?: number;            // default 64 (max tokens after expansion)
};

/** Return candidate IDs using tag/title token overlap (cheap). */
export function candidateIds(
  draft: string,
  lite: LiteIndex,
  opts: PrefilterOpts = {}
): string[] {
  let {
    min = 200,
    max = 1000,
    family,
    wTag = 2,
    wTitle = 1,
    wSynMultiplier = 0.8,
    capQuery = 64
  } = opts;

  // sanity
  if (min < 0) min = 0;
  if (max < 0) max = 0;
  if (min > max) [min, max] = [max, min];

  // tokenize once
  const base = tokenize(normalizeText(draft));     // base tokens (stopwords dropped)
  const baseSet = new Set(base);

  // expand + dedupe
  const expanded = expandWithSynonyms(base);
  let q = [...new Set(expanded.length ? expanded : base)];

  // cap query size to avoid huge fan-out (keep base first, then synonyms)
  if (q.length > capQuery) {
    const syns = q.filter(t => !baseSet.has(t));
    const keep = Math.max(0, capQuery - base.length);
    q = base.concat(syns.slice(0, Math.max(0, keep)));
  }

  const famSet = family ? lite.byFamily.get(family.toLowerCase()) : undefined;

  const scores = new Map<string, number>();
  const bump = (id: string, w: number) => {
    if (famSet && !famSet.has(id)) return;
    scores.set(id, (scores.get(id) ?? 0) + w);
  };

  // score overlaps
  for (const tok of q) {
    const synMult = baseSet.has(tok) ? 1 : wSynMultiplier;

    const tagIds = lite.byTagTok.get(tok);
    if (tagIds) for (const id of tagIds) bump(id, wTag * synMult);

    const titleIds = lite.byTitleTok.get(tok);
    if (titleIds) for (const id of titleIds) bump(id, wTitle * synMult);
  }

  let ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // backfill to reach min
  if (ranked.length < min) {
    const seen = new Set(ranked);
    const pool = famSet ? [...famSet] : lite.allIds;
    for (const id of pool) {
      if (seen.has(id)) continue;
      ranked.push(id);
      if (ranked.length >= min) break;
    }
  }

  if (ranked.length > max) ranked = ranked.slice(0, max);
  return ranked;
}

/** Return candidate TemplateDocs, not just IDs. */
export function prefilterCandidates(
  draft: string,
  lite: LiteIndex,
  opts?: PrefilterOpts
): TemplateDoc[] {
  const ids = candidateIds(draft, lite, opts);
  const out: TemplateDoc[] = [];
  for (const id of ids) {
    const t = lite.idToTemplate.get(id);
    if (t) out.push(t);
  }
  return out;
}
