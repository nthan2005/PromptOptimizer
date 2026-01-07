import { normalizeText, tokenize } from "./normalizer";
import type { TemplateDoc } from "./types";

type FieldKey = "title" | "tags" | "body";

type DocFields = {
  titleTokens: string[];
  tagTokens: string[];
  bodyTokens: string[];
};

type FieldStats = {
  avgLen: number;
};

export type Bm25Index = {
  docs: Map<string, DocFields>;
  df: Map<string, number>;
  fieldStats: Record<FieldKey, FieldStats>;
  totalDocs: number;
};

export type Bm25ScoreOpts = {
  k1?: number;
  bTitle?: number;
  bTags?: number;
  bBody?: number;
  wTitle?: number;
  wTags?: number;
  wBody?: number;
};

const defaultBm25Opts: Required<Bm25ScoreOpts> = {
  k1: 1.5,
  bTitle: 0.6,
  bTags: 0.5,
  bBody: 0.75,
  wTitle: 3,
  wTags: 2,
  wBody: 1
};

export function buildBm25Index(rows: TemplateDoc[]): Bm25Index {
  const docs = new Map<string, DocFields>();
  const df = new Map<string, number>();

  let totalTitle = 0;
  let totalTags = 0;
  let totalBody = 0;

  for (const t of rows) {
    const titleTokens = tokenize(normalizeText(t.title), { dropStop: true });
    const tagTokens = t.tags
      .map((tg) => normalizeText(tg))
      .flatMap((tg) => tokenize(tg, { dropStop: true }));
    const bodyTokens = tokenize(normalizeText(t.body), { dropStop: true, minLen: 2 });

    docs.set(t.id, { titleTokens, tagTokens, bodyTokens });

    totalTitle += titleTokens.length;
    totalTags += tagTokens.length;
    totalBody += bodyTokens.length;

    const seenTerms = new Set<string>();
    for (const tok of [...titleTokens, ...tagTokens, ...bodyTokens]) {
      if (seenTerms.has(tok)) continue;
      seenTerms.add(tok);
      df.set(tok, (df.get(tok) ?? 0) + 1);
    }
  }

  const totalDocs = rows.length || 1;

  return {
    docs,
    df,
    totalDocs,
    fieldStats: {
      title: { avgLen: totalTitle / totalDocs || 1 },
      tags: { avgLen: totalTags / totalDocs || 1 },
      body: { avgLen: totalBody / totalDocs || 1 }
    }
  };
}

function idf(term: string, index: Bm25Index) {
  const df = index.df.get(term) ?? 0;
  return Math.log(1 + (index.totalDocs - df + 0.5) / (df + 0.5));
}

export function scoreDoc(
  docId: string,
  queryTerms: readonly string[],
  index: Bm25Index,
  opts: Bm25ScoreOpts = {}
): number {
  const doc = index.docs.get(docId);
  if (!doc) return 0;

  const {
    k1,
    bTitle,
    bTags,
    bBody,
    wTitle,
    wTags,
    wBody
  } = { ...defaultBm25Opts, ...opts };

  const termFreq = (tokens: string[]) => {
    const map = new Map<string, number>();
    for (const tok of tokens) map.set(tok, (map.get(tok) ?? 0) + 1);
    return map;
  };

  const tfTitle = termFreq(doc.titleTokens);
  const tfTags = termFreq(doc.tagTokens);
  const tfBody = termFreq(doc.bodyTokens);

  const lenTitle = doc.titleTokens.length || 1;
  const lenTags = doc.tagTokens.length || 1;
  const lenBody = doc.bodyTokens.length || 1;

  let score = 0;
  for (const term of queryTerms) {
    const idfTerm = idf(term, index);

    const piece = (
      weight: number,
      tf: number,
      len: number,
      avgLen: number,
      b: number
    ) => {
      if (tf === 0) return 0;
      return weight * idfTerm * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (len / avgLen)));
    };

    score += piece(wTitle, tfTitle.get(term) ?? 0, lenTitle, index.fieldStats.title.avgLen, bTitle);
    score += piece(wTags, tfTags.get(term) ?? 0, lenTags, index.fieldStats.tags.avgLen, bTags);
    score += piece(wBody, tfBody.get(term) ?? 0, lenBody, index.fieldStats.body.avgLen, bBody);
  }

  return score;
}
