# MTC race scraper

Scrapes an MTC Jockey Club fixture page into JSON (race info + runners). Node 26+, TypeScript, CloakBrowser.

```
src/cli.ts        entry: url -> browser -> parse -> JSON
src/engines.ts    browser engines: clearcote (default), cloak, camoufox
src/browser.ts    loads pages with the chosen engine, extracts raw strings from the DOM
src/parse.ts      pure: raw strings -> typed Race (unit-tested)
src/format.ts     pure: scraped races -> output JSON (fileDT / sports / programs.Horse Racing.Mauritius[].races[].runners[])
src/challenge.ts  Cloudflare challenge detection
src/moli.ts       alternative: Markdown export through the Moli CLI
test/             node:test unit tests
out/              generated output (gitignored)
```

```sh
npm install
npm run scrape -- [url ...] [-f urls.txt] [-e cloak|clearcote|camoufox] [-o out/races.json]   # urls.txt: one url per line, "#" comments
npm test
npm run typecheck
```

Engines (`-e clearcote|cloak|camoufox`, default `clearcote`):
- `cloak`: CloakBrowser, needs a license key.
- `clearcote`: open build needs no key; downloads its binary (+ ~52 MB geoip db) on first run.
- `camoufox`: Firefox-based; run `npx camoufox-js fetch` once. `playwright-core` is pinned to 1.62.x (camoufox-js peer range).

Output (`out/races.json`): one "program" object, shape of `test/fixtures/expected-program.json`, built by `src/format.ts` (races sorted by their `/R<n>` URL suffix, `fileDT` in Mauritius time). Choices the sample does not settle: scratched runners stay in the list with `runnerStatus: "SCRATCHED"` (the sample only has `OPEN`), `odds.Place` is always `9999`, `odds.Win` is the scraped price or `9999`, `progCode`/`runnerOwner` are constants. Nothing is written when no race could be scraped.

Pages are waited on until `tr.runner_row` appears (up to 30 s), so a Cloudflare challenge can resolve itself.

## Single binary (bun)

```sh
npm run build                       # all targets -> dist/
bun build.ts bun-linux-x64          # or one target
./dist/mtc-scraper-darwin-arm64 -e camoufox [url ...]
```

Targets: `darwin-arm64`, `linux-x64`, `windows-x64.exe` (~100-120 MB each, no Node needed). Entry point: `src/bin.ts`; build script: `build.ts`.

All three engines work in the binary (verified on macOS arm64 with clearcote and camoufox; cloak only up to license validation, no key available; linux/windows binaries built but not run). How:
- `chromium-bidi/*` is marked external (playwright BiDi, unused).
- Several dependencies read data files next to their own code, a path that only exists on the build machine: camoufox-js, header-generator and fingerprint-generator (embedded by `src/bin.ts`, extracted to `~/.cache/mtc-scraper/data`, paths patched by `build.ts`) and playwright-core (its `package.json` / `browsers.json` are inlined). Check after any dependency change: build, hide `node_modules`, run the binary from another folder (CI does this for the Linux binary).
- `impit` (native HTTP client, only used by camoufox geoip to look up the public IP) is replaced at build time by a shim over bun `fetch` (proxy supported), so camoufox `geoip: true` works in the binary (verified on macOS arm64: timezone/locale follow the IP).

Browser binaries are downloaded on first run (camoufox: first launch, or `npx camoufox-js fetch`).

License key (cloak, clearcote): `--license-key KEY`, or env `CLOAKBROWSER_LICENSE_KEY` / `CLEARCOTE_LICENSE_KEY`, or `cloakbrowser login`.

## CI / release

`.github/workflows/ci.yml`: typecheck + tests on every push to main and on PRs. Pushing a `v*` tag also builds the 3 binaries and publishes a GitHub release with `.tar.gz` (macOS arm64, Linux x64), `.zip` (Windows x64) and `SHA256SUMS`.

```sh
npm run tag -- v0.1.0        # create the tag on HEAD and push it; re-running deletes and re-creates it
```
