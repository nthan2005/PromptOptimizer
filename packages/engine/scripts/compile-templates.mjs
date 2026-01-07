// packages/engine/scripts/compile-templates.mjs
// Build-time: YAML -> canonical JSON packs (+ manifest + synonyms)
//
// Usage:
//   PACK_SIZE=1000 CATEGORIES=marketing,code MINIFY_JSON=1 node scripts/compile-templates.mjs
//
// Requires dev deps in engine pkg: yaml fast-glob ajv

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import YAML from "yaml";
import Ajv from "ajv";
import { createHash } from "node:crypto";

const ID_RE = /^[a-z0-9-_.]+$/;

const slugifyId = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TPL_DIR = path.join(ROOT, "assets", "templates");
const OUT_DIR = path.join(ROOT, "generated");
const PACKS_DIR = path.join(OUT_DIR, "packs");
const SCHEMA_FILE = path.join(TPL_DIR, "templates.schema.json");
const SYNONYMS_YML = path.join(ROOT, "assets", "synonyms.yml");

const PACK_SIZE = Number.parseInt(process.env.PACK_SIZE || "1000", 10);
const FILTER_CATEGORIES = (process.env.CATEGORIES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MINIFY_JSON = process.env.MINIFY_JSON === "1" || process.env.MINIFY_JSON === "true";

const readYaml = async (file) => YAML.parse(await fs.readFile(file, "utf8"));
const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const writeJson = async (file, data) =>
  fs.writeFile(file, MINIFY_JSON ? JSON.stringify(data) : JSON.stringify(data, null, 2), "utf8");

const hashOf = (x) => createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex").slice(0, 16);

const normalizeSynonymsDict = (raw) => {
  const ok = /^[a-z0-9_]+$/;
  /** @type {Map<string, Set<string>>} */
  const map = new Map();
  const warnings = [];

  const add = (a, b) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
  };

  for (const [key, vals] of Object.entries(raw || {})) {
    const k = String(key || "").trim();
    if (!ok.test(k)) {
      warnings.push(`skip key "${k}" (invalid chars)`);
      continue;
    }
    const arr = Array.isArray(vals) ? vals : [vals];
    for (const vRaw of arr) {
      const v = String(vRaw || "").trim();
      if (!v || v === k) continue;
      if (!ok.test(v)) {
        warnings.push(`skip val "${k}" -> "${v}" (invalid chars)`);
        continue;
      }
      add(k, v);
      add(v, k); // enforce symmetry
    }
  }

  const out = {};
  for (const [k, set] of map) {
    out[k] = [...set].filter((v) => v !== k).sort();
  }
  return { dict: out, warnings };
};

// Normalize placeholders:
//   [TARGET LANGUAGE] -> {target_language}
//   {TARGETLANGUAGE}  -> {targetlanguage}
const normalizePlaceholders = (body) =>
  String(body ?? "")
    .replace(/\[([^\]]+)\]/g, (_m, raw) => `{${String(raw).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}}`)
    .replace(/\{([A-Z0-9_]+)\}/g, (_m, raw) => `{${String(raw).toLowerCase()}}`);

const extractPlaceholders = (body) => {
  const out = new Set();
  const re = /\{([a-z0-9_]+)\}/g;
  let m;
  while ((m = re.exec(body))) out.add(m[1]);
  return [...out];
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";

const coerceTemplate = (t) => {
  const body = normalizePlaceholders(String(t.body ?? ""));
  const sanitizeTitle = (raw) =>
    String(raw ?? "")
      // Drop trailing Topic: foo-<hash> noise often appended by scrapers.
      .replace(/\s*Topic:\s*[^-]+-[A-Za-z0-9]+$/i, "")
      .trim();
  const required =
    Array.isArray(t.required) && t.required.length
      ? t.required.map((x) => String(x).toLowerCase())
      : extractPlaceholders(body);

  // sanitize id: use provided id or title, then slugify to match schema
  const rawId = t.id ? String(t.id) : slugify(String(t.title ?? ""));
  const id = ID_RE.test(rawId) ? rawId : slugifyId(rawId);

  // optional: warn if we had to change it
  if (id !== rawId) {
    console.warn(`[compile-templates] normalized id "${rawId}" -> "${id}"`);
  }

  return {
    id,
    title: sanitizeTitle(t.title),
    tags: Array.isArray(t.tags) ? t.tags.map((x) => String(x).toLowerCase()) : [],
    body,
    family: t.family ? String(t.family) : undefined,
    enabled: t.enabled !== false,
    required,
    createdAt: Number.isFinite(t.createdAt) ? t.createdAt : 0,
    updatedAt: Number.isFinite(t.updatedAt) ? t.updatedAt : 0
  };
};


const ensureDirs = async () => {
  await fs.mkdir(PACKS_DIR, { recursive: true });
};

const loadSchema = async () => readJson(SCHEMA_FILE);

const shouldIncludeCategory = (cat) =>
  FILTER_CATEGORIES.length === 0 || FILTER_CATEGORIES.includes(cat);

// MAIN
(async function build() {
  await ensureDirs();

  const schema = await loadSchema();
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

  // We validate each file as an array per your schema ("type":"array").
  const validateArray = ajv.compile(schema);

  // Find all YAML files under templates/** (skip schema & synonyms)
  const files = await fg(["**/*.y?(a)ml", "!templates.schema.json", "!synonyms.yml"], {
    cwd: TPL_DIR,
    absolute: true
  });

  // Group result rows by top-level category (first path segment)
  /** @type {Map<string, any[]>} */
  const groups = new Map();

  for (const abs of files) {
    const rel = path.relative(TPL_DIR, abs);
    const category = rel.split(path.sep)[0]; // e.g., "web-development"
    if (!shouldIncludeCategory(category)) continue;

    const raw = await readYaml(abs);
    const arr = Array.isArray(raw) ? raw : [raw];

    // Coerce first so body is guaranteed a string etc.
    const coerced = arr.map(coerceTemplate);

    // Validate (schema expects array)
    if (!validateArray(coerced)) {
      console.error(`Schema validation failed for ${rel}`);
      console.error(validateArray.errors);
      process.exit(1);
    }

    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(...coerced);
  }

  // Optional synonyms
  try {
    const syn = await readYaml(SYNONYMS_YML);
    const { dict, warnings } = normalizeSynonymsDict(syn || {});
    if (warnings.length) {
      console.warn(
        `[compile-templates] synonyms warnings (${warnings.length}):\n- ${warnings
          .slice(0, 10)
          .join("\n- ")}${warnings.length > 10 ? "\n...more" : ""}`
      );
    }
    await writeJson(path.join(OUT_DIR, "synonyms.json"), dict);
  } catch {
    await writeJson(path.join(OUT_DIR, "synonyms.json"), {});
  }

  // De-dupe by id per category, sort stably, shard to packs
  const manifest = [];
  const globalIdSig = [];

  for (const [category, arr] of groups) {
    const byId = new Map(arr.map((t) => [t.id, t])); // last win
    const uniq = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

    // record id+updatedAt for manifest hash
    for (const t of uniq) globalIdSig.push(`${category}:${t.id}:${t.updatedAt}`);

    const packs = [];
    for (let i = 0; i < uniq.length; i += PACK_SIZE) {
      const chunk = uniq.slice(i, i + PACK_SIZE);
      const basename = `${category}-${packs.length}.json`;
      const file = path.join(PACKS_DIR, basename);
      await writeJson(file, chunk);

      // small per-pack hash (useful for cache-busting if you host remotely)
      const packHash = hashOf(chunk.map((t) => [t.id, t.updatedAt]));
      packs.push({ file: `packs/${basename}`, count: chunk.length, hash: packHash });
    }

    manifest.push({ category, total: uniq.length, packs });
  }

  // Global manifest hash (stable signature)
  const manifestHash = hashOf(globalIdSig.sort().join("|"));
  const outManifest = {
    generatedAt: Date.now(),
    hash: manifestHash,
    packSize: PACK_SIZE,
    categories: manifest
  };

  await writeJson(path.join(OUT_DIR, "manifest.json"), outManifest);

  // Log summary
  const total = manifest.reduce((a, c) => a + c.total, 0);
  const cats = manifest.map((c) => `${c.category}(${c.total})`).join(", ");
  console.log(
    `✅ Built ${total} templates into ${manifest.reduce((a,c)=>a+c.packs.length,0)} packs ` +
      `across ${manifest.length} categories: ${cats}`
  );
  console.log(`   Output: ${path.relative(process.cwd(), OUT_DIR)}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
