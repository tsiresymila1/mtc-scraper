// Output format: scraped races -> the "program" JSON expected downstream
// (fileDT / sports / programs["Horse Racing"].Mauritius[]).
import type { Race, Runner } from "./parse.ts";

export type ScrapedRace = Race & { url: string };

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const NO_ODDS = 9999; // placeholder used by the format when there is no price

// The meeting's identity in the output; defaults are Champ de Mars, overridable from the CLI.
export type ProgramInfo = { code: string; name: string; longName: string };
export const DEFAULT_PROGRAM: ProgramInfo = { code: "CDM10", name: "CDM", longName: "Champ De Mars" };

// "SATURDAY 14 NOVEMBER 2026" -> { y: "2026", m: "11", d: "14" }
function parseDate(date: string | null) {
  const m = date?.match(/(\d{1,2}) ([A-Z]+) (\d{4})/);
  const month = m ? MONTHS.indexOf(m[2]) + 1 : 0;
  if (!m || !month) throw new Error(`Unreadable race date: ${date}`);
  return { y: m[3], m: String(month).padStart(2, "0"), d: m[1].padStart(2, "0") };
}

// "YYYY-MM-DD HH:mm" in Mauritius time (UTC+4, the track's clock)
function fileDT(now: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Indian/Mauritius",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function toRunner(r: Runner) {
  return {
    runnerIdx: String(r.tab),
    runnerName: r.horse.replaceAll("'", ""),
    runnerLane: r.bp == null ? "" : String(r.bp),
    // jockey allowance "(-4kg)" is not part of the name
    runnerJockey: (r.jockey ?? "").replace(/\s*\([+-]?\d+(?:\.\d+)?\s*kg\)/i, ""),
    runnerStable: r.trainer ?? "", // the format puts the trainer here
    runnerOwner: "",
    runnerStatus: r.scratched ? "SCRATCHED" : "OPEN",
    odds: { Win: r.odds ?? NO_ODDS, Place: NO_ODDS },
  };
}

export function toProgram(scraped: ScrapedRace[], now = new Date(), program = DEFAULT_PROGRAM) {
  if (!scraped.length) throw new Error("No race to format");
  const date = parseDate(scraped[0].date);
  const races = scraped
    .map((r, i) => ({ r, num: Number(r.url.match(/\/R(\d+)\/?$/)?.[1] ?? i + 1) }))
    .sort((a, b) => a.num - b.num)
    .map(({ r, num }) => {
      const d = parseDate(r.date);
      const time = r.startTime ?? "";
      return {
        raceNum: String(num),
        raceTitle: r.name ?? "",
        raceDistance: String(r.distanceM ?? ""),
        raceDate: `${d.y}${d.m}${d.d}`,
        raceTime: time.replace(":", ""),
        raceDT: `${d.y}-${d.m}-${d.d} ${time}`,
        raceStatus: "OPEN",
        raceNumOfRunners: r.runners.length,
        runners: r.runners.map(toRunner),
      };
    });

  return {
    fileDT: fileDT(now),
    sports: ["Horse Racing"],
    programs: {
      "Horse Racing": {
        Mauritius: [
          {
            progCmty: "MTCJC",
            progCode: program.code,
            progNum: 1,
            progName: program.name,
            progShortName: program.name,
            progLongName: program.longName,
            progDate: `${date.d}/${date.m}`,
            progCountryCode: "MU",
            progCountryName: "MU",
            progNumRaces: races.length,
            progCurrentRace: 0,
            progMinToPost: 0,
            progSportType: "Horse Racing",
            progCurrency: "MU",
            progForex: 1,
            progMinBetLocal: 5,
            progMinBetForeign: 5,
            progStatus: "O",
            races,
          },
        ],
      },
    },
  };
}
