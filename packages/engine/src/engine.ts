import { buildLiteIndex, candidateIds } from "./prefilter";
import { buildBm25Index, scoreDoc } from "./bm25f";
import { expandWithSynonyms, loadSynonyms } from "./synonyms";
import { loadAllPacks, loadManifest, loadSynonymsDict } from "./loader";
import { tokenize, normalizeText } from "./normalizer";
import type { TemplateDoc } from "./types";
import type { SearchRequest, SearchResult } from "./api";
import { fillTemplate } from "./filler";
import type { PrefilterOpts } from "./prefilter";
import { getAllTemplates, getMeta } from "./db";
import { seedFromArray } from "./seeder";

type EngineOptions = {
  dataBasePath: string;
  maxResults?: number;
  synonymCap?: number;
  prefilter?: PrefilterOpts;
};

type EngineState = {
  templates: TemplateDoc[];
};

export class Engine {
  private loading?: Promise<void>;
  private ready = false;
  private state: EngineState = { templates: [] };
  private lite = buildLiteIndex([]);
  private bm25 = buildBm25Index([]);
  private opts: Required<EngineOptions>;

  constructor(options: EngineOptions) {
    this.opts = {
      maxResults: options.maxResults ?? 20,
      synonymCap: options.synonymCap ?? 6,
      prefilter: options.prefilter ?? { min: 80, max: 400 },
      dataBasePath: options.dataBasePath
    };
  }

  async init(): Promise<void> {
    if (this.ready) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const manifest = await loadManifest(this.opts.dataBasePath);
      const manifestHash = manifest.hash;

      let templates: TemplateDoc[] = [];
      try {
        const current = await getMeta("manifestHash");
        if (current?.value === manifestHash) {
          templates = await getAllTemplates(true);
        }
      } catch (err) {
        console.warn("[Engine] Failed to load cached templates from IndexedDB", err);
      }

      if (!templates.length) {
        const fetched = await loadAllPacks(manifest, this.opts.dataBasePath);
        templates = fetched;
        try {
          await seedFromArray(fetched, manifestHash);
        } catch (err) {
          console.warn("[Engine] Failed to seed templates into IndexedDB", err);
        }
      }

      const synDict = await loadSynonymsDict(this.opts.dataBasePath);
      loadSynonyms(synDict, { capPerKey: this.opts.synonymCap });

      this.state.templates = templates;
      this.lite = buildLiteIndex(templates);
      this.bm25 = buildBm25Index(templates);
      this.ready = true;
    })();

    return this.loading;
  }

  async seedFromManifest(): Promise<void> {
    await this.init();
  }

  async searchTemplates(request: SearchRequest): Promise<SearchResult[]> {
    await this.init();
    const draft = request.draft || "";
    if (!draft.trim()) return [];

    const idCandidates = candidateIds(draft, this.lite, this.opts.prefilter);

    const baseTokens = tokenize(normalizeText(draft));
    const queryTerms = expandWithSynonyms(baseTokens);

    const scored = idCandidates
      .map((id) => ({ id, score: scoreDoc(id, queryTerms, this.bm25) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const maxScore = scored[0]?.score ?? 1;
    const results: SearchResult[] = [];
    for (const { id, score } of scored.slice(0, this.opts.maxResults)) {
      const tpl = this.state.templates.find((t) => t.id === id);
      if (!tpl) continue;
      const filled = fillTemplate(tpl, draft, request.context || {});
      const normalizedScore = maxScore > 0 ? score / maxScore : 0;
      results.push({
        candidateId: tpl.id,
        templateTitle: tpl.title,
        filledPrompt: filled.filled,
        score: Number(normalizedScore.toFixed(4))
      });
    }
    return results;
  }

  async recordEvent(): Promise<void> {
    // Placeholder for future bandit/analytics.
    return;
  }
}
