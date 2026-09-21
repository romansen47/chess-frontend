import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const translationsRoot = path.join(srcRoot, "i18n", "translations");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(fullPath));
    } else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseDictionary(source) {
  const result = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*"([^"]+)":\s*("(?:\\.|[^"])*")/.exec(line);
    if (!match) continue;
    result.set(match[1], JSON.parse(match[2]));
  }
  return result;
}

function quotedKeyPattern(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("[\"'`]" + escaped + "[\"'`]");
}

const dictionaries = {};
for (const language of ["en", "de", "fr"]) {
  const source = await readFile(path.join(translationsRoot, language + ".ts"), "utf8");
  dictionaries[language] = parseDictionary(source);
}

const keys = [...dictionaries.en.keys()];
const files = (await sourceFiles(srcRoot)).filter(
  (file) => !file.startsWith(translationsRoot + path.sep),
);
const sources = await Promise.all(files.map(async (file) => ({
  file,
  content: await readFile(file, "utf8"),
})));

const unused = [];
for (const key of keys) {
  const keyPattern = quotedKeyPattern(key);
  const values = ["en", "de", "fr"]
    .map((language) => dictionaries[language].get(key))
    .filter((value) => typeof value === "string" && value.length >= 4);

  const used = sources.some(({ content }) =>
    keyPattern.test(content) || values.some((value) => content.includes(value)),
  );
  if (!used) unused.push(key);
}

console.log("i18n audit: " + keys.length + " keys, " + unused.length + " suspected unused");
for (const key of unused) console.log("  " + key);\nif (unused.length > 0) process.exitCode = 1;
