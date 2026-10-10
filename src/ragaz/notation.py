"""Parse plain-text sargam notation.

    S R G M P D N     shuddh swaras (M = tivra Ma)
    r g m d n         komal swaras (m = shuddh Ma)
    .S  ..S           lower octave(s)      S'  S''   upper octave(s)
    -                 hold the previous note for one more beat
    |  or newline     bar line

Each whitespace-separated token is one beat. A token with several notes
(``GR``, ``.DS``) splits the beat equally between them.
"""

import re
from dataclasses import dataclass, field

from ragaz.ragas import SWARAS

NOTE_RE = re.compile(r"(\.*)([SrRgGmMPdDnN])('*)")
BEAT_RE = re.compile(rf"(?:{NOTE_RE.pattern})+")


@dataclass
class Note:
    swara: str  # pitch class, e.g. "G"
    octave: int  # 0 = middle, -1 = lower, +1 = upper
    start: float  # in beats from the beginning
    duration: float  # in beats
    bar: int

    @property
    def semitones(self) -> int:
        """Semitones above middle Sa."""
        return SWARAS.index(self.swara) + 12 * self.octave


@dataclass
class Composition:
    notes: list[Note] = field(default_factory=list)
    bars: list[list[str]] = field(default_factory=list)  # tokens per bar
    invalid: list[str] = field(default_factory=list)  # tokens that didn't parse

    @property
    def beats(self) -> int:
        return sum(len(bar) for bar in self.bars)

    @property
    def token_count(self) -> int:
        return self.beats + len(self.invalid)


def parse(text: str) -> Composition:
    comp = Composition()
    for line in text.splitlines():
        for segment in line.split("|"):
            tokens = segment.split()
            if not tokens:
                continue
            bar_index = len(comp.bars)
            bar = []
            for token in tokens:
                if token == "-":
                    if comp.notes:
                        comp.notes[-1].duration += 1
                        bar.append(token)
                    else:
                        comp.invalid.append(token)  # hold with nothing to hold
                elif BEAT_RE.fullmatch(token):
                    parts = NOTE_RE.findall(token)
                    beat_start = comp.beats + len(bar)
                    step = 1 / len(parts)
                    for i, (dots, swara, ticks) in enumerate(parts):
                        comp.notes.append(
                            Note(
                                swara=swara,
                                octave=len(ticks) - len(dots),
                                start=beat_start + i * step,
                                duration=step,
                                bar=bar_index,
                            )
                        )
                    bar.append(token)
                else:
                    comp.invalid.append(token)
            if bar:
                comp.bars.append(bar)
    return comp


FENCE_RE = re.compile(r"```[a-zA-Z]*\n(.*?)```", re.DOTALL)


def extract(text: str) -> str:
    """Pull the notation out of a model's reply.

    Prefers the first fenced code block; otherwise keeps lines with a bar line.
    """
    if match := FENCE_RE.search(text):
        return match.group(1).strip()
    lines = [line.strip() for line in text.splitlines() if "|" in line]
    return "\n".join(lines)
