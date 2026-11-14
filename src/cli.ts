#!/usr/bin/env node
// Entry point: urls -> browser -> parse -> JSON array (stdout + file).
// No argument + a terminal: asks each parameter (Enter = default). Any argument: no questions.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { fetchRawPages } from "./browser.ts";
import { ENGINES, isEngine } from "./engines.ts";
import { isChallenge } from "./challenge.ts";
import { DEFAULT_PROGRAM, toProgram, type ScrapedRace } from "./format.ts";
import { DEFAULT_FIXTURE, DEFAULT_RACES, fixtureUrls } from "./lib.ts";
import { parseRace } from "./parse.ts";

const { positionals, values } = parseArgs({
  options: {
    file: { type: "string", short: "f" }, // text file, one url per line
    fixture: { type: "string", short: "n", default: String(DEFAULT_FIXTURE) }, // fixture id in the url (399)
    races: { type: "string", default: String(DEFAULT_RACES) }, // R1..R<races>
    engine: { type: "string", short: "e", default: "clearcote" }, // see ENGINES
    "license-key": { type: "string" }, // cloak; default: env var
    "prog-code": { type: "string", default: DEFAULT_PROGRAM.code }, // output progCode
    "prog-name": { type: "string", default: DEFAULT_PROGRAM.name }, // output progName / progShortName
    "prog-long-name": { type: "string", default: DEFAULT_PROGRAM.longName }, // output progLongName
    output: { type: "string", short: "o", default: "out/races.json" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});
if (values.help) {
  console.log(
    "Usage: npm run scrape -- [url ...] [-f urls.txt] [-n fixture] [--races 6] [-e cloak|clearcote|camoufox] [--license-key KEY]\n" +
      "         [--prog-code CDM10] [--prog-name CDM] [--prog-long-name \"Champ De Mars\"] [-o out/races.json]\n" +
      "No argument in a terminal: interactive questions with defaults.",
  );
  process.exit(0);
}

const isPositiveInt = (v: string) => /^[1-9]\d*$/.test(v);
const opts = { ...values };

// no argument at all + a terminal: ask the parameters, Enter keeps the default
if (!process.argv.slice(2).length && process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label: string, def: string, valid: (v: string) => boolean = () => true) => {
    for (;;) {
      const answer = (await rl.question(`${label} [${def}]: `)).trim() || def;
      if (valid(answer)) return answer;
      console.log("  invalid value, try again");
    }
  };
  opts.engine = await ask(`Engine (${Object.keys(ENGINES).join("/")})`, opts.engine, isEngine);
  if (opts.engine === "cloak") {
    const key = (await rl.question("Cloak license key [env CLOAKBROWSER_LICENSE_KEY]: ")).trim();
    if (key) opts["license-key"] = key;
  }
  opts.fixture = await ask("Fixture number", opts.fixture, isPositiveInt);
  opts.races = await ask("Number of races (R1..Rn)", opts.races, isPositiveInt);
  opts["prog-code"] = await ask("Program code (progCode)", opts["prog-code"]);
  opts["prog-name"] = await ask("Program name (progName)", opts["prog-name"]);
  opts["prog-long-name"] = await ask("Program long name (progLongName)", opts["prog-long-name"]);
  rl.close();
}

const positiveInt = (name: string, v: string) => {
  if (!isPositiveInt(v)) {
    console.error(`--${name} must be a positive integer, got "${v}"`);
    process.exit(1);
  }
  return Number(v);
};
const fixture = positiveInt("fixture", opts.fixture);
const raceCount = positiveInt("races", opts.races);

if (!isEngine(opts.engine)) {
  console.error(`Unknown engine "${opts.engine}". Use: ${Object.keys(ENGINES).join(", ")}`);
  process.exit(1);
}

const fromFile = opts.file
  ? (await readFile(opts.file, "utf8")).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  : [];
const urls = [...new Set([...positionals, ...fromFile])];
if (!urls.length) urls.push(...fixtureUrls(fixture, raceCount)); // no url given: all races of the fixture

const races: ScrapedRace[] = [];
const failures: string[] = [];
for (const result of await fetchRawPages(urls, opts.engine, { licenseKey: opts["license-key"] })) {
  try {
    if ("error" in result) throw new Error(result.error);
    if (isChallenge(result.raw.text)) throw new Error("bot challenge");
    races.push({ url: result.url, ...parseRace(result.raw) });
  } catch (error) {
    failures.push(`${result.url}: ${String(error)}`);
  }
}

for (const f of failures) console.error(`FAILED ${f}`);
if (!races.length) {
  console.error("No race scraped, nothing written.");
  process.exit(1);
}

const program = { code: opts["prog-code"], name: opts["prog-name"], longName: opts["prog-long-name"] };
const json = JSON.stringify(toProgram(races, new Date(), program), null, 2);
console.log(json);
await mkdir(dirname(opts.output), { recursive: true });
await writeFile(opts.output, `${json}\n`, "utf8");
console.error(`Saved ${races.length}/${urls.length} races to ${opts.output}`);
process.exitCode = failures.length ? 1 : 0;
