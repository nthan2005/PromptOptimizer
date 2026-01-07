// src/ipc/EngineAPIImpl.ts
import { Engine } from '../../../../packages/engine/src/engine';
import { loadManifest } from '../../../../packages/engine/src/loader';
import type { TemplateManifest } from '../../../../packages/engine/src/types';
import type { EngineStatus, IEngineAPI, SearchRequest, SearchResult } from './EngineAPI';

export class EngineAPI implements IEngineAPI {
  private readonly basePath: string;
  private readonly engine: Engine;
  private manifest?: TemplateManifest;

  constructor(basePath = chrome.runtime.getURL('engine')) {
    this.basePath = basePath;
    this.engine = new Engine({
      dataBasePath: this.basePath,
      maxResults: 10,
      synonymCap: 6
    });
  }

  private async ensureManifest(): Promise<TemplateManifest | undefined> {
    if (this.manifest) return this.manifest;
    try {
      this.manifest = await loadManifest(this.basePath);
    } catch (err) {
      console.error('[EngineAPI] Failed to load manifest', err);
    }
    return this.manifest;
  }

  async init(): Promise<void> {
    await this.engine.init();
    await this.ensureManifest();
  }

  async seedFromManifest(): Promise<void> {
    await this.engine.seedFromManifest();
    await this.ensureManifest();
  }

  async searchTemplates(request: SearchRequest): Promise<SearchResult[]> {
    await this.init();
    return this.engine.searchTemplates(request);
  }

  async recordEvent(_event: { eventType: string; candidateId: string }): Promise<void> {
    // Not yet used, but keep the call path consistent.
    await this.engine.recordEvent();
  }

  async getStatus(): Promise<EngineStatus> {
    await this.init();
    const manifest = await this.ensureManifest();
    const templateCount = manifest
      ? manifest.categories.reduce((sum, c) => sum + c.total, 0)
      : 0;
    const categories = manifest?.categories.length ?? 0;
    return { ready: true, templateCount, categories };
  }
}
