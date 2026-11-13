// Entry point of the compiled single binary (bun only, see build.ts; excluded from tsc).
// camoufox-js reads data files from disk next to its code; they are embedded here
// and extracted to a cache dir, which the build plugin points camoufox-js at.
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
// @ts-ignore bun file imports
import pin from "../node_modules/camoufox-js/dist/data-files/browser-pin.json" with { type: "file" };
// @ts-ignore
import territory from "../node_modules/camoufox-js/dist/data-files/territoryInfo.xml" with { type: "file" };
// @ts-ignore
import webgl from "../node_modules/camoufox-js/dist/data-files/webgl_data.db" with { type: "file" };

const root = join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "mtc-scraper", "camoufox");
const dataDir = join(root, "data-files");
await mkdir(dataDir, { recursive: true });
for (const [name, embedded] of Object.entries({
  "browser-pin.json": pin,
  "territoryInfo.xml": territory,
  "webgl_data.db": webgl,
}) as [string, string][]) {
  const src = Bun.file(embedded);
  const dest = Bun.file(join(dataDir, name));
  if (!(await dest.exists()) || dest.size !== src.size) await Bun.write(dest, src);
}
(globalThis as any).__CAMOUFOX_ROOT = root;

await import("./cli.ts");
