import assert from "node:assert/strict";
import test from "node:test";
import { fixtureUrls } from "../src/lib.ts";

test("builds R1..Rn urls for a fixture", () => {
  assert.deepEqual(fixtureUrls(412, 2), [
    "https://www.mtcjockeyclub.com/form-guide/fixtures/412/R1",
    "https://www.mtcjockeyclub.com/form-guide/fixtures/412/R2",
  ]);
});

test("defaults to fixture 399 with 6 races", () => {
  const urls = fixtureUrls();
  assert.equal(urls.length, 6);
  assert.match(urls[0], /\/fixtures\/399\/R1$/);
});
