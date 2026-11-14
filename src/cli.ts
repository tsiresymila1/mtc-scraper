#!/usr/bin/env node
// Entry point: urls -> browser -> parse -> JSON array (stdout + file).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { fetchRawPages } from "./browser.ts";
import { ENGINES, isEngine } from "./engines.ts";
import { isChallenge } from "./challenge.ts";
import { URLS } from "./lib.ts";
import { parseRace } from "./parse.ts";

const { positionals, values } = parseArgs({
  options: {
    file: { type: "string", short: "f" }, // text file, one url per line
    engine: { type: "string", short: "e", default: "clearcote" }, // see ENGINES
    "license-key": { type: "string" }, // cloak / clearcote; default: env var
    output: { type: "string", short: "o", default: "out/races.json" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});
if (values.help) {
  console.log("Usage: npm run scrape -- [url ...] [-f urls.txt] [-e cloak|clearcote|camoufox] [--license-key KEY] [-o out/races.json]");
  process.exit(0);
}

if (!isEngine(values.engine)) {
  console.error(`Unknown engine "${values.engine}". Use: ${Object.keys(ENGINES).join(", ")}`);
  process.exit(1);
}

const fromFile = values.file
  ? (await readFile(values.file, "utf8")).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  : [];
const urls = [...new Set([...positionals, ...fromFile])];
if (!urls.length) urls.push(...URLS); // no args: scrape the URLS list from lib.ts

const races = [];
const failures: string[] = [];
for (const result of await fetchRawPages(urls, values.engine, { licenseKey: values["license-key"] })) {
  try {
    if ("error" in result) throw new Error(result.error);
    if (isChallenge(result.raw.text)) throw new Error("bot challenge");
    races.push({ url: result.url, ...parseRace(result.raw) });
  } catch (error) {
    failures.push(`${result.url}: ${String(error)}`);
  }
}

const json = JSON.stringify(races, null, 2);
console.log(json);
await mkdir(dirname(values.output), { recursive: true });
await writeFile(values.output, `${json}\n`, "utf8");
console.error(`Saved ${races.length}/${urls.length} races to ${values.output}`);
for (const f of failures) console.error(`FAILED ${f}`);
process.exitCode = failures.length ? 1 : 0;
