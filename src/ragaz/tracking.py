"""Experiment tracking with a switchable backend.

Every run always writes ``metrics.jsonl`` to its run directory, whatever the
backend, so nothing is lost if a dashboard is down. On top of that:

  trackio  local-first, free, no account (default). View: ``uv run trackio show``
  wandb    Weights & Biases (needs ``uv sync --extra wandb`` and ``wandb login``)
  mlflow   MLflow (needs ``uv sync --extra mlflow``). View: ``uv run mlflow ui``
  none     only the local files
"""

import json
import time
from pathlib import Path
from typing import Any

BACKENDS = ("trackio", "wandb", "mlflow", "none")


def flatten(d: dict, prefix: str = "") -> dict[str, Any]:
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, f"{key}."))
        else:
            out[key] = v
    return out


class Tracker:
    def __init__(self, backend: str, project: str, run_name: str, config: dict, run_dir: Path, resume: bool = False):
        if backend not in BACKENDS:
            raise ValueError(f"unknown tracking backend {backend!r}; choose from {BACKENDS}")
        self.backend = backend
        self.run_dir = run_dir
        self.metrics_file = open(run_dir / "metrics.jsonl", "a")
        self._lib: Any = None

        if backend == "trackio":
            import trackio

            trackio.init(
                project=project,
                name=run_name,
                config=config,
                resume="allow" if resume else "never",
                auto_log_gpu=True,
                auto_log_cpu=True,
                embed=False,
            )
            self._lib = trackio
        elif backend == "wandb":
            import wandb

            wandb.init(project=project, name=run_name, id=run_name, config=config, dir=str(run_dir), resume="allow" if resume else None)
            self._lib = wandb
        elif backend == "mlflow":
            import mlflow

            mlflow.set_experiment(project)
            runs = mlflow.search_runs(filter_string=f"tags.mlflow.runName = '{run_name}'") if resume else []
            run_id = runs.iloc[0].run_id if len(runs) else None
            mlflow.start_run(run_id=run_id, run_name=run_name)
            if run_id is None:
                mlflow.log_params({k: str(v)[:500] for k, v in flatten(config).items()})
            self._lib = mlflow

    def log(self, metrics: dict[str, float], step: int) -> None:
        metrics = {k: float(v) for k, v in metrics.items()}
        self.metrics_file.write(json.dumps({"step": step, "time": time.time(), **metrics}) + "\n")
        self.metrics_file.flush()
        if self.backend in ("trackio", "wandb"):
            self._lib.log(metrics, step=step)
        elif self.backend == "mlflow":
            self._lib.log_metrics(metrics, step=step)

    def log_audio(self, key: str, path: Path, caption: str, step: int) -> None:
        if self.backend == "trackio":
            self._lib.log({key: self._lib.Audio(str(path), caption=caption)}, step=step)
        elif self.backend == "wandb":
            self._lib.log({key: self._lib.Audio(str(path), caption=caption)}, step=step)
        elif self.backend == "mlflow":
            self._lib.log_artifact(str(path), artifact_path=f"audio/step_{step:05d}")

    def log_table(self, key: str, columns: list[str], rows: list[list[Any]], step: int) -> None:
        with open(self.run_dir / f"{key.replace('/', '_')}.jsonl", "a") as f:
            for row in rows:
                f.write(json.dumps({"step": step, **dict(zip(columns, row))}) + "\n")
        if self.backend in ("trackio", "wandb"):
            self._lib.log({key: self._lib.Table(columns=columns, data=rows)}, step=step)
        elif self.backend == "mlflow":
            self._lib.log_table(data={c: [r[i] for r in rows] for i, c in enumerate(columns)}, artifact_file=f"tables/{key.replace('/', '_')}_{step:05d}.json")

    def alert(self, title: str, text: str) -> None:
        print(f"[alert] {title}: {text}")
        if self.backend == "trackio":
            self._lib.alert(title=title, text=text)
        elif self.backend == "wandb":
            self._lib.alert(title=title, text=text)

    def finish(self) -> None:
        self.metrics_file.close()
        if self.backend in ("trackio", "wandb"):
            self._lib.finish()
        elif self.backend == "mlflow":
            self._lib.end_run()
