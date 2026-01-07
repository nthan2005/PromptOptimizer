export interface SearchRequest {
  draft: string;
  context: Record<string, any>;
}

export interface SearchResult {
  candidateId: string;
  templateTitle: string;
  filledPrompt: string;
  score: number;
}

export type EngineEvent = { eventType: "REPLACE" | "COPY" | "DISCARD"; candidateId: string };
