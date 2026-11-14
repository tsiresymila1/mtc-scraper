# MTC race scraper

Scrapes an MTC Jockey Club fixture page into JSON (race info + runners). Node 26+, TypeScript, CloakBrowser.

```
src/cli.ts        entry: url -> browser -> parse -> JSON
src/engines.ts    browser engines: clearcote (default), cloak, camoufox
src/browser.ts    loads pages with the chosen engine, extracts raw strings from the DOM
src/parse.ts      pure: raw strings -> typed Race JSON (unit-tested)
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
- camoufox-js reads data files next to its code: `src/bin.ts` embeds them and extracts them to `~/.cache/mtc-scraper/camoufox`; `build.ts` patches camoufox-js to read from there.
- `impit` (native HTTP client, only used by camoufox geoip to look up the public IP) is replaced at build time by a shim over bun `fetch` (proxy supported), so camoufox `geoip: true` works in the binary (verified on macOS arm64: timezone/locale follow the IP).

Browser binaries are downloaded on first run (camoufox: first launch, or `npx camoufox-js fetch`).

License key (cloak, clearcote): `--license-key KEY`, or env `CLOAKBROWSER_LICENSE_KEY` / `CLEARCOTE_LICENSE_KEY`, or `cloakbrowser login`.

## CI / release

`.github/workflows/ci.yml`: typecheck + tests on every push to main and on PRs. Pushing a `v*` tag also builds the 3 binaries and publishes a GitHub release with `.tar.gz` (macOS arm64, Linux x64), `.zip` (Windows x64) and `SHA256SUMS`.

```sh
npm run tag -- v0.1.0        # create the tag on HEAD and push it; re-running deletes and re-creates it
```
