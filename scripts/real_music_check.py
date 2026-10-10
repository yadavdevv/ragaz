"""Does our verifier agree with real musicians?

    uv run python scripts/real_music_check.py

For each real performance (CompMusic pitch tracks, CC BY 4.0), transcribe held
notes, cut them into excerpts of 32 notes, and score every excerpt against the
rules of *every* raga. Two questions:

  1. Real music in its own raga: how high does it score? (If real Yaman scores
     badly on our Yaman rules, the rules are wrong.)
  2. Identification: does the true raga's rule set give the highest score?
     (If not, our rules don't capture raga identity.)

Only note-level checks apply (allowed notes, emphasis, melody, pakad); a pitch
track has no tala, so beats, bars and length are skipped. Notes are weighted by
how long they are held, in seconds.
"""

import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

from ragaz.notation import Composition, Note
from ragaz.ragas import load_ragas
from ragaz.transcribe import load_pitch, load_tonic, transcribe
from ragaz.verify import score_allowed, score_emphasis, score_melody, score_pakad

FEATURES = Path("data/external/compmusic/features")
EXCERPT = 32  # held notes per excerpt
PARTS = ("allowed", "emphasis", "melody", "pakad")


def composition(notes) -> Composition:
    comp = Composition()
    t0 = notes[0].start
    comp.notes = [Note(n.swara, n.octave, n.start - t0, n.duration, 0) for n in notes]
    comp.bars = [["x"] * 4]
    return comp


def note_level(notes, raga) -> dict[str, float]:
    comp = composition(notes)
    v, s = [], {}
    scores = {
        "allowed": score_allowed(comp, raga, v),
        "emphasis": score_emphasis(comp, raga, v, s),
        "melody": score_melody(comp, v, s),
        "pakad": score_pakad(comp, raga, v, s),
    }
    # Allowed weighted by time, not note count: a brief passing note shouldn't weigh like a held one.
    total = sum(n.duration for n in comp.notes)
    scores["allowed"] = sum(n.duration for n in comp.notes if n.swara in raga.notes) / total
    scores["combined"] = scores["allowed"] ** 2 * (0.35 * scores["emphasis"] + 0.3 * scores["melody"] + 0.35 * scores["pakad"])
    return scores


def main() -> None:
    ragas = load_ragas()
    rows = []
    for raga_dir in sorted(FEATURES.iterdir()):
        for pitch in sorted(raga_dir.glob("*.pitch")):
            tonic_file = pitch.with_suffix(".tonicFine")
            if not tonic_file.exists():
                continue
            times, hz = load_pitch(pitch)
            notes = transcribe(times, hz, load_tonic(tonic_file))
            for k in range(0, len(notes) - EXCERPT + 1, EXCERPT):
                excerpt = notes[k : k + EXCERPT]
                rows.append({"truth": raga_dir.name, "recording": pitch.stem[:40], "scores": {r: note_level(excerpt, ragas[r]) for r in ragas}})
            print(f"{raga_dir.name:<9} {pitch.stem[:50]:<50} {len(notes):5d} held notes")

    print(f"\n{len(rows)} excerpts of {EXCERPT} held notes\n")
    print("1) Real music scored against its own raga's rules")
    print(f"{'raga':<10}" + "".join(f"{p:>10}" for p in (*PARTS, "combined")))
    for truth in ragas:
        group = [r["scores"][truth] for r in rows if r["truth"] == truth]
        if group:
            print(f"{truth:<10}" + "".join(f"{statistics.mean(g[p] for g in group):>10.2f}" for p in (*PARTS, "combined")))

    print("\n2) Which raga's rules fit best? (rows = true raga, columns = predicted)")
    for key in ("combined", "allowed", "emphasis", "pakad"):
        confusion = defaultdict(Counter)
        for r in rows:
            confusion[r["truth"]][max(ragas, key=lambda g: r["scores"][g][key])] += 1
        correct = sum(confusion[t][t] for t in confusion)
        print(f"\n  by {key}: accuracy {correct}/{len(rows)} = {correct / len(rows):.0%}")
        print(f"  {'':<10}" + "".join(f"{g:>10}" for g in ragas))
        for t in ragas:
            if confusion[t]:
                print(f"  {t:<10}" + "".join(f"{confusion[t][g]:>10}" for g in ragas))

    Path("reports").mkdir(exist_ok=True)
    Path("reports/real_music_check.json").write_text(json.dumps(rows))


if __name__ == "__main__":
    main()
