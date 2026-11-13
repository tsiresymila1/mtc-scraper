// bun build.ts [target ...]   (default: all targets) -> dist/mtc-scraper-<target>
import type { BunPlugin } from "bun";

const TARGETS = ["bun-darwin-arm64", "bun-linux-x64", "bun-windows-x64"] as const;

// camoufox-js: look for data-files in the extracted cache (see src/bin.ts) instead of
// next to its code, and swap `impit` (native HTTP client, only used for public-IP lookup
// in geoip) for a shim over bun fetch, which supports proxies and works on every target.
const camoufoxPatch: BunPlugin = {
  name: "camoufox-patch",
  setup(build) {
    build.onResolve({ filter: /^impit$/ }, () => ({ path: "impit", namespace: "impit-stub" }));
    build.onLoad({ filter: /.*/, namespace: "impit-stub" }, () => ({
      contents: `export class Impit {
        constructor({ proxyUrl, timeout } = {}) { this.proxyUrl = proxyUrl; this.timeout = timeout ?? 5000; }
        fetch(url) { return fetch(url, { proxy: this.proxyUrl, signal: AbortSignal.timeout(this.timeout) }); }
      }`,
      loader: "js",
    }));
    build.onLoad({ filter: /camoufox-js\/dist\/.*\.js$/ }, async ({ path }) => {
      const code = (await Bun.file(path).text())
        .replaceAll(
          'path.join(currentDir, "..", "data-files"',
          'path.join(globalThis.__CAMOUFOX_ROOT ?? path.join(currentDir, ".."), "data-files"',
        )
        .replaceAll(
          'path.join(currentDir, "data-files"',
          'path.join(globalThis.__CAMOUFOX_ROOT ?? currentDir, "data-files"',
        );
      return { contents: code, loader: "js" };
    });
  },
};

const wanted = process.argv.slice(2);
const targets = wanted.length ? wanted : [...TARGETS];
let failed = false;
for (const target of targets) {
  const outfile = `dist/mtc-scraper-${target.replace("bun-", "")}`;
  const result = await Bun.build({
    entrypoints: ["src/bin.ts"],
    compile: { target: target as never, outfile },
    external: ["chromium-bidi/*"], // playwright BiDi, unused
    plugins: [camoufoxPatch],
  });
  console.log(result.success ? `ok   ${target} -> ${outfile}` : `FAIL ${target}`);
  for (const log of result.logs) console.log(String(log));
  failed ||= !result.success;
}
process.exitCode = failed ? 1 : 0;
