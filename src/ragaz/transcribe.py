"""Turn a pitch track of a real performance into sargam notes.

A pitch track is one frequency per frame (CompMusic: one every ~4.4 ms, 0 = silence).
Steps:
  1. Hz → cents above the performer's tonic (Sa).
  2. Snap each frame to the nearest semitone, but only if it lies within
     ``tolerance`` cents of it; glides between notes stay unassigned.
  3. Keep runs of the same semitone that last at least ``min_note_s`` seconds.
     Short runs are ornaments and passing tones, not notes.

The result is the sequence of *held* notes, which is what our verifier reasons
about. Durations are kept, but there is no rhythm or tala in a pitch track.
"""

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from ragaz.ragas import SWARAS


@dataclass
class HeldNote:
    swara: str
    octave: int
    start: float  # seconds
    duration: float  # seconds

    @property
    def token(self) -> str:
        return "." * max(0, -self.octave) + self.swara + "'" * max(0, self.octave)


def load_pitch(path: Path) -> tuple[np.ndarray, np.ndarray]:
    data = np.loadtxt(path)
    return data[:, 0], data[:, 1]


def load_tonic(path: Path) -> float:
    return float(np.loadtxt(path))


def transcribe(times: np.ndarray, hz: np.ndarray, tonic: float, tolerance: float = 35, min_note_s: float = 0.1) -> list[HeldNote]:
    voiced = hz > 0
    cents = np.full(hz.shape, np.nan)
    cents[voiced] = 1200 * np.log2(hz[voiced] / tonic)
    semis = np.round(cents / 100)
    close = np.abs(cents - semis * 100) <= tolerance
    label = np.where(voiced & close, semis, np.nan)

    hop = float(np.median(np.diff(times)))
    notes: list[HeldNote] = []
    i, n = 0, len(label)
    while i < n:
        if np.isnan(label[i]):
            i += 1
            continue
        j = i
        while j + 1 < n and label[j + 1] == label[i]:
            j += 1
        duration = (j - i + 1) * hop
        if duration >= min_note_s:
            semi = int(label[i])
            octave, pc = divmod(semi, 12)
            note = HeldNote(SWARAS[pc], octave, float(times[i]), duration)
            prev = notes[-1] if notes else None
            if prev and prev.swara == note.swara and prev.octave == note.octave and note.start - (prev.start + prev.duration) < 0.15:
                prev.duration = note.start + note.duration - prev.start  # a brief wobble inside one note
            else:
                notes.append(note)
        i = j + 1
    return notes


def to_notation(notes: list[HeldNote], per_bar: int = 4, bars: int = 8) -> str:
    """Lay held notes out as our notation (4 per bar), so the verifier can read them.

    Bar and beat structure here is artificial (a pitch track has no tala), so
    only the note-level scores are meaningful: allowed, emphasis, melody, pakad.
    """
    tokens = [n.token for n in notes[: per_bar * bars]]
    lines = []
    for b in range(0, len(tokens), per_bar * 4):
        chunk = tokens[b : b + per_bar * 4]
        lines.append(" | ".join(" ".join(chunk[k : k + per_bar]) for k in range(0, len(chunk), per_bar)) + " |")
    return "\n".join(lines)
