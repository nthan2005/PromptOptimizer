// src/ipc/EngineAPI.ts

// Data from Content Script to Engine
export interface SearchRequest {
  draft: string; //Prompt to optimize
  context: Record<string, any>; // Context (domain, language, etc.)
}

// Result from Engine
export interface SearchResult {
  candidateId: string;
  templateTitle: string;
  filledPrompt: string; // Prompt filled with placeholders
  score: number; // Ranking score (for bandit)
}

export interface EngineStatus {
  ready: boolean;
  templateCount: number;
  categories: number;
}

// Call command from Service Worker or Content Script to Engine (via Offscreen Document)
export type EngineCallMessage = 
  | { type: 'seedFromManifest' }
  | { type: 'searchTemplates', payload: SearchRequest }
  | { type: 'recordEvent', payload: { eventType: 'REPLACE' | 'COPY' | 'DISCARD', candidateId: string } }
  | { type: 'getStatus' };

// Response from Engine to Service Worker or Content Script
export type EngineResponseMessage = 
  | { success: true, payload: SearchResult[] | EngineStatus | undefined } // Undefined for commands that do not return data (like recordEvent)
  | { success: false, error: string };


// Interface of the Engine API
export interface IEngineAPI {
  init(): Promise<void>;
  seedFromManifest(): Promise<void>;
  searchTemplates(request: SearchRequest): Promise<SearchResult[]>;
  recordEvent(event: { eventType: string, candidateId: string }): Promise<void>;
  getStatus(): Promise<EngineStatus>;
}

// Size of Offscreen Document required by the Engine
export const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
