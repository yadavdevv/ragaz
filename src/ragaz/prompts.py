"""Prompts asking a model to compose in a raga.

Two variants:
  bare    only the raga's name: tests what the model already knows
  hinted  also lists the raga's notes, vadi/samvadi and resting notes

The format example is one line in Raga Durga, which is not a training raga. An
earlier placeholder line (``x x x x | ...``) was copied literally by Qwen3-0.6B.
"""

from ragaz.notation import parse
from ragaz.ragas import SWARAS, Raga

EXAMPLE = "S R m P | D - P m | R m P D | m R S - |"

FORMAT = """Write it in sargam notation:
- Swaras: S R G M P D N (M = tivra Ma). Komal swaras are lowercase: r g m d n (m = shuddh Ma).
- A dot before a note means lower octave (.N); an apostrophe after means upper octave (S').
- `-` holds the previous note for one more beat. Two notes in one beat are written together (GR).
- Every bar has exactly 4 beats, separated by `|`. Write 8 bars (two cycles of Teentaal), 4 bars per line.

Format example only (Raga Durga, a different raga, do not copy its notes):
```
{example}
```

Reply with only the notation inside a code block."""


def hint(raga: Raga) -> str:
    notes = " ".join(sorted(raga.notes, key=SWARAS.index))
    nyas = " ".join(sorted(raga.nyas, key=SWARAS.index))
    return (
        f"Raga {raga.name} uses only these notes: {notes}. "
        f"Vadi (most important note): {raga.vadi}. Samvadi: {raga.samvadi}. "
        f"Phrases often rest on: {nyas}."
    )


def build_prompt(raga: Raga, variant: str = "bare") -> str:
    parts = [f"Compose a short melody in Raga {raga.name} (Hindustani classical music) in Teentaal."]
    if variant == "hinted":
        parts.append(hint(raga))
    elif variant != "bare":
        raise ValueError(f"unknown prompt variant {variant!r}")
    parts.append(FORMAT.format(example=EXAMPLE))
    return "\n\n".join(parts)


def chat_prompt(tokenizer, raga: Raga, variant: str = "bare") -> list[int]:
    """Token ids for the chat-formatted prompt, with thinking turned off."""
    messages = [{"role": "user", "content": build_prompt(raga, variant)}]
    return tokenizer.apply_chat_template(messages, add_generation_prompt=True, enable_thinking=False)


EXAMPLE_BARS = {tuple(bar) for bar in parse(EXAMPLE).bars}


def copy_fraction(notation: str) -> float:
    """Share of bars copied verbatim from the format example (a shortcut RL would exploit)."""
    bars = parse(notation).bars
    return sum(tuple(bar) in EXAMPLE_BARS for bar in bars) / len(bars) if bars else 0.0
