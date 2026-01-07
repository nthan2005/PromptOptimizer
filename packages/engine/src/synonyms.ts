import type { SynonymsDict } from "./types";

let SYNS = new Map<string, string[]>();

type LoadOpts = {
  capPerKey?: number;
  devCheck?: boolean;      // also verifies symmetry
};

export function loadSynonyms(dict: SynonymsDict, opts: LoadOpts = {}) {
  const { capPerKey = Infinity, devCheck = false } = opts;

  if (devCheck) {
    const bad: string[] = [];
    const ok = (s: string) => /^[a-z0-9_]+$/.test(s);

    // format + symmetry checks
    for (const [k, vals] of Object.entries(dict)) {
      if (!ok(k)) bad.push(`bad key: ${k}`);
      const set = new Set(vals.filter(v => v !== k));
      for (const v of set) {
        if (!ok(v)) bad.push(`bad val: ${k} -> ${v}`);
        const back = dict[v];
        if (!back || !new Set(back).has(k)) {
          bad.push(`not symmetric: ${k} <-> ${v}`);
        }
      }
    }
    if (bad.length) {
      throw new Error(`[synonyms] validation failed:\n- ${bad.slice(0, 50).join("\n- ")}${bad.length > 50 ? "\n...more" : ""}`);
    }
  }

  // Atomic build → publish
  const next = new Map<string, string[]>();
  for (const [k, vals] of Object.entries(dict)) {
    const arr = [...new Set(vals.filter(v => v !== k))].sort();
    next.set(k, arr.length > capPerKey ? arr.slice(0, capPerKey) : arr);
  }
  SYNS = next;
}

export function getSynonyms(key: string): readonly string[] {
  return SYNS.get(key) ?? [];
}

export function expandWithSynonyms(tokens: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) if (!seen.has(t)) { seen.add(t); out.push(t); }
  for (const t of tokens) {
    const syns = SYNS.get(t);
    if (!syns) continue;
    for (const s of syns) if (!seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}
