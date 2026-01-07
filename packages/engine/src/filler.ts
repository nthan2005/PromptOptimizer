import type { TemplateDoc } from "./types";
import { normalizeText } from "./normalizer";

type FillContext = Record<string, any>;

function guessDefault(key: string, draft: string, ctx: FillContext): string {
  const lower = key.toLowerCase();

  if (lower.includes("language")) return "English";
  if (lower.includes("tone")) return "professional and clear";
  if (lower.includes("audience")) return "a general audience";
  if (lower.includes("domain")) {
    const url = typeof ctx.url === "string" ? ctx.url : "";
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "") || "your domain";
    } catch {
      return "your domain";
    }
  }
  if (lower.includes("error")) return "Describe the error here";
  if (lower.includes("code")) return "Add code snippet here";
  if (lower.includes("max_words") || lower.includes("words")) return "150";
  if (lower.includes("title")) return "Draft title";
  if (lower.includes("topic") || lower.includes("subject")) return "your topic";

  const draftSnippet = draft.slice(0, 240) || "your content";
  return draftSnippet;
}

export function fillTemplate(
  template: TemplateDoc,
  draft: string,
  ctx: FillContext = {}
): { filled: string; missing: string[] } {
  const placeholders = new Set<string>();
  const body = template.body;
  const re = /\{([a-z0-9_]+)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) placeholders.add(normalizeText(m[1]));

  const missing: string[] = [];
  const filled = body.replace(re, (_match, raw) => {
    const key = normalizeText(raw);
    const val =
      ctx[key] ??
      ctx[raw] ??
      ctx[key.replace(/-/g, "_")] ??
      (key.includes("draft") || key.includes("prompt") || key.includes("text")
        ? draft
        : undefined) ??
      guessDefault(key, draft, ctx);
    if (val === undefined || val === null || val === "") {
      missing.push(key);
      return `{${key}}`;
    }
    return String(val);
  });

  return { filled, missing };
}
