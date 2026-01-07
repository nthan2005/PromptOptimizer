export interface TemplateDoc {
  id: string;
  title: string;
  tags: string[];
  body: string;
  family?: string;
  enabled: boolean;
  required?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MetaRow {
  key: string;
  value: string; 
}

export type SynonymsDict = Record<string, string[]>;

export interface ManifestCategory {
  category: string;
  total: number;
  packs: { file: string; count: number; hash: string }[];
}

export interface TemplateManifest {
  generatedAt: number;
  hash: string;
  packSize: number;
  categories: ManifestCategory[];
}
