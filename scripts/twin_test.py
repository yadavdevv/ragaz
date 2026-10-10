"""Bhupali vs Deshkar (same five notes): does each checkpoint know which is which?

    uv run python scripts/twin_test.py runs/grpo/<run> [n]

For each saved checkpoint, generate n name-only pieces per twin and score each
under both rulebooks (v4). A piece "knows" its raga when its own raga scores higher.
Also reports the Re and Dha time shares, the textbook difference between the two.
"""

import json
import sys
from collections import Counter
from pathlib import Path

import mlx.core as mx
from mlx_lm import batch_generate, load
from mlx_lm.sample_utils import make_sampler
from mlx_lm.tuner.utils import linear_to_lora_layers

from ragaz.notation import extract, parse
from ragaz.prompts import chat_prompt
from ragaz.ragas import get_raga
from ragaz.verify import verify
from ragaz.watchdog import MemoryWatchdog

TWIN = {"bhupali": "deshkar", "deshkar": "bhupali"}


def main(run: Path, n: int = 64) -> None:
    mx.set_memory_limit(5 * 2**30)
    MemoryWatchdog(max_gb=8).start()
    cfg = json.loads(json.dumps(__import__("yaml").safe_load((run / "config.yaml").read_text())))
    model, tok = load(cfg["model"])
    model.freeze()
    linear_to_lora_layers(model, cfg["lora_layers"], {"rank": cfg["lora_rank"], "scale": cfg["lora_scale"], "dropout": 0.0})
    sampler = make_sampler(temp=0.8, top_p=0.95)
    ckpts = sorted(p for p in (run / "checkpoints").iterdir() if p.name.startswith("step"))
    results = {}
    print(f"{'checkpoint':<12}{'twin acc':>9}{'Bhu reward':>11}{'Desh reward':>12}{'Re: Bhu|Desh':>14}{'Dha: Bhu|Desh':>15}")
    for ck in ckpts:
        model.load_weights(list(mx.load(str(ck / "adapters.safetensors")).items()), strict=False)
        model.eval()
        stats = {}
        wins = 0
        for raga in TWIN:
            prompts = [chat_prompt(tok, get_raga(raga), "bare")] * n
            texts = batch_generate(model, tok, prompts, max_tokens=120, sampler=sampler, completion_batch_size=8, prefill_batch_size=4).texts
            mx.clear_cache()
            pieces = [extract(t) for t in texts]
            own = [verify(p, raga, style="v4").reward for p in pieces]
            other = [verify(p, TWIN[raga], style="v4").reward for p in pieces]
            wins += sum(o > t for o, t in zip(own, other))
            c = Counter()
            for p in pieces:
                for note in parse(p).notes:
                    c[note.swara] += note.duration
            total = sum(c.values()) or 1
            stats[raga] = {"reward": sum(own) / n, "R": c["R"] / total, "D": c["D"] / total}
        acc = wins / (2 * n)
        results[ck.name] = {"twin_accuracy": acc, **stats}
        b, d = stats["bhupali"], stats["deshkar"]
        print(f"{ck.name:<12}{acc:>9.0%}{b['reward']:>11.2f}{d['reward']:>12.2f}{b['R']:>8.0%}|{d['R']:<5.0%}{b['D']:>9.0%}|{d['D']:<5.0%}", flush=True)
    (run / "twin_test.json").write_text(json.dumps(results, indent=1))


if __name__ == "__main__":
    main(Path(sys.argv[1]), int(sys.argv[2]) if len(sys.argv) > 2 else 64)
