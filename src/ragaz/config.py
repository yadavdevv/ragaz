"""Training configuration: a YAML file plus ``key=value`` overrides from the CLI."""

from dataclasses import asdict, dataclass, field, fields
from pathlib import Path

import yaml


@dataclass
class GRPOConfig:
    # Run
    name: str = "grpo"
    seed: int = 0
    out_dir: str = "runs/grpo"
    tracker: str = "trackio"  # trackio | wandb | mlflow | none
    project: str = "ragaz"

    # Model + LoRA
    # Qwen3 (standard attention), not Qwen3.5: Qwen3.5's linear-attention layers have no
    # fast backward pass on MLX, and one training step took >10 min and 34 GB.
    model: str = "mlx-community/Qwen3-0.6B-bf16"
    lora_layers: int = 16  # last N transformer blocks get adapters (Qwen3-0.6B has 28); fewer = less memory
    lora_rank: int = 16
    lora_scale: float = 20.0
    lora_dropout: float = 0.0
    init_adapter: str | None = None  # start from these LoRA weights (e.g. an SFT adapter); also the KL anchor

    # Task
    ragas: list[str] = field(default_factory=lambda: ["bhupali", "yaman", "malkauns"])
    hint_start: float = 1.0  # probability a training prompt includes the raga's notes...
    hint_end: float = 0.3  # ...decaying linearly to this
    hint_decay_steps: int = 150

    target_bars: int = 8  # bars asked for in the prompt and rewarded by the length score
    rhythm_prompt: bool = False  # v5: prompt asks for quick runs and held notes, with an example

    # Rollouts
    steps: int = 200
    prompts_per_step: int = 4
    group_size: int = 8  # samples per prompt (G)
    temperature: float = 1.0
    top_p: float = 1.0
    max_tokens: int = 200
    gen_batch: int = 16  # sequences generated at once

    # GRPO objective
    lr: float = 2e-5
    warmup_steps: int = 10
    beta: float = 0.02  # KL to the base model; 0 disables it and skips loading a reference copy
    clip_low: float = 0.2
    clip_high: float = 0.28  # DAPO "clip-higher"
    scale_advantages: bool = True  # divide by group std (GRPO); False = Dr.GRPO
    updates_per_batch: int = 1  # >1 reuses rollouts with importance ratios + clipping
    micro_batch: int = 4  # sequences per forward/backward pass
    max_grad_norm: float = 1.0
    mask_truncated: bool = False  # drop completions that hit max_tokens from the loss
    reward_style: str = "v1"  # v1 = hand-written style rules; v2 = style calibrated on real recordings; v3 = v2 with group profile
    group_profile_weight: float = 0.0  # reward × ((1 − w) + w · rank of the piece's pull of its group's note profile toward real)
    duplicate_penalty: float = 0.5  # reward × count^-p for pieces repeated within a group; 0 disables

    # SFT (ragaz sft): teach name-only prompts from distilled compositions
    sft_data: str | None = None  # JSONL of {"raga", "notation"} from `ragaz distill`
    sft_epochs: int = 3
    sft_variants: list[str] = field(default_factory=lambda: ["bare"])  # prompt variants each example is shown with

    # Evaluation + checkpoints
    eval_every: int = 20
    eval_samples: int = 16  # per raga per prompt variant
    save_every: int = 20
    render_audio: bool = True
    best_metric: str = "eval/bare/reward"  # which eval number picks checkpoints/best
    novelty_ref: str | None = None  # JSONL of {"notation"}; eval logs the share of bars not found in it
    novelty_weight: float = 0.0  # training reward × ((1 - w) + w · share of novel bars); needs novelty_ref

    # Memory (24 GB Mac that's also running a browser)
    memory_gb: float = 6.0  # soft MLX limit: MLX tries to stay under it but can overshoot
    hard_memory_gb: float = 9.0  # watchdog kills the run above this
    min_free_gb: float = 3.0  # ...or when the system has less than this free
    max_swap_growth_gb: float = 4.0  # ...or when swap grows by more than this
    governor_full_gb: float = 5.0  # resource-aware pacing: full batch sizes above this much free memory
    governor_pause_gb: float = 4.0  # ...half batch sizes between, pause and wait below this

    @classmethod
    def load(cls, path: str | Path | None = None, overrides: list[str] | None = None) -> "GRPOConfig":
        values = yaml.safe_load(Path(path).read_text()) or {} if path else {}
        for item in overrides or []:
            key, _, raw = item.partition("=")
            if not _:
                raise ValueError(f"override must be key=value, got {item!r}")
            values[key.strip()] = yaml.safe_load(raw)
        known = {f.name for f in fields(cls)}
        unknown = set(values) - known
        if unknown:
            raise ValueError(f"unknown config keys: {', '.join(sorted(unknown))}")
        return cls(**values)

    def to_dict(self) -> dict:
        return asdict(self)

    def save(self, path: Path) -> None:
        path.write_text(yaml.safe_dump(self.to_dict(), sort_keys=False))
