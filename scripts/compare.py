"""Build a listening page: untrained vs Track A vs Track B, one typical piece per raga.

    uv run python scripts/compare.py

Picks the *median*-scoring eval sample for each (model, raga), not the best, so the
comparison is representative. Renders MP3s next to reports/compare.html.
"""

import html
import json
import statistics
import subprocess
from pathlib import Path

from ragaz.ragas import get_raga
from ragaz.render import render, write_wav
from ragaz.verify import verify

RUNS = Path("runs/grpo")
OUT = Path("reports/compare")
MODELS = [
    ("Untrained", "track-a-v2-20261008-0049", 0, "bare", "Qwen3-0.6B before any training, name-only prompt"),
    ("Track A", "track-a-v2-20261008-0049", 100, "hinted", "GRPO, prompt includes the raga's notes"),
    ("Track B", "track-b-sft-20261008-0112", 50, "bare", "SFT distillation, raga name only"),
    ("v1", "track-b-v1-20261008-0122", 100, "bare", "Track B + GRPO with signature-phrase and novelty rewards, name only"),
    ("v3", "track-b-v3-20261008-2341", 80, "bare", "GRPO with a reward measured from real concert recordings, name only"),
]
RAGAS = ["bhupali", "yaman", "malkauns"]


def median_sample(run: str, step: int, variant: str, raga: str) -> dict:
    """Median piece under the *current* reward, so every model is judged the same way."""
    rows = [json.loads(l) for l in open(RUNS / run / "eval_samples.jsonl")]
    group = [r for r in rows if r["step"] == step and r["variant"] == variant and r["raga"] == raga]
    for r in group:
        report = verify(r["notation"], raga)
        r["reward"], r["violations"], r["pakad"] = report.reward, report.violations, report.scores["pakad"]
    group.sort(key=lambda r: r["reward"])
    return group[len(group) // 2] | {"mean": statistics.mean(r["reward"] for r in group), "pakad_mean": statistics.mean(r["pakad"] for r in group)}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cards = []
    for raga_key in RAGAS:
        raga = get_raga(raga_key)
        cells = []
        for label, run, step, variant, desc in MODELS:
            sample = median_sample(run, step, variant, raga_key)
            name = f"{raga_key}-{label.lower().replace(' ', '-')}"
            audio = ""
            try:
                wav = OUT / f"{name}.wav"
                write_wav(wav, render(sample["notation"], raga, expressive=True))
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "96k", str(OUT / f"{name}.mp3")], check=True)
                wav.unlink()
                audio = f'<audio controls preload="none" src="compare/{name}.mp3"></audio>'
            except ValueError:
                audio = '<p class="muted">No playable notes</p>'
            notation = html.escape(sample["notation"].replace("\n", " ")) or "(empty)"
            issues = html.escape("; ".join(sample["violations"][:2])) or "no rule broken"
            cells.append(
                f'<div class="cell"><div class="model">{label}</div><div class="desc">{desc}</div>'
                f'<div class="score">{sample["reward"]:.2f}<span> this piece · {sample["mean"]:.2f} avg · phrases {sample["pakad_mean"]:.2f}</span></div>'
                f'{audio}<code>{notation}</code><div class="issues">{issues}</div></div>'
            )
        notes = " ".join(sorted(raga.notes, key="SrRgGmMPdDnN".index))
        cards.append(
            f'<section><h2>{raga.name}</h2><p class="meta">Notes {notes} · vadi {raga.vadi} · samvadi {raga.samvadi} · {raga.time}</p>'
            f'<div class="grid">{"".join(cells)}</div></section>'
        )
    page = TEMPLATE.replace("{{cards}}", "\n".join(cards))
    (OUT.parent / "compare.html").write_text(page)
    print(f"wrote {OUT.parent / 'compare.html'}")


TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ragaz Listening Test</title>
<style>
:root { --bg:#faf8f5; --card:#fff; --ink:#1f1b16; --muted:#6b6259; --line:#e7e1d9; --accent:#b4532a; }
@media (prefers-color-scheme: dark) { :root { --bg:#16130f; --card:#1f1b16; --ink:#f1ebe3; --muted:#a3998e; --line:#352f28; --accent:#e08a5c; } }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system, system-ui, sans-serif; }
main { max-width:1100px; margin:0 auto; padding:32px 16px 64px; }
h1 { margin:0 0 4px; font-size:28px; } h2 { margin:0; font-size:22px; }
.lede, .meta, .desc, .muted, .score span { color:var(--muted); }
section { margin-top:32px; }
.meta { margin:2px 0 12px; font-size:14px; }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:12px; }
.cell { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:8px; }
.model { font-weight:600; color:var(--accent); } .desc { font-size:13px; }
.score { font-size:22px; font-weight:600; } .score span { font-size:13px; font-weight:400; }
audio { width:100%; }
code { font:13px/1.6 ui-monospace, Menlo, monospace; word-break:break-word; }
.issues { font-size:12px; color:var(--muted); }
</style></head><body><main>
<h1>ragaz listening test</h1>
<p class="lede">One typical piece (the median-scoring sample, not the best) per model and raga. Every model is scored with the same v1 verifier (rules + signature phrases), 0 to 1. Same expressive synth for all (glides and wavers measured from real singers), so only the composition differs.</p>
{{cards}}
</main></body></html>
"""

if __name__ == "__main__":
    main()
