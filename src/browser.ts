// Browser layer: load pages with the chosen engine, pull raw strings out of the DOM.
import { setTimeout as sleep } from "node:timers/promises";
import type { Page } from "playwright-core";
import { ENGINES, type Engine, type EngineOptions } from "./engines.ts";
import type { RawPage } from "./parse.ts";

const DELAY_MS = 3_000; // pause between pages

export type PageResult =
  { url: string; raw: RawPage } | { url: string; error: string };

// One browser for all urls, sequential; a failing url does not stop the others.
export async function fetchRawPages(
  urls: string[],
  engine: Engine,
  options: EngineOptions = {},
): Promise<PageResult[]> {
  const browser = await ENGINES[engine](options);
  try {
    const page = await browser.newPage();
    const results: PageResult[] = [];
    for (const [i, url] of urls.entries()) {
      if (i > 0) await sleep(DELAY_MS);
      try {
        console.log(`Fetching ${url} ...`);
        await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
        // a Cloudflare challenge may resolve by itself: wait for the real content
        try {
          await page.waitForSelector("tr.runner_row", { timeout: 30_000 });
        } catch {
          throw new Error(
            `no runner rows (blocked? page title: "${await page.title()}")`,
          );
        }
        console.log(`Fetched ${url} !!`);
        results.push({ url, raw: await extract(page) });
      } catch (error) {
        console.log(`ERROR Fetching ${url}: ${error}`);
        results.push({ url, error: String(error) });
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}

// runs in the browser: keep the callback self-contained
function extract(page: Page): Promise<RawPage> {
  return page.evaluate((): RawPage => {
    const text = (el: Element | null | undefined) =>
      (el as HTMLElement | null | undefined)?.innerText ?? "";
    const runnerRows = [
      ...Array.from(document.querySelectorAll<HTMLElement>("tr.runner_row")),
    ].map((tr) => ({
      tab: tr.dataset.tabNo ?? "",
      name: tr.dataset.name ?? "",
      url: tr.querySelector<HTMLAnchorElement>("td.horse-td a")?.href ?? null,
      scratched: !tr.classList.contains("notStrikeout"),
      odds: tr.querySelector<HTMLElement>("td.odds")?.dataset.sortValue ?? null,
      cells: [...Array.from(tr.querySelectorAll(":scope > td"))].map((td) =>
        text(td),
      ),
    }));
    const timeTable = [...Array.from(document.querySelectorAll("table"))].find(
      (t) => /fastest time/i.test(text(t.rows[0])),
    );
    const timeRows = [...Array.from(timeTable?.rows ?? [])]
      .slice(1)
      .map((r) => [...Array.from(r.cells)].map((c) => text(c).trim()));
    return { text: document.body.innerText, runnerRows, timeRows };
  });
}
