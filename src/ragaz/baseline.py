"""Baseline: sample compositions from an untrained model and score them.

    ragaz baseline --model mlx-community/Qwen3.5-0.8B-bf16 --n 50
"""

import json
import statistics
import time
from pathlib import Path

from ragaz.notation import extract
from ragaz.prompts import build_prompt, chat_prompt
from ragaz.ragas import load_ragas
from ragaz.render import render, write_wav
from ragaz.verify import verify

PARTS = ["format", "allowed", "beats", "tala", "emphasis", "melody", "pakad", "variety", "length"]


def run_baseline(
    model_id: str,
    n: int,
    variants: list[str],
    out_dir: Path,
    temp: float = 0.8,
    max_tokens: int = 256,
    batch: int = 8,
    memory_gb: float = 6,
) -> list[dict]:
    import mlx.core as mx
    from mlx_lm import batch_generate, load
    from mlx_lm.sample_utils import make_sampler

    # Keep MLX well inside a 24 GB laptop that is also running a browser.
    mx.set_memory_limit(int(memory_gb * 2**30))
    mx.set_cache_limit(2**30)
    from ragaz.watchdog import MemoryWatchdog

    MemoryWatchdog(max_gb=memory_gb * 1.5).start()

    model, tokenizer = load(model_id)
    sampler = make_sampler(temp=temp, top_p=0.95)
    run_dir = out_dir / model_id.split("/")[-1]
    run_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for variant in variants:
        for raga in load_ragas().values():
            start = time.time()
            prompts = [chat_prompt(tokenizer, raga, variant)] * n
            replies = batch_generate(
                model,
                tokenizer,
                prompts,
                max_tokens=max_tokens,
                sampler=sampler,
                completion_batch_size=batch,
                prefill_batch_size=min(4, batch),
            ).texts
            for reply in replies:
                notation = extract(reply)
                report = verify(notation, raga)
                rows.append(
                    {
                        "model": model_id,
                        "variant": variant,
                        "raga": raga.key,
                        "reward": report.reward,
                        "scores": report.scores,
                        "violations": report.violations,
                        "notation": notation,
                        "reply": reply,
                    }
                )
            print(f"  {variant:<6} {raga.name:<9} {n} samples in {time.time() - start:.0f}s")

    with open(run_dir / "samples.jsonl", "w") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")
    (run_dir / "prompts.txt").write_text(
        "\n\n".join(f"### {v} / {r.name}\n{build_prompt(r, v)}" for v in variants for r in load_ragas().values())
    )

    summary = summarize(rows)
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print_summary(model_id, summary)

    # Render the best sample of each (variant, raga) so we can listen.
    for variant in variants:
        for raga in load_ragas().values():
            group = [r for r in rows if r["variant"] == variant and r["raga"] == raga.key]
            best = max(group, key=lambda r: r["reward"])
            if best["reward"] > 0:
                write_wav(run_dir / f"best-{variant}-{raga.key}.wav", render(best["notation"], raga))
    print(f"\nsamples, summary and best WAVs in {run_dir}")
    return rows


def summarize(rows: list[dict]) -> dict:
    summary = {}
    for key in sorted({(r["variant"], r["raga"]) for r in rows}):
        group = [r for r in rows if (r["variant"], r["raga"]) == key]
        summary["/".join(key)] = {
            "n": len(group),
            "reward_mean": statistics.mean(r["reward"] for r in group),
            "reward_max": max(r["reward"] for r in group),
            "parseable": sum(r["scores"]["format"] > 0 for r in group) / len(group),
            "no_wrong_notes": sum(r["scores"]["allowed"] == 1 for r in group) / len(group),
            "good (>0.8)": sum(r["reward"] > 0.8 for r in group) / len(group),
            **{f"{p}_mean": statistics.mean(r["scores"][p] for r in group) for p in PARTS},
        }
    return summary


def print_summary(model_id: str, summary: dict) -> None:
    print(f"\n{model_id}")
    cols = ["reward_mean", "reward_max", "parseable", "no_wrong_notes", "good (>0.8)", "allowed_mean", "tala_mean", "emphasis_mean", "variety_mean"]
    print(f"{'variant/raga':<18}" + "".join(f"{c.replace('_mean', ''):>15}" for c in cols))
    for key, s in summary.items():
        print(f"{key:<18}" + "".join(f"{s[c]:>15.2f}" for c in cols))
