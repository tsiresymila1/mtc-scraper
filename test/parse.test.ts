import assert from "node:assert/strict";
import test from "node:test";
import { parseRace, type RawPage } from "../src/parse.ts";

const text = `Race
The Foo Kune Family Trophy
SATURDAY 14 NOVEMBER 2026
RACE CARD
Rails: 3.25 (Pent: 2.8 normal, at time of declarations.)

RACE
The Foo Kune Family Trophy
DISTANCE
1450m
RACE CLASS
0-20
START TIME
13:05

STAKE MONEY: Rs 178000
PRIZE MONEY (MUR):
 104000
| 40000
| 22250
| 11750
\tTab No\tHorse`;

const page: RawPage = {
  text,
  runnerRows: [
    {
      tab: "1",
      name: "SAN ANDREAS",
      url: "https://www.mtcjockeyclub.com/horse/san-andreas/1",
      scratched: false,
      odds: "48.7",
      cells: ["", "1", "SAN ANDREAS", "C HEWITSON\n(\nPAUL FOO KUNE STABLE\n)\nM NUNES", "NXTA",
        "433 (+1)\nLast Run HWT: 432\nCurrent HWT: 433", "3", "62.0", "22", "487"],
    },
    {
      tab: "2",
      name: "RIVER HAWK",
      url: null,
      scratched: true,
      odds: null,
      cells: ["", "2", "RIVER HAWK", "GUJADHUR\nB SOOFUL", "", "470 (-11)", "2", "61.5", "21", ""],
    },
  ],
  timeRows: [
    ["1", "SAN ANDREAS", "1:28.11", "35 d", "1:28.11"],
    ["2", "RIVER HAWK", "-", "NEW", "-"],
  ],
};

test("parses race header", () => {
  const race = parseRace(page);
  assert.equal(race.name, "The Foo Kune Family Trophy");
  assert.equal(race.date, "SATURDAY 14 NOVEMBER 2026");
  assert.equal(race.distanceM, 1450);
  assert.equal(race.startTime, "13:05");
  assert.equal(race.stakeMoney, 178000);
  assert.deepEqual(race.prizeMoney, [104000, 40000, 22250, 11750]);
});

test("parses runners", () => {
  const [a, b] = parseRace(page).runners;
  assert.deepEqual(a, {
    tab: 1, horse: "SAN ANDREAS", horseUrl: "https://www.mtcjockeyclub.com/horse/san-andreas/1",
    scratched: false, trainer: "C HEWITSON", stable: "PAUL FOO KUNE STABLE", jockey: "M NUNES",
    equip: "NXTA", hwt: 433, hwtChange: 1, bp: 3, weight: 62, rating: 22, odds: 48.7,
    fastestTime: "1:28.11", daysSinceFastest: "35 d", bestTimeLast3: "1:28.11",
  });
  assert.equal(b.scratched, true);
  assert.equal(b.stable, null);
  assert.equal(b.hwtChange, -11);
  assert.equal(b.equip, null);
  assert.equal(b.odds, null);
  assert.equal(b.fastestTime, null);
});

test("throws when no runners", () => {
  assert.throws(() => parseRace({ text, runnerRows: [], timeRows: [] }));
});
