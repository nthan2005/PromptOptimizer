export const NORMALIZER_VERSION = "1.0.0";

/* Type describing knobs for tokenization behavior */
export type NormalizeOptions = {               // Define a TypeScript type for options passed to tokenize().
  dropStop?: boolean;                          // If true (default), remove stopwords from tokens.
  stop?: Set<string>;                          // Optional custom stopword set; defaults to DEFAULT_STOP.
  minLen?: number;                             // Minimum token length to keep; default is 1.
  keepHyphensAsUnderscore?: boolean;           // If true, turn '-' into '_' before splitting; helps keep identifiers.
};

/** Basic English stoplist (extend as needed) */
const DEFAULT_STOP = new Set(["i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
  "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", 
  "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", 
  "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", 
  "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", 
  "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", 
  "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", 
  "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", 
  "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"]);

export function normalizeText(input: string): string { // Public helper to normalize raw text before tokenizing.
  let s = input.toLowerCase().normalize("NFKD");       // 1) lowercase; 2) NFKD splits ligatures/compat chars.
  s = s.replace(/\p{M}+/gu, "");                       // Strip ALL Unicode combining marks (accents/diacritics).
  s = s.replace(/['’]/g, "");                          // Remove straight and curly apostrophes (don't → dont).
  return s;                                            // Return the normalized string for downstream use.
}

/** Tokenize English text; keeps underscores (and optional hyphens->underscores) */
export function tokenize(                            // Main API: turn input into a string[] of tokens.
  input: string,                                     // The raw text to tokenize.
  opts: NormalizeOptions = {}                        // Optional behavior controls with sensible defaults.
): string[] {
  const {                                            // Destructure options with defaults.
    dropStop = true,                                 // Default: drop stopwords.
    stop = DEFAULT_STOP,                             // Default stoplist if none provided.
    minLen = 1,                                      // Default minimum token length.
    keepHyphensAsUnderscore = false                  // Default: treat '-' as a splitter (not preserved).
  } = opts;

  let norm = normalizeText(input);                   // Normalize first (lowercase, NFKD, strip marks, drop apostrophes).
  if (keepHyphensAsUnderscore) norm = norm.replace(/-/g, "_"); // Optionally preserve hyphens by mapping to underscores.

  const raw = norm                                   // Split into word-like chunks:
    .split(/[^a-z0-9_]+/g)                           // Use any NON [a-z0-9_] as a delimiter; keeps underscores.
    .filter(Boolean);                                // Drop empty strings due to leading/trailing/multiple delimiters.

  const out: string[] = [];                          // Prepare the output token list.
  for (const t of raw) {                             // Scan each raw token and filter it.
    if (t.length < Math.max(0, minLen)) continue;    // Enforce minimum length (guard against negative by Math.max).
    if (dropStop && stop.has(t)) continue;           // Optionally remove stopwords using the configured set.
    out.push(t);                                     // Keep the token.
  }
  return out;                                        // Return filtered tokens suitable for indexing/searching.
}

/** Utility: extend the default English stoplist */
export function makeStoplist(extra: Iterable<string> = []): Set<string> { // Helper to create/extend a stoplist.
  const s = new Set(DEFAULT_STOP);                   // Start with the default stopwords.
  for (const w of extra) s.add(w.toLowerCase());     // Add extra words (lowercased for consistency).
  return s;                                          // Return the combined stop set.
}