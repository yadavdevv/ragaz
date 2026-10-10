import mlx.core as mx
import numpy as np
import pytest

from ragaz.config import GRPOConfig
from ragaz.grpo import duplicate_scale, group_advantages, grpo_loss, make_micro_batch


def test_advantages_are_relative_to_the_group():
    adv = group_advantages(np.array([1.0, 0.0, 0.5, 0.5, 0.2, 0.2, 0.2, 0.2]), group_size=4, scale=False)
    assert adv[:4] == pytest.approx([0.5, -0.5, 0.0, 0.0])
    assert adv[4:] == pytest.approx([0, 0, 0, 0])  # identical rewards teach nothing


def test_scaled_advantages_have_unit_std():
    adv = group_advantages(np.array([0.9, 0.1, 0.4, 0.6]), group_size=4, scale=True)
    assert adv.mean() == pytest.approx(0, abs=1e-6)
    assert adv.std() == pytest.approx(1, abs=1e-3)


def test_micro_batch_masks_only_completion_tokens():
    b = make_micro_batch([[1, 2, 3], [1, 2]], [[7, 8], [9]], [1.0, -1.0], pad_id=0)
    assert b.tokens.tolist() == [[1, 2, 3, 7, 8], [1, 2, 9, 0, 0]]
    assert b.start == 1  # shortest prompt is 2 tokens: first possible completion target is position 1
    # Targets from position 1: row 0 -> [3, 7, 8, 0][:3] = 3,7,8 ; row 1 -> 9, 0, 0
    assert b.mask.tolist() == [[0, 1, 1], [1, 0, 0]]


class TinyLM:
    """Bigram model: logits depend only on the current token. Enough to test the loss."""

    def __init__(self, vocab=12):
        self.table = mx.random.normal((vocab, vocab), key=mx.random.key(0))

    def __call__(self, tokens):
        return self.table[tokens]


def test_loss_sign_follows_advantage():
    model = TinyLM()
    b = make_micro_batch([[1, 2]], [[3, 4]], [1.0], pad_id=0)
    loss, kl, clipped = grpo_loss(model, b, None, None, n_tokens=2, beta=0.0, clip_low=0.2, clip_high=0.28)
    # On-policy, ratio = 1: loss = -A · (mean ratio) = -1 per token, normalised by token count.
    assert loss.item() == pytest.approx(-1.0)
    assert kl.item() == 0 and clipped.item() == 0


def test_kl_is_zero_against_itself():
    from ragaz.grpo import token_logprobs

    model = TinyLM()
    b = make_micro_batch([[1, 2]], [[3, 4]], [0.0], pad_id=0)
    ref = token_logprobs(model, b.tokens, b.start)
    _, kl, _ = grpo_loss(model, b, None, ref, n_tokens=2, beta=0.1, clip_low=0.2, clip_high=0.28)
    assert kl.item() == pytest.approx(0, abs=1e-6)


def test_config_overrides_and_unknown_keys(tmp_path):
    path = tmp_path / "c.yaml"
    path.write_text("steps: 10\nlr: 1.0e-5\n")
    cfg = GRPOConfig.load(path, ["steps=3", "ragas=[yaman]"])
    assert cfg.steps == 3 and cfg.lr == 1e-5 and cfg.ragas == ["yaman"]
    with pytest.raises(ValueError):
        GRPOConfig.load(path, ["stepz=3"])


def test_duplicates_share_credit_within_a_group_only():
    keys = ["a", "a", "b", "c", "a", "d", "e", "f"]
    scales = duplicate_scale(keys, group_size=4, power=0.5)
    assert [c for c, _ in scales] == [2, 2, 1, 1, 1, 1, 1, 1]  # second group's "a" is separate
    assert scales[0][1] == pytest.approx(2**-0.5)
    assert scales[2][1] == 1.0


def test_sft_loss_is_mean_negative_logprob_of_completion():
    from ragaz.grpo import sft_loss, token_logprobs

    model = TinyLM()
    b = make_micro_batch([[1, 2]], [[3, 4]], [1.0], pad_id=0)
    expected = -(token_logprobs(model, b.tokens, b.start) * b.mask).sum().item() / 2
    assert sft_loss(model, b, n_tokens=2).item() == pytest.approx(expected)


def test_sft_targets_use_the_fenced_format_extract_reads():
    from ragaz.notation import extract
    from ragaz.sft import completion_text

    assert extract(completion_text("S R G P | D P G R |")) == "S R G P | D P G R |"


def test_swapping_lora_weights_restores_the_reference_exactly():
    """The trainer computes reference log-probs by swapping in the starting LoRA weights."""
    import mlx.nn as nn
    from mlx.utils import tree_flatten
    from mlx_lm.tuner.lora import LoRALinear

    layer = LoRALinear.from_base(nn.Linear(8, 8), r=4)
    layer.freeze()
    layer.unfreeze(keys=["lora_a", "lora_b"])
    x = mx.random.normal((2, 8), key=mx.random.key(1))
    start = dict(tree_flatten(layer.trainable_parameters()))
    ref_out = layer(x)
    layer.update({"lora_b": mx.ones_like(layer.lora_b)})  # "training" changes the adapter
    trained = list(tree_flatten(layer.trainable_parameters()))
    assert not mx.allclose(layer(x), ref_out)
    layer.load_weights(list(start.items()), strict=False)
    assert mx.allclose(layer(x), ref_out)
    layer.load_weights(trained, strict=False)
    assert not mx.allclose(layer(x), ref_out)
