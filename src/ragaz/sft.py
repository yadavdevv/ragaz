"""Supervised fine-tuning for context distillation (Track B, step 1).

    ragaz sft --config configs/track-b-sft.yaml

GRPO can only reinforce what the model sometimes does already. Asked for a raga
by name alone, Qwen3-0.6B never wrote Malkauns's notes, so there was nothing to
reinforce. This teaches the facts first: each distilled piece (written by the
hinted model) becomes a target for the *bare* prompt. GRPO then starts from here
with ``init_adapter`` pointing at this run's checkpoint.

Reuses GRPOTrainer for setup (model + LoRA, watchdog, tracking), evaluation
(bare + hinted, audio) and checkpoints; only the training step differs.
"""

import json
import math
import random
import time

import mlx.core as mx
import mlx.nn as nn
import mlx.optimizers as optim
import psutil
from mlx.utils import tree_map

from ragaz.config import GRPOConfig
from ragaz.grpo import make_micro_batch, sft_loss
from ragaz.prompts import chat_prompt
from ragaz.ragas import get_raga
from ragaz.trainer import GRPOTrainer


def completion_text(notation: str) -> str:
    return f"```\n{notation}\n```"


class SFTTrainer(GRPOTrainer):
    def load_examples(self) -> list[dict]:
        cfg = self.cfg
        rows = [json.loads(line) for line in open(cfg.sft_data)]
        examples = []
        for row in rows:
            raga = get_raga(row["raga"])
            completion = self.tokenizer.encode(completion_text(row["notation"])) + [self.eos_id]
            for variant in cfg.sft_variants:
                examples.append({"raga": raga.key, "prompt": chat_prompt(self.tokenizer, raga, variant, cfg.target_bars, cfg.rhythm_prompt), "completion": completion})
        return examples

    def sft_step(self, batch: list[dict]) -> dict[str, float]:
        cfg = self.cfg
        self.model.train()
        batch = sorted(batch, key=lambda e: len(e["prompt"]) + len(e["completion"]))
        n_tokens = sum(len(e["completion"]) for e in batch)
        grads_acc, loss_sum = None, 0.0
        micro = max(1, int(cfg.micro_batch * self.governor.scale))
        for j in range(0, len(batch), micro):
            part = batch[j : j + micro]
            mb = make_micro_batch([e["prompt"] for e in part], [e["completion"] for e in part], [1.0] * len(part), self.pad_id)
            loss, grads = self.sft_loss_and_grad(self.model, mb, n_tokens)
            grads_acc = grads if grads_acc is None else tree_map(mx.add, grads_acc, grads)
            mx.eval(grads_acc, loss)
            loss_sum += loss.item()
        grads_acc, norm = optim.clip_grad_norm(grads_acc, cfg.max_grad_norm)
        self.optimizer.update(self.model, grads_acc)
        mx.eval(self.model.trainable_parameters(), self.optimizer.state)
        mx.clear_cache()
        return {"train/sft_loss": loss_sum, "train/grad_norm": norm.item()}

    def train(self) -> None:
        cfg = self.cfg
        if not cfg.sft_data:
            raise ValueError("set sft_data to a JSONL file from `ragaz distill`")
        self.setup()
        self.sft_loss_and_grad = nn.value_and_grad(self.model, sft_loss)
        examples = self.load_examples()
        batch_size = cfg.prompts_per_step * cfg.group_size
        steps_per_epoch = math.ceil(len(examples) / batch_size)
        total = cfg.sft_epochs * steps_per_epoch
        print(f"run dir: {self.run_dir}\nSFT: {len(examples)} examples, batch {batch_size}, {cfg.sft_epochs} epochs = {total} steps")

        rng = random.Random(cfg.seed)
        try:
            self.run_eval()
            for epoch in range(cfg.sft_epochs):
                rng.shuffle(examples)
                for j in range(0, len(examples), batch_size):
                    scale = self.governor.before_step()
                    t0 = time.time()
                    mx.reset_peak_memory()
                    stats = self.sft_step(examples[j : j + batch_size])
                    self.step += 1
                    metrics = {
                        **stats,
                        "train/epoch": epoch + j / len(examples),
                        "train/lr": float(self.optimizer.learning_rate),
                        "time/step_s": time.time() - t0,
                        "memory/peak_gb": mx.get_peak_memory() / 2**30,
                        "memory/system_free_gb": psutil.virtual_memory().available / 2**30,
                        "memory/batch_scale": scale,
                        "memory/paused_s_total": self.governor.paused_s,
                    }
                    self.tracker.log(metrics, self.step)
                    print(f"sft step {self.step:4d}/{total} | epoch {epoch + 1} | loss {stats['train/sft_loss']:.4f} | {metrics['time/step_s']:.0f}s | {metrics['memory/peak_gb']:.1f} GB")
                    if self.step % cfg.eval_every == 0 or self.step == total:
                        self.run_eval()
                    if self.step % cfg.save_every == 0 or self.step == total:
                        self.checkpoint(f"step{self.step:05d}")
        except KeyboardInterrupt:
            print("\ninterrupted: saving checkpoint")
            self.checkpoint(f"step{self.step:05d}")
        finally:
            self.watchdog.stop()
            self.tracker.finish()
        print(f"done. best {cfg.best_metric} {self.best_eval:.3f}; adapter for GRPO: {self.run_dir / 'checkpoints' / 'best'}")


def sft(config_path: str, overrides: list[str]) -> None:
    SFTTrainer(GRPOConfig.load(config_path, overrides)).train()
