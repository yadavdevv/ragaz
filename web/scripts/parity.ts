// Parity: the TS verifier must reproduce the Python verify(style="v2") on every exported piece.
import { readFileSync } from "node:fs";
import { verify, type Profiles } from "../lib/verify";
import type { Raga } from "../lib/music";

const load = (n: string) => JSON.parse(readFileSync(`public/data/${n}.json`, "utf8"));
const ragas: Record<string, Raga> = Object.fromEntries(load("ragas").ragas.map((r: Raga) => [r.key, r]));
const profiles: Profiles = load("profiles");
const cases: { raga: string; notation: string; reward: number; scores: Record<string, number>; violations: string[] }[] = [
  ...load("pieces"),
  ...load("exhibits").map((e: any) => ({ raga: e.raga, notation: e.notation, reward: e.reward_now, scores: e.scores_now, violations: e.violations_now })),
  ...load("arena").flatMap((g: any) => g.members.map((m: any) => ({ raga: g.raga, notation: m.notation, reward: m.reward_now, scores: m.scores_now, violations: m.violations_now }))),
];
let bad = 0;
for (const c of cases) {
  const r = verify(c.notation, ragas[c.raga], profiles[c.raga]);
  const diffs = Object.keys(c.scores).filter((k) => Math.abs(r.scores[k] - c.scores[k]) > 1e-3);
  const vd = JSON.stringify(r.violations) !== JSON.stringify(c.violations);
  if (Math.abs(r.reward - c.reward) > 1e-3 || diffs.length || vd) {
    if (bad++ < 5) console.log("MISMATCH", c.raga, JSON.stringify(c.notation).slice(0, 80), { py: c.reward, ts: r.reward.toFixed(4), diffs: diffs.map((k) => `${k} py ${c.scores[k]} ts ${r.scores[k].toFixed(4)}`), py_v: vd ? c.violations : undefined, ts_v: vd ? r.violations : undefined });
  }
}
console.log(`${cases.length - bad}/${cases.length} match`);
process.exit(bad ? 1 : 0);
