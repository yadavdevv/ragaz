"""GRPO math: group-relative advantages, per-token log-probs and the clipped loss.

For each prompt we sample a group of G completions and score them. A completion's
advantage is how much better it did than its group's average. The loss pushes up
the log-probability of tokens in better-than-average completions and down for
worse ones, token by token:

    ratio      = exp(logp - logp_old)
    pg         = max(-A·ratio, -A·clip(ratio, 1 - clip_low, 1 + clip_high))
    kl         = exp(ref - logp) - (ref - logp) - 1          (k3 estimator)
    loss       = Σ_tokens (pg + β·kl) / (completion tokens in the whole batch)

Normalising by the batch's token count (not per sequence) avoids GRPO's length
bias (Dr. GRPO / DAPO). ``clip_high > clip_low`` is DAPO's "clip-higher".
"""

from dataclasses import dataclass

import mlx.core as mx
import numpy as np


def group_advantages(rewards: np.ndarray, group_size: int, scale: bool = True, eps: float = 1e-4) -> np.ndarray:
    """Reward minus its group's mean, optionally divided by the group's std."""
    r = np.asarray(rewards, dtype=np.float64).reshape(-1, group_size)
    adv = r - r.mean(axis=1, keepdims=True)
    if scale:
        adv = adv / (r.std(axis=1, keepdims=True) + eps)
    return adv.reshape(-1).astype(np.float32)


def duplicate_scale(keys: list[str], group_size: int, power: float) -> list[tuple[int, float]]:
    """(count in group, reward multiplier count^-power) for each sample.

    Identical pieces within a group share credit, so the policy can't win by
    collapsing onto one answer (run 2 did, and then every advantage was 0).
    """
    out = []
    for g in range(0, len(keys), group_size):
        group = keys[g : g + group_size]
        counts = {k: group.count(k) for k in group}
        out += [(counts[k], counts[k] ** -power) for k in group]
    return out


@dataclass
class MicroBatch:
    tokens: mx.array  # (B, T) prompt + completion, right-padded
    mask: mx.array  # (B, T - 1 - start) 1 where the target is a completion token
    advantages: mx.array  # (B,)
    start: int  # first target position that can be a completion token


def make_micro_batch(prompts: list[list[int]], completions: list[list[int]], advantages: list[float], pad_id: int) -> MicroBatch:
    lengths = [len(p) + len(c) for p, c in zip(prompts, completions)]
    width = max(lengths)
    tokens = np.full((len(prompts), width), pad_id, dtype=np.int32)
    start = min(len(p) for p in prompts) - 1
    mask = np.zeros((len(prompts), width - 1 - start), dtype=np.float32)
    for i, (p, c) in enumerate(zip(prompts, completions)):
        tokens[i, : len(p)] = p
        tokens[i, len(p) : len(p) + len(c)] = c
        # Target at input position t is token t + 1; completion tokens sit at len(p)..len(p)+len(c)-1.
        mask[i, len(p) - 1 - start : len(p) - 1 - start + len(c)] = 1
    return MicroBatch(mx.array(tokens), mx.array(mask), mx.array(np.asarray(advantages, dtype=np.float32)), start)


def lm_parts(model):
    """(body, head) so log-probs can skip the huge vocab projection on prompt tokens."""
    lm = getattr(model, "language_model", model)
    body = getattr(lm, "model", None)
    if body is None:
        return None, None
    if getattr(getattr(lm, "args", None), "tie_word_embeddings", False) or not hasattr(lm, "lm_head"):
        return body, body.embed_tokens.as_linear
    return body, lm.lm_head


def token_logprobs(model, tokens: mx.array, start: int) -> mx.array:
    """log p(token_{t+1} | tokens_≤t) for positions t ≥ start. Shape (B, T - 1 - start)."""
    body, head = lm_parts(model)
    if body is not None:
        logits = head(body(tokens[:, :-1])[:, start:])
    else:
        logits = model(tokens[:, :-1])[:, start:]
    logits = logits.astype(mx.float32)
    targets = tokens[:, start + 1 :]
    picked = mx.take_along_axis(logits, targets[..., None], axis=-1).squeeze(-1)
    return picked - mx.logsumexp(logits, axis=-1)


def grpo_loss(
    model,
    batch: MicroBatch,
    old_logp: mx.array | None,
    ref_logp: mx.array | None,
    n_tokens: int,
    beta: float,
    clip_low: float,
    clip_high: float,
):
    """Returns (loss, kl_sum, clipped_count) for one micro-batch."""
    logp = token_logprobs(model, batch.tokens, batch.start)
    old = mx.stop_gradient(logp) if old_logp is None else old_logp
    ratio = mx.exp(logp - old)
    adv = batch.advantages[:, None]
    unclipped = -adv * ratio
    clipped = -adv * mx.clip(ratio, 1 - clip_low, 1 + clip_high)
    per_token = mx.maximum(unclipped, clipped)

    kl = mx.zeros_like(logp)
    if ref_logp is not None and beta > 0:
        diff = ref_logp - logp
        kl = mx.exp(diff) - diff - 1
        per_token = per_token + beta * kl

    mask = batch.mask
    loss = (per_token * mask).sum() / n_tokens
    kl_sum = mx.stop_gradient((kl * mask).sum())
    clipped_count = mx.stop_gradient(((clipped > unclipped) * mask).sum())
    return loss, kl_sum, clipped_count


def sft_loss(model, batch: MicroBatch, n_tokens: int):
    """Plain next-token cross-entropy on completion tokens (for SFT before GRPO)."""
    logp = token_logprobs(model, batch.tokens, batch.start)
    return -(logp * batch.mask).sum() / n_tokens
