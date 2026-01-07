// packages/engine/scripts/synonyms.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YAML from "yaml";

const SRC = resolve("packages/engine/assets/synonyms.yml");
const DEST = resolve("packages/engine/generated/synonyms.json");

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

const main = async () => {
  const yamlText = await readFile(SRC, "utf8");
  const data = YAML.parse(yamlText) ?? {};
  const { dict, warnings } = normalizeSynonymsDict(data);
  if (warnings.length) {
    console.warn(
      `[synonyms] warnings (${warnings.length}):\n- ${warnings.slice(0, 10).join("\n- ")}${
        warnings.length > 10 ? "\n...more" : ""
      }`
    );
  }
  await mkdir(dirname(DEST), { recursive: true });
  await writeFile(DEST, JSON.stringify(dict, null, 2), "utf8");
  console.log(`Wrote ${DEST}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
