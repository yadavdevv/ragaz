"""Export real run data as static JSON for the web experience (web/public/data/).

Every number the site shows comes from here, and every piece carries the run
and step it came from. Pieces are re-scored with the v2 (real-grounded)
verifier so the page can show one reward equation for all of them; the reward
they got during training is kept as ``train_reward``.

    uv run python scripts/export_web.py
"""

import json
import statistics
from collections import Counter
from pathlib import Path

from ragaz.notation import parse
from ragaz.ragas import SWARAS, load_ragas
from ragaz.realprofile import load_profiles, pc_distribution
from ragaz.verify import WEIGHTS_V2, verify

RUNS = Path("runs/grpo")
OUT = Path("web/public/data")

# (label shown on the page, run dir, eval step)
MODELS = [
    ("v2", "track-b-v2-20261008-2148", 20),  # closest to real (see experiments.md)
    ("v1", "track-b-v1-20261008-0122", 100),
    ("sft", "track-b-v1-20261008-0122", 0),  # step 0 of v1 = the Track B SFT model, before any v1 GRPO
]

DEVANAGARI = {"bhupali": "भूपाली", "yaman": "यमन", "malkauns": "मालकौंस"}
# Hours (local, 24h) the raga is traditionally sung, for the raga clock.
HOURS = {"bhupali": [19, 22], "yaman": [18, 21], "malkauns": [0, 3]}


def raga_entry(r) -> dict:
    return {
        "key": r.key,
        "name": r.name,
        "devanagari": DEVANAGARI.get(r.key, r.name),
        "thaat": r.thaat,
        "notes": sorted(SWARAS.index(s) for s in r.notes),
        "swaras": [s for s in SWARAS if s in r.notes],
        "vadi": r.vadi,
        "samvadi": r.samvadi,
        "nyas": sorted(r.nyas, key=SWARAS.index),
        "pakad": r.pakad,
        "time": r.time,
        "hours": HOURS.get(r.key),
        "rasa": r.rasa,
        "tanpura": r.tanpura,
    }


def piece_entry(row: dict, label: str, run: str, ragas: dict) -> dict:
    raga = ragas[row["raga"]]
    comp = parse(row["notation"])
    report = verify(row["notation"], raga, style="v2")
    return {
        "id": f"{label}-{row['raga']}-{row['_i']:02d}",
        "model": label,
        "run": run,
        "step": row["step"],
        "raga": row["raga"],
        "notation": row["notation"],
        "notes": [
            {"s": n.swara, "o": n.octave, "t": round(n.start, 4), "d": round(n.duration, 4), "bar": n.bar, "ok": n.swara in raga.notes}
            for n in comp.notes
        ],
        "beats": comp.beats,
        "reward": round(report.reward, 4),
        "scores": {k: round(v, 4) for k, v in report.scores.items()},
        "violations": report.violations,
        "train_reward": round(row["reward"], 4),
    }


def rescore(notation: str, raga) -> dict:
    report = verify(notation, raga, style="v2")
    comp = parse(notation)
    return {
        "notes": [{"s": n.swara, "o": n.octave, "t": round(n.start, 4), "d": round(n.duration, 4), "bar": n.bar, "ok": n.swara in raga.notes} for n in comp.notes],
        "beats": comp.beats,
        "bars": len(comp.bars),
        "reward_now": round(report.reward, 4),
        "scores_now": {k: round(v, 4) for k, v in report.scores.items()},
        "violations_now": report.violations,
    }


def jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.open()]


def exhibits(ragas: dict) -> list[dict]:
    """The reward hacks, as real samples from the runs where they happened (see experiments.md)."""
    out = []

    def add(key, title, hack, why, fix, row, source, raga=None, **extra):
        raga = ragas[raga or row["raga"]]
        out.append({"key": key, "title": title, "hack": hack, "why": why, "fix": fix, "raga": raga.key, "notation": row["notation"],
                    "reward_then": round(row["reward"], 4) if row.get("reward") is not None else None, "source": source, **extra, **rescore(row["notation"], raga)})

    run1 = jsonl(RUNS / "grpo-0.6b-20261008-0020/eval_samples.jsonl")
    untrained = next(r for r in run1 if r["step"] == 0 and r["variant"] == "bare" and r["raga"] == "bhupali" and "D - P m" not in r["notation"])
    add("zero", "Before anything", "Asked for Bhupali, the untrained model writes komal notes that Bhupali doesn't have, in bars of the wrong length.",
        "It has never been scored on raga rules.", "—", untrained, "grpo-0.6b-20261008-0020 · step 0 (untrained Qwen3-0.6B)")

    durga = jsonl(Path("runs/baseline-durga-prompt/Qwen3-0.6B-bf16/samples.jsonl"))
    copied = max((r for r in durga if r["notation"].strip().startswith("S R m P | D - P m | R m P D | m R S - |")), key=lambda r: r["reward"])
    n_copied = sum("D - P m" in r["notation"] for r in durga)
    add("copy", "The copyist", f"It copied the prompt's format example (a Durga phrase) wholly or in part, in {n_copied} of {len(durga)} samples.",
        "The example was valid notation, so copying it earned format and tala points for free.", "an anti-copy multiplier", copied,
        "baseline Qwen3-0.6B with the Durga example prompt (before any fix)")

    base2b = jsonl(Path("runs/baseline/Qwen3.5-2B-8bit/samples.jsonl"))
    hop = max(base2b, key=lambda r: r["reward"])
    add("hop", "The octave hopper", "The best sample from the 2B baseline (0.91) leaps between octaves on almost every note.",
        "Nothing in the reward looked at the size of the jumps.", "the melody term (leaps wider than a fifth are penalised)", hop,
        "baseline Qwen3.5-2B (8-bit) · best of 300")

    loops = max((r for r in run1 if r["step"] == 20), key=lambda r: r["reward"])
    add("loop", "The 32-bar loop", "GRPO run 1 learned to write long loops of one figure, S G G G over and over.",
        "variety was averaged with other checks, so three good checks hid the repetition, and extra bars diluted every penalty.",
        "variety multiplies, and a length factor asks for exactly 8 bars", loops, "grpo-0.6b-20261008-0020 · step 20")

    run2 = jsonl(RUNS / "grpo-0.6b-run2-20261008-0026/eval_samples.jsonl")
    late = [r for r in run2 if r["step"] == 40 and r["variant"] == "bare"]
    common, count = Counter(r["notation"] for r in late).most_common(1)[0]
    row = next(r for r in late if r["notation"] == common)
    add("collapse", "The collapse", f"By step 40 of run 2 the model wrote this same piece {count} times out of {len(late)} bare samples, whatever raga was asked for.",
        "When all 8 answers in a group are identical, every advantage is 0 and learning stops.", "a within-group duplicate penalty (reward × count^-0.5)",
        row, "grpo-0.6b-run2-20261008-0026 · step 40", copies=count, of=len(late), ragas_asked=sorted({r["raga"] for r in late if r["notation"] == common}))

    tracka = jsonl(RUNS / "track-a-hinted-20261008-0043/eval_samples.jsonl")
    chop = max((r for r in tracka if r["step"] == 20 and "| P |" in r["notation"]), key=lambda r: r["reward"])
    add("chop", "The chopper", "To reach the 8 bars the length factor asked for, Track A cut pieces into 'bars' of 1–3 beats.",
        "4 beats per bar was only one part of the weighted tala term, so breaking it was cheap.", "a separate beats² multiplier", chop,
        "track-a-hinted-20261008-0043 · step 20")
    return out


def series(run: str, keys: list[str]) -> dict:
    rows = jsonl(RUNS / run / "metrics.jsonl")
    out = {}
    for k in keys:
        pts = [[r["step"], round(r[k], 4)] for r in rows if k in r]
        if pts:
            out[k] = pts
    return out


def sa_share(run: str) -> dict:
    """Share of time on Sa per eval step and raga (bare prompts), from the eval samples."""
    rows = jsonl(RUNS / run / "eval_samples.jsonl")
    out: dict[str, list] = {}
    for key in ["bhupali", "yaman", "malkauns"]:
        pts = []
        for step in sorted({r["step"] for r in rows}):
            notes = [(n.swara, n.octave, n.duration) for r in rows if r["step"] == step and r["raga"] == key and r["variant"] == "bare" for n in parse(r["notation"]).notes]
            if notes:
                pts.append([step, round(float(pc_distribution(notes)[0]), 4)])
        out[key] = pts
    return out


def distinct(run: str, variant: str) -> list:
    """Share of distinct pieces per eval step (computed from the samples; older runs didn't log it)."""
    rows = jsonl(RUNS / run / "eval_samples.jsonl")
    out = []
    for step in sorted({r["step"] for r in rows}):
        group = [r["notation"] for r in rows if r["step"] == step and r["variant"] == variant]
        out.append([step, round(len(set(group)) / len(group), 4), len(set(group)), len(group)])
    return out


def journey() -> dict:
    per_raga = [f"eval/bare/raga/{k}" for k in ["bhupali", "yaman", "malkauns"]]
    return {
        "run1": {"run": "grpo-0.6b-20261008-0020", **series("grpo-0.6b-20261008-0020", ["train/reward", "eval/bare/reward"])},
        "run2": {"run": "grpo-0.6b-run2-20261008-0026", **series("grpo-0.6b-run2-20261008-0026", ["train/reward", "eval/bare/reward", "eval/hinted/reward", "train/zero_adv_frac"]),
                 "distinct": {"hinted": distinct("grpo-0.6b-run2-20261008-0026", "hinted"), "bare": distinct("grpo-0.6b-run2-20261008-0026", "bare")}},
        "tracka": {"run": "track-a-v2-20261008-0049", **series("track-a-v2-20261008-0049", ["eval/hinted/reward", "eval/bare/reward", *per_raga])},
        "sft": {"run": "track-b-sft-20261008-0112", **series("track-b-sft-20261008-0112", ["eval/bare/reward", *per_raga])},
        "v1": {"run": "track-b-v1-20261008-0122", **series("track-b-v1-20261008-0122", ["train/reward", "eval/bare/reward", "eval/bare/good_rate", "eval/bare/pakad", *per_raga]), "sa": sa_share("track-b-v1-20261008-0122")},
        "v2": {"run": "track-b-v2-20261008-2148", **series("track-b-v2-20261008-2148", ["train/reward", "eval/bare/reward", "eval/bare/profile", "eval/bare/phrases", *per_raga]), "sa": sa_share("track-b-v2-20261008-2148")},
    }


def arena(ragas: dict) -> list[dict]:
    """Groups of 8 answers to one prompt (bare eval samples), scored the way GRPO scores a training group."""
    run = "track-b-v2-20261008-2148"
    rows = jsonl(RUNS / run / "eval_samples.jsonl")
    out = []
    for step in [0, 20]:
        for key in ragas:
            group = [r for r in rows if r["step"] == step and r["raga"] == key and r["variant"] == "bare"][:8]
            out.append({"run": run, "step": step, "raga": key, "members": [{"notation": r["notation"], "reward": round(r["reward"], 4), **rescore(r["notation"], ragas[key])} for r in group]})
    return out


def main() -> None:
    ragas = load_ragas()
    profiles = load_profiles()
    OUT.mkdir(parents=True, exist_ok=True)

    pieces = []
    for label, run, step in MODELS:
        rows = [json.loads(line) for line in (RUNS / run / "eval_samples.jsonl").open()]
        for key in ragas:
            chosen = [r for r in rows if r["step"] == step and r["raga"] == key and r["variant"] == "bare"]
            for i, r in enumerate(chosen):
                pieces.append(piece_entry(r | {"_i": i}, label, run, ragas))

    masters = {"source": "CompMusic Indian Art Music Raga Recognition Dataset (features), Gulati et al., Zenodo 10.5281/zenodo.7278506, CC BY 4.0", "ragas": {}}
    for key, prof in profiles["ragas"].items():
        entry = {
            "recordings": len(profiles["split"][key]["train"]) + len(profiles["split"][key]["test"]),
            "train": len(profiles["split"][key]["train"]),  # profiles are built from these; the rest are held out
            "pc": [round(x, 4) for x in prof["pc"]],
            "phrases": list(prof["phrases"])[:8],
            "models": {},
        }
        for label, _, _ in MODELS:
            group = [p for p in pieces if p["model"] == label and p["raga"] == key]
            notes = [(n["s"], n["o"], n["d"]) for p in group for n in p["notes"]]
            entry["models"][label] = {
                "pc": [round(x, 4) for x in pc_distribution(notes)],
                "reward": round(statistics.mean(p["reward"] for p in group), 4) if group else None,
            }
        masters["ragas"][key] = entry

    meta = {
        "equation": {
            "gates": ["format", "allowed²", "beats²", "variety", "length"],
            "weights": WEIGHTS_V2,
        },
        "models": [{"label": label, "run": run, "step": step} for label, run, step in MODELS],
    }

    verifier = {key: {"pc": prof["pc"], "intervals": prof["intervals"], "phrases": prof["phrases"], "calibration": prof["calibration"]} for key, prof in profiles["ragas"].items()}
    (OUT / "profiles.json").write_text(json.dumps(verifier))
    (OUT / "exhibits.json").write_text(json.dumps(exhibits(ragas), ensure_ascii=False, indent=1))
    (OUT / "journey.json").write_text(json.dumps(journey()))
    (OUT / "arena.json").write_text(json.dumps(arena(ragas)))
    (OUT / "ragas.json").write_text(json.dumps({"ragas": [raga_entry(r) for r in ragas.values()], **meta}, ensure_ascii=False, indent=1))
    (OUT / "pieces.json").write_text(json.dumps(pieces, ensure_ascii=False))
    (OUT / "masters.json").write_text(json.dumps(masters, ensure_ascii=False, indent=1))
    for label, _, _ in MODELS:
        group = [p for p in pieces if p["model"] == label]
        print(f"{label:>10}: {len(group)} pieces, mean v2 reward {statistics.mean(p['reward'] for p in group):.3f}")
    print(f"wrote {sorted(p.name for p in OUT.glob('*.json'))}")


if __name__ == "__main__":
    main()
