import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { toProgram } from "../src/format.ts";

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

// scraped-races.json: real scraper output (older format). expected-program.json: the target format,
// captured earlier the same day from another source. The two snapshots differ in DATA, not in format:
// 2 race titles are spelled differently, 2 runners were scratched in between, 1 trainer differs.
test("converts scraped races to the target program format", () => {
  const expected = read("expected-program.json");
  const races = expected.programs["Horse Racing"].Mauritius[0].races;
  const runner = (race: number, name: string) => races[race - 1].runners.find((r: any) => r.runnerName === name);
  races[1].raceTitle = "The Canarapen Family Trophy";
  races[4].raceTitle = "The Kisnah Ramalingum Memorial Cup";
  runner(2, "STEPPING OUT").runnerStable = "A SEWDYAL";
  runner(2, "STEPPING OUT").runnerStatus = "SCRATCHED";
  runner(6, "GRANDE ROSALIE").runnerStatus = "SCRATCHED";

  const actual = toProgram(read("scraped-races.json"), new Date("2026-11-14T08:30:00Z"));
  assert.deepEqual(actual, expected);
});

test("key order matches the target file", () => {
  const keys = (o: object) => Object.keys(o);
  const expected = read("expected-program.json");
  const actual = toProgram(read("scraped-races.json"));
  const p = (x: any) => x.programs["Horse Racing"].Mauritius[0];
  assert.deepEqual(keys(actual), keys(expected));
  assert.deepEqual(keys(p(actual)), keys(p(expected)));
  assert.deepEqual(keys(p(actual).races[0]), keys(p(expected).races[0]));
  assert.deepEqual(keys(p(actual).races[0].runners[0]), keys(p(expected).races[0].runners[0]));
});

test("rejects empty input", () => {
  assert.throws(() => toProgram([]));
});
