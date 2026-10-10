"""Validate the v2 (real-grounded) style scores on recordings held out from calibration.

    uv run python scripts/calibrate_check.py

Reports, per raga: held-out real excerpts scored on their own raga, raga
identification accuracy, and the v1 model's pieces under the same scores.
"""

import json
import statistics
from collections import Counter, defaultdict

from ragaz.notation import parse
from ragaz.ragas import load_ragas
from ragaz.realprofile import load_profiles, recording_excerpts, style_scores
from ragaz.verify import WEIGHTS_V2

RAGAS = ["bhupali", "yaman", "malkauns"]
STYLE = ("profile", "motion", "phrases")


def note_score(notes, raga) -> dict[str, float]:
    allowed_raga = load_ragas()[raga].notes
    total = sum(d for _, _, d in notes)
    allowed = sum(d for s, _, d in notes if s in allowed_raga) / total
    s = style_scores(notes, raga)
    w = sum(WEIGHTS_V2[k] for k in STYLE)
    s["allowed"] = allowed
    s["combined"] = allowed**2 * sum(WEIGHTS_V2[k] * s[k] for k in STYLE) / w
    return s


def main() -> None:
    split = load_profiles()["split"]
    held_out = []
    for raga in RAGAS:
        recs = recording_excerpts(raga)
        for name in split[raga]["test"]:
            held_out += [(raga, e) for e in recs[name]]
    print(f"{len(held_out)} held-out real excerpts from {sum(len(split[r]['test']) for r in RAGAS)} recordings\n")

    print(f"{'':<22}" + "".join(f"{k:>10}" for k in ("allowed", *STYLE, "combined")))
    for raga in RAGAS:
        group = [note_score(e, raga) for t, e in held_out if t == raga]
        print(f"{'real ' + raga + ' (held out)':<22}" + "".join(f"{statistics.mean(g[k] for g in group):>10.2f}" for k in ("allowed", *STYLE, "combined")))
        model = [json.loads(l) for l in open("runs/grpo/track-b-v1-20261008-0122/eval_samples.jsonl") if '"step": 100,' in l and '"bare"' in l and f'"{raga}"' in l]
        mg = [note_score([(n.swara, n.octave, n.duration) for n in parse(m["notation"]).notes], raga) for m in model]
        print(f"{'v1 model ' + raga:<22}" + "".join(f"{statistics.mean(g[k] for g in mg):>10.2f}" for k in ("allowed", *STYLE, "combined")))

    confusion = defaultdict(Counter)
    for truth, e in held_out:
        confusion[truth][max(RAGAS, key=lambda r: note_score(e, r)["combined"])] += 1
    correct = sum(confusion[t][t] for t in RAGAS)
    print(f"\nRaga identification on held-out recordings: {correct}/{len(held_out)} = {correct / len(held_out):.0%}")
    print(f"{'':<10}" + "".join(f"{r:>10}" for r in RAGAS))
    for t in RAGAS:
        print(f"{t:<10}" + "".join(f"{confusion[t][r]:>10}" for r in RAGAS))


if __name__ == "__main__":
    main()
