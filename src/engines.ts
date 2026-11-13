// Browser engines: each returns a Playwright Browser. Imports are lazy so a
// missing license key / binary for one engine never breaks the others.
import type { Browser } from "playwright-core";

export type EngineOptions = { licenseKey?: string }; // else CLOAKBROWSER_LICENSE_KEY / CLEARCOTE_LICENSE_KEY env

export const ENGINES = {
  cloak: async ({ licenseKey }: EngineOptions = {}) => {
    const { launch } = await import("cloakbrowser");
    return launch({ headless: true, geoip: true, humanize: true, humanPreset: "careful", licenseKey });
  },
  // open build needs no key; first launch downloads the binary
  clearcote: async ({ licenseKey }: EngineOptions = {}) => {
    const { launch } = await import("clearcote");
    return launch({ headless: true, humanize: true  });
  },
  // Firefox-based; binary via `npx camoufox-js fetch`
  camoufox: async (_: EngineOptions = {}) => {
    const { Camoufox } = await import("camoufox-js");
    return Camoufox({ headless: true, humanize: true, geoip: true });
  },
} satisfies Record<string, (o?: EngineOptions) => Promise<Browser>>;

export type Engine = keyof typeof ENGINES;
export const isEngine = (s: string): s is Engine => s in ENGINES;
