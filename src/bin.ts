// Entry point of the compiled single binary (bun only, see build.ts; excluded from tsc).
// Some dependencies read data files from disk relative to their own location, which does not
// exist where the binary runs. They are embedded here and extracted to a cache dir; build.ts
// patches those packages to read from there (globalThis.__MTC_DATA).
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
/* eslint-disable */
// @ts-ignore bun file imports
import cfxPin from "../node_modules/camoufox-js/dist/data-files/browser-pin.json" with { type: "file" };
// @ts-ignore
import cfxTerritory from "../node_modules/camoufox-js/dist/data-files/territoryInfo.xml" with { type: "file" };
// @ts-ignore
import cfxWebgl from "../node_modules/camoufox-js/dist/data-files/webgl_data.db" with { type: "file" };
// @ts-ignore
import hgOrder from "../node_modules/header-generator/data_files/headers-order.json" with { type: "file" };
// @ts-ignore
import hgBrowsers from "../node_modules/header-generator/data_files/browser-helper-file.json" with { type: "file" };
// @ts-ignore
import hgInput from "../node_modules/header-generator/data_files/input-network-definition.zip" with { type: "file" };
// @ts-ignore
import hgHeader from "../node_modules/header-generator/data_files/header-network-definition.zip" with { type: "file" };
// @ts-ignore
import fgNet from "../node_modules/fingerprint-generator/data_files/fingerprint-network-definition.zip" with { type: "file" };

const root = join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "mtc-scraper", "data");
const files: Record<string, string> = {
  "camoufox/data-files/browser-pin.json": cfxPin,
  "camoufox/data-files/territoryInfo.xml": cfxTerritory,
  "camoufox/data-files/webgl_data.db": cfxWebgl,
  "header-generator/data_files/headers-order.json": hgOrder,
  "header-generator/data_files/browser-helper-file.json": hgBrowsers,
  "header-generator/data_files/input-network-definition.zip": hgInput,
  "header-generator/data_files/header-network-definition.zip": hgHeader,
  "fingerprint-generator/data_files/fingerprint-network-definition.zip": fgNet,
};
for (const [rel, embedded] of Object.entries(files)) {
  const src = Bun.file(embedded);
  const dest = Bun.file(join(root, rel));
  await mkdir(dirname(dest.name!), { recursive: true });
  if (!(await dest.exists()) || dest.size !== src.size) await Bun.write(dest, src);
}
(globalThis as any).__MTC_DATA = root;

await import("./cli.ts");
