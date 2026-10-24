"""Re-time good pieces with real-music rhythm, to teach the composer rhythm (SFT data).

    uv run python scripts/rhythmize.py

The v4/v5a composer writes one note per beat (rhythm score 0.00) even when asked for
runs and holds, so GRPO never sees a varied rhythm to reinforce. Same recipe as for
Malkauns and Deshkar: create examples, SFT, then GRPO.

Notes come from good pieces the model wrote (data/distilled_v4.jsonl); only their
*timing* changes. Each beat becomes one of:
  run   4 quick notes   (GRSR)
  pair  2 notes         (GR)
  one   1 note          (G)
  hold  1 note held k beats (G - -), placed on important notes (Sa, vadi, samvadi, nyas)
Beat-type frequencies are fitted to the real duration shape (median note ≈ half a beat:
~26% of notes quarter-beat, ~38% half, ~19% one beat, ~15% held 2–4 beats). Every
result is scored with the v5 verifier and kept only if good (and, for the twin ragas,
more itself than its twin).
"""

import json
import random
from collections import defaultdict
from pathlib import Path

from ragaz.notation import parse
from ragaz.ragas import get_raga
from ragaz.verify import verify

SRC = Path("data/distilled_v4.jsonl")
OUT = Path("data/rhythm_v5.jsonl")
BEATS = 32  # 8 bars × 4
BEAT_TYPES = {"run": 0.10, "pair": 0.27, "one": 0.27, "hold": 0.36}
TWIN = {"bhupali": "deshkar", "deshkar": "bhupali"}


def token(n) -> str:
    return "." * max(0, -n.octave) + n.swara + "'" * max(0, n.octave)


def rhythmize(pool: list[str], raga, rng: random.Random) -> str:
    """Lay notes from the pool into 32 beats with a real-like mix of runs, pairs and holds."""
    important = {"S", raga.vadi, raga.samvadi} | set(raga.nyas)
    beats: list[str] = []
    i = 0
    while len(beats) < BEATS:
        if i + 4 > len(pool):
            i = 0
        kind = rng.choices(list(BEAT_TYPES), weights=list(BEAT_TYPES.values()))[0]
        bar_left = 4 - len(beats) % 4
        if kind == "hold" and pool[i].lstrip(".").rstrip("'") in important and bar_left >= 2:
            k = rng.choice([2, 2, 3, 4][: bar_left])
            beats += [pool[i]] + ["-"] * (k - 1)
            i += 1
        elif kind == "run":
            beats.append("".join(pool[i : i + 4]))
            i += 4
        elif kind == "pair" or kind == "hold":
            beats.append("".join(pool[i : i + 2]))
            i += 2
        else:
            beats.append(pool[i])
            i += 1
    # Phrase ends rest: the last beat of each cycle becomes a hold where possible.
    for end in (15, 31):
        if beats[end] != "-" and beats[end - 1] != "-" and len(beats[end - 1]) <= 2:
            beats[end] = "-"
    bars = [" ".join(beats[b : b + 4]) for b in range(0, BEATS, 4)]
    return " | ".join(bars[:4]) + " |\n" + " | ".join(bars[4:]) + " |"


def main(per_piece: int = 6, keep_per_raga: int = 150, min_reward: float = 0.6, seed: int = 0) -> None:
    rng = random.Random(seed)
    by_raga = defaultdict(list)
    for line in SRC.read_text().splitlines():
        row = json.loads(line)
        by_raga[row["raga"]].append([token(n) for n in parse(row["notation"]).notes])
    kept = []
    for key, pieces in by_raga.items():
        raga = get_raga(key)
        candidates = []
        for notes in pieces:
            for _ in range(per_piece):
                # Two pieces' notes back to back: rhythmized lines need ~38 notes for 32 beats.
                pool = notes + rng.choice(pieces)
                text = rhythmize(pool, raga, rng)
                rep = verify(text, raga, style="v5")
                if TWIN.get(key) and verify(text, TWIN[key], style="v5").reward >= rep.reward:
                    continue
                if rep.reward >= min_reward and rep.scores["purity"] == 1:
                    candidates.append((rep.reward, rep.scores["rhythm"], text))
        candidates = sorted(set(candidates), reverse=True)[:keep_per_raga]
        kept += [{"raga": key, "notation": t, "reward": round(r, 4), "rhythm": round(rh, 3)} for r, rh, t in candidates]
        if candidates:
            avg = sum(c[0] for c in candidates) / len(candidates)
            rh = sum(c[1] for c in candidates) / len(candidates)
            print(f"{raga.name:<9} {len(pieces) * per_piece} candidates → kept {len(candidates)} (reward {avg:.2f}, rhythm {rh:.2f})")
            print(f"           e.g. {candidates[0][2].splitlines()[0]}")
    OUT.write_text("\n".join(json.dumps(k) for k in kept) + "\n")
    print(f"wrote {len(kept)} pieces → {OUT}")


if __name__ == "__main__":
    main()
