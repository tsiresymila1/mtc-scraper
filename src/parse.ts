// Pure parsing: RawPage (strings scraped from the DOM) -> Race (typed JSON).
// No browser here, so it is unit-testable.

export type RawRunnerRow = {
  tab: string; // tr[data-tab-no]
  name: string; // tr[data-name]
  url: string | null; // horse profile link
  scratched: boolean; // row lacks the "notStrikeout" class
  odds: string | null; // td.odds[data-sort-value]
  // innerText of each <td>: silk, tab, horse, trainer/jockey, equip, hwt, bp, weight, rating, odds
  cells: string[];
};

export type RawPage = {
  text: string; // body innerText (race header info)
  runnerRows: RawRunnerRow[];
  timeRows: string[][]; // "Time Factors" table body rows: tab, horse, fastest, days, best
};

export type Runner = {
  tab: number;
  horse: string;
  horseUrl: string | null;
  scratched: boolean;
  trainer: string | null;
  stable: string | null;
  jockey: string | null;
  equip: string | null;
  hwt: number | null;
  hwtChange: number | null;
  bp: number | null;
  weight: number | null;
  rating: number | null;
  odds: number | null;
  fastestTime: string | null;
  daysSinceFastest: string | null;
  bestTimeLast3: string | null;
};

export type Race = {
  name: string | null;
  date: string | null;
  rails: string | null;
  distanceM: number | null;
  raceClass: string | null;
  startTime: string | null;
  stakeMoney: number | null;
  prizeMoney: number[];
  runners: Runner[];
};

const num = (s: string | null | undefined) => {
  const n = Number.parseFloat(s ?? "");
  return Number.isNaN(n) ? null : n;
};
const dash = (s: string | undefined) => {
  const v = s?.trim();
  return !v || v === "-" ? null : v;
};
const lines = (s = "") => s.split("\n").map((l) => l.trim()).filter(Boolean);

export function parseRace(page: RawPage): Race {
  const { text } = page;
  const info = text.match(
    /\nRACE\n(.+)\nDISTANCE\n(\d+)m\nRACE CLASS\n(.+)\nSTART TIME\n(.+)/,
  );
  const prizes = text.match(/PRIZE MONEY \(MUR\):((?:\s*\|?\s*\d+)+)/);
  const times = new Map(page.timeRows.map((r) => [Number(r[0]), r] as const));

  const runners = page.runnerRows.map((row): Runner => {
    const c = row.cells;
    const tab = Number(row.tab);
    // trainer/jockey cell: "TRAINER\nJOCKEY", optionally "TRAINER\n(\nSTABLE\n)\nJOCKEY"
    const tj = lines(c[3]);
    const stable = c[3]?.match(/\(([\s\S]*?)\)/);
    const hwt = c[5]?.match(/(\d+)\s*\(([+-]?\d+)\)/);
    const t = times.get(tab);
    return {
      tab,
      horse: row.name,
      horseUrl: row.url,
      scratched: row.scratched,
      trainer: tj[0] ?? null,
      stable: stable ? lines(stable[1]).join(" ") : null,
      jockey: tj.length > 1 ? tj[tj.length - 1] : null,
      equip: lines(c[4])[0] ?? null, // first line only: the rest is tooltip text
      hwt: hwt ? Number(hwt[1]) : num(lines(c[5])[0]),
      hwtChange: hwt ? Number(hwt[2]) : null,
      bp: num(c[6]),
      weight: num(c[7]),
      rating: num(c[8]),
      odds: num(row.odds),
      fastestTime: dash(t?.[2]),
      daysSinceFastest: dash(t?.[3]),
      bestTimeLast3: dash(t?.[4]),
    };
  });
  if (!runners.length) throw new Error("No runner rows found");

  return {
    name: info?.[1].trim() ?? null,
    date: text.match(/^[A-Z]+ \d{1,2} [A-Z]+ \d{4}$/m)?.[0] ?? null,
    rails: text.match(/^Rails: (.+)$/m)?.[1].trim() ?? null,
    distanceM: info ? Number(info[2]) : null,
    raceClass: info?.[3].trim() ?? null,
    startTime: info?.[4].trim() ?? null,
    stakeMoney: num(text.match(/STAKE MONEY: Rs (\d+)/)?.[1]),
    prizeMoney: (prizes?.[1].match(/\d+/g) ?? []).map(Number),
    runners,
  };
}
