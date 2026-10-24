"""Write a registry of every training run, generated from the run folders themselves.

    uv run python scripts/run_registry.py

Reads runs/grpo/*/{config.yaml, metrics.jsonl, checkpoints/*/state.json} and writes
../ideas/ragaz/runs-registry.md. Each run's name is also its Trackio run name
(project in config.yaml), so a row here can be opened in `uv run trackio show`.
"""

import json
from datetime import datetime
from pathlib import Path

import yaml

RUNS = Path("runs/grpo")
OUT = Path("../ideas/ragaz/runs-registry.md")

# One-line purpose per run, keyed by run-name prefix (longest match wins).
PURPOSE = {
    "smoke": "Smoke test of the training loop",
    "grpo-0.6b-run2": "GRPO run 2: fixed loop/length hacks; learned hinted ragas, then collapsed",
    "grpo-0.6b": "GRPO run 1: reward hack (32-bar loops), stopped",
    "track-a-hinted": "Track A v1: always hinted; chopped-bars hack, stopped",
    "track-a-v2": "Track A v2: always hinted, product model (0.96 hinted)",
    "track-b-sft": "Track B SFT: context distillation, name-only prompts learn the ragas",
    "track-b-grpo": "Track B GRPO on v0 reward: saturated, stopped",
    "track-b-v1": "v1 reward (pakad + novelty): 0.86 bare, but a textbook caricature",
    "track-b-v2": "v2 reward (real-grounded): most realistic at step 20, then Goodhart",
    "track-b-v3": "v3 reward (group note profile, picked by realism): best realism composer",
    "v4-sft": "v4 SFT: anchors raga names (incl. Deshkar) to twin-filtered pieces; twin 84–89% stable",
    "v4-final": "v4 final: GRPO from v4-sft, hints held at 30%; twin 96–99%, realism 0.94 (Deshkar somewhat exaggerated)",
    "v5a-rhythm": "v5a: GRPO with rhythm reward; rhythm 0.00 in every rollout (never tried), stopped",
    "v5-sft-rhythm": "Rhythm SFT on 600 re-timed pieces (stopped by watchdog at 70; resumed as -b)",
    "v5b-rhythm-grpo": "v5b: rhythm as a 0.2 weight was traded away (0.36 → 0.15), stopped",
    "v5c-rhythm-gate": "v5c: rhythm as a multiplier; rhythm 0.47, real-like timing at 100 bpm",
    "v5d-long": "v5d: 16-bar GRPO from v5c; still wrote 8 bars, never reached upper Sa, stopped",
    "v5-sft-long": "16-bar SFT (sthayi + lifted antara): 16 bars 61/64, upper Sa 63/64, register 0.98",
    "v5e-long-grpo": "v5e: 16-bar GRPO polish; best step 30 (register 1.0, arc 0.84, twin 0.91)",
    "v4-hybrid": "v4 hybrid (rulebook + real music) + Deshkar: twin test 90% at step 40–60, forgotten after hints faded",
}


def purpose(name: str) -> str:
    matches = [k for k in PURPOSE if name.startswith(k)]
    return PURPOSE[max(matches, key=len)] if matches else ""


def evals(metrics: list[dict]) -> list[dict]:
    return [m for m in metrics if "eval/bare/reward" in m]


def fmt(x: float | None) -> str:
    return "—" if x is None else f"{x:.2f}"


def row(run: Path) -> dict | None:
    cfg_path, metrics_path = run / "config.yaml", run / "metrics.jsonl"
    if not cfg_path.exists() or not metrics_path.exists():
        return None
    cfg = yaml.safe_load(cfg_path.read_text())
    metrics = [json.loads(line) for line in metrics_path.read_text().splitlines() if line.strip()]
    ev = evals(metrics)
    steps = max((m["step"] for m in metrics), default=0)
    best = run / "checkpoints" / "best" / "state.json"
    best_state = json.loads(best.read_text()) if best.exists() else None
    killed = (run / "KILLED_BY_WATCHDOG.txt").exists()
    first, last = (ev[0], ev[-1]) if ev else ({}, {})
    peak = max(ev, key=lambda m: m.get(cfg.get("best_metric", "eval/bare/reward"), m["eval/bare/reward"])) if ev else {}
    return {
        "run": run.name,
        "started": datetime.strptime(run.name[-13:], "%Y%m%d-%H%M").strftime("%Y-%m-%d %H:%M") if run.name[-13:-5].isdigit() else "",
        "purpose": purpose(run.name),
        "kind": "SFT" if cfg.get("sft_data") else "GRPO",
        "init": Path(cfg["init_adapter"]).parent.parent.name if cfg.get("init_adapter") else "base",
        "reward": cfg.get("reward_style", "v1"),
        "steps": steps,
        "bare": f"{fmt(first.get('eval/bare/reward'))} → {fmt(last.get('eval/bare/reward'))}",
        "hinted": f"{fmt(first.get('eval/hinted/reward'))} → {fmt(last.get('eval/hinted/reward'))}",
        "realism": f"{fmt(first.get('eval/bare/realism'))} → {fmt(last.get('eval/bare/realism'))}" if "eval/bare/realism" in last else "—",
        "best": f"step {best_state['step']} ({cfg.get('best_metric', 'eval/bare/reward').split('/')[-1]} {best_state['best_eval']:.2f})" if best_state else "—",
        "status": "watchdog stop" if killed else ("finished" if steps >= cfg["steps"] else "stopped early"),
        "project": cfg.get("project", "ragaz"),
        "peak_step": peak.get("step"),
    }


def main() -> None:
    rows = [r for r in (row(p) for p in sorted(RUNS.iterdir())) if r]
    rows.sort(key=lambda r: r["started"])
    cols = ["run", "started", "kind", "init", "reward", "steps", "bare", "hinted", "realism", "best", "status"]
    lines = [
        "# ragaz — run registry",
        "",
        "Generated by `scripts/run_registry.py` from each run's `config.yaml`, `metrics.jsonl` and checkpoints. Do not edit by hand.",
        "",
        "- **Run name = Trackio run name.** View: `cd ragaz && uv run trackio show --project ragaz` (smoke tests: `ragaz-smoke`).",
        "- **Files per run:** `ragaz/runs/grpo/<run>/`: `config.yaml` (exact settings), `metrics.jsonl` (every logged number), `eval_samples.jsonl` (every evaluated piece), `audio/`, `checkpoints/`.",
        "- **bare / hinted / realism:** first → last evaluation. *bare* = raga name only; *realism* = 1 − distance of pooled note profile from real recordings (v2+).",
        "- Reward styles: v1 = hand-written style rules; v2 = calibrated on real recordings; v3 = v2 + group note profile.",
        "",
        "| " + " | ".join(cols) + " | purpose |",
        "|" + "---|" * (len(cols) + 1),
    ]
    for r in rows:
        lines.append("| " + " | ".join(str(r[c]) for c in cols) + f" | {r['purpose']} |")
    OUT.write_text("\n".join(lines) + "\n")
    print(f"wrote {OUT} ({len(rows)} runs)")


if __name__ == "__main__":
    main()
