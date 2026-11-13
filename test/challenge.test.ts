import assert from "node:assert/strict";
import test from "node:test";
import { isChallenge } from "../src/challenge.ts";

test("detects Cloudflare verification text", () => {
  assert.equal(isChallenge("Performing security verification"), true);
});

test("detects a Cloudflare challenge widget", () => {
  assert.equal(isChallenge("Widget containing a Cloudflare security challenge"), true);
});

test("accepts fixture content", () => {
  assert.equal(isChallenge("Race 1\nHorse | Jockey"), false);
});
