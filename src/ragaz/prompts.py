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
# v5: shows quick notes (several per beat) and held notes, as real performances do.
EXAMPLE_RHYTHM = "SR mP D - | P m R - | Rm PD P m | R - S - |"
RHYTHM_LINE = "- Real phrases mix quick runs and long notes: put 2–4 notes in one beat for fast phrases (GRSR), hold important notes for several beats (G - - -).\n"

FORMAT = """Write it in sargam notation:
- Swaras: S R G M P D N (M = tivra Ma). Komal swaras are lowercase: r g m d n (m = shuddh Ma).
- A dot before a note means lower octave (.N); an apostrophe after means upper octave (S').
- `-` holds the previous note for one more beat. Two notes in one beat are written together (GR).
{rhythm}- Every bar has exactly 4 beats, separated by `|`. Write {bars} bars ({cycles} cycles of Teentaal), 4 bars per line.

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


def build_prompt(raga: Raga, variant: str = "bare", bars: int = 8, rhythm: bool = False) -> str:
    parts = [f"Compose a short melody in Raga {raga.name} (Hindustani classical music) in Teentaal."]
    if variant == "hinted":
        parts.append(hint(raga))
    elif variant != "bare":
        raise ValueError(f"unknown prompt variant {variant!r}")
    cycles = {4: "one", 8: "two", 12: "three", 16: "four"}.get(bars, str(bars // 4))
    parts.append(
        FORMAT.format(example=EXAMPLE_RHYTHM if rhythm else EXAMPLE, bars=bars, cycles=cycles, rhythm=RHYTHM_LINE if rhythm else "")
    )
    return "\n\n".join(parts)


def chat_prompt(tokenizer, raga: Raga, variant: str = "bare", bars: int = 8, rhythm: bool = False) -> list[int]:
    """Token ids for the chat-formatted prompt, with thinking turned off."""
    messages = [{"role": "user", "content": build_prompt(raga, variant, bars, rhythm)}]
    return tokenizer.apply_chat_template(messages, add_generation_prompt=True, enable_thinking=False)


EXAMPLE_BARS = {tuple(bar) for bar in parse(EXAMPLE).bars} | {tuple(bar) for bar in parse(EXAMPLE_RHYTHM).bars}


def copy_fraction(notation: str) -> float:
    """Share of bars copied verbatim from the format example (a shortcut RL would exploit)."""
    bars = parse(notation).bars
    return sum(tuple(bar) in EXAMPLE_BARS for bar in bars) / len(bars) if bars else 0.0
