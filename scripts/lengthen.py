"""Build 16-bar teaching pieces (sthayi + antara) from good 8-bar ones, for SFT.

    uv run python scripts/lengthen.py

When asked for 16 bars the model still writes 8 (every rollout the same length), so GRPO
has no longer attempt to reinforce. Same recipe as for rhythm and Deshkar: make examples,
SFT, then GRPO.

Each example pairs two good rhythmic 8-bar pieces of the same raga: the first (lower)
as the sthayi, ending on Sa; the second as the antara, chosen to sit higher and reach
upper Sa: no source piece does, so antara halves are *lifted* (notes below Pa up an
octave). Pieces come from the rhythm teaching set and v5c's own evaluations. Every pair
is scored with the 16-bar v5 reward (including the arc term) and kept only if good.
"""

import json
import random
from collections import defaultdict
from pathlib import Path

from ragaz.notation import parse
from ragaz.verify import verify

OUT = Path("data/long_v5.jsonl")
TWIN = {"bhupali": "deshkar", "deshkar": "bhupali"}


def lift(text: str) -> str:
    """Antara register: notes below Pa move up an octave, so phrases live between Pa and
    upper Ga/Ma, the classic antara range. Pitch classes (and so the raga) are unchanged.
    Needed because no source piece ever reaches upper Sa, while real singers spend
    18–46% of their time in the upper octave."""
    out_lines = []
    for line in text.splitlines():
        bars = []
        for bar in line.split("|"):
            beats = []
            for beat in bar.split():
                if beat == "-":
                    beats.append(beat)
                    continue
                notes = parse(beat).notes
                toks = []
                for n in notes:
                    octave = n.octave + 1 if n.octave == 0 and n.swara in "SrRgGmM" else n.octave
                    toks.append("." * max(0, -octave) + n.swara + "'" * max(0, octave))
                beats.append("".join(toks))
            if beats:
                bars.append(" ".join(beats))
        out_lines.append(" | ".join(bars) + " |")
    return "\n".join(out_lines)


def mean_pitch(text: str) -> float:
    notes = parse(text).notes
    return sum(n.semitones * n.duration for n in notes) / max(1e-9, sum(n.duration for n in notes))


def sources() -> dict[str, list[str]]:
    by_raga = defaultdict(list)
    for line in Path("data/rhythm_v5.jsonl").read_text().splitlines():
        row = json.loads(line)
        by_raga[row["raga"]].append(row["notation"].strip())
    v5c = sorted(Path("runs/grpo").glob("v5c-rhythm-gate-*"))[-1]
    for line in open(v5c / "eval_samples.jsonl"):
        row = json.loads(line)
        if row["reward"] > 0.4 and len(parse(row["notation"]).bars) == 8:
            by_raga[row["raga"]].append(row["notation"].strip())
    return by_raga


def main(pairs_per_raga: int = 1500, keep_per_raga: int = 120, min_reward: float = 0.45, seed: int = 0) -> None:
    rng = random.Random(seed)
    kept = []
    for raga, pieces in sources().items():
        ending_on_sa = [p for p in pieces if parse(p).notes and parse(p).notes[-1].swara == "S"]
        reaches_upper = [lift(p) for p in pieces]
        reaches_upper = [p for p in reaches_upper if any(n.swara == "S" and n.octave >= 1 for n in parse(p).notes)]
        if not ending_on_sa or not reaches_upper:
            print(f"{raga}: not enough material ({len(ending_on_sa)} end on Sa, {len(reaches_upper)} reach S')")
            continue
        candidates = set()
        for _ in range(pairs_per_raga):
            sthayi, antara = rng.choice(ending_on_sa), rng.choice(reaches_upper)
            if sthayi == antara or mean_pitch(antara) <= mean_pitch(sthayi) + 1:
                continue
            text = sthayi + "\n" + antara
            rep = verify(text, raga, style="v5", target_bars=16)
            if TWIN.get(raga) and verify(text, TWIN[raga], style="v5", target_bars=16).reward >= rep.reward:
                continue
            if rep.reward >= min_reward and rep.scores["purity"] == 1 and rep.scores["arc"] == 1:
                candidates.add((round(rep.reward, 4), round(rep.scores["rhythm"], 3), text))
        best = sorted(candidates, reverse=True)[:keep_per_raga]
        kept += [{"raga": raga, "notation": t, "reward": r, "rhythm": rh} for r, rh, t in best]
        if best:
            print(f"{raga:<9} {len(candidates)} good pairs → kept {len(best)} (reward {sum(b[0] for b in best) / len(best):.2f}, rhythm {sum(b[1] for b in best) / len(best):.2f})")
        else:
            print(f"{raga:<9} no pair passed")
    OUT.write_text("\n".join(json.dumps(k) for k in kept) + "\n")
    print(f"wrote {len(kept)} 16-bar pieces → {OUT}")


if __name__ == "__main__":
    main()
