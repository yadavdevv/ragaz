# ragaz

Teach a small LLM Hindustani ragas with GRPO, where **the raga grammar is the reward**. Runs on a MacBook.

Plan: [v0](../ideas/ragaz/v0-plan.md) · Long-term design: [deep dive](../ideas/ragaz/deep-dive.md)

## Status
- [x] Step 1: raga rules, notation parser, verifier (reward function) with tests
- [x] Step 2: synth: notation → WAV (flute-like lead over a tanpura drone)
- [ ] Step 3: baseline: how well does an untrained small LLM write ragas?
- [ ] Step 4: GRPO on MLX
- [ ] Step 5: before/after comparison

## Quick start
```bash
uv sync
uv run pytest -q
uv run ragaz ragas
uv run ragaz verify examples/yaman.txt --raga yaman
uv run ragaz render examples/yaman.txt --raga yaman -o out/yaman.wav --play
```

## Notation
```
S R G M P D N     shuddh (M = tivra Ma)        .S  lower octave
r g m d n         komal  (m = shuddh Ma)       S'  upper octave
-                 hold one more beat           |   bar line (or newline)
GR                two notes in one beat
```
One Teentaal cycle is 4 bars of 4 beats:
`G R S .D | S R G - | P G D P | G R S - |`

## Reward
```
reward = format · allowed² · variety · (0.5·tala + 0.5·emphasis)
```
| Part | Checks |
|---|---|
| format | Every token parses |
| allowed | No notes outside the raga (squared: wrong notes hurt a lot) |
| variety | Uses the raga's notes, no repeated bars, no long runs of one note, not mostly holds |
| tala | 4 beats per bar, whole cycles, ends on Sa or a resting note (nyas) |
| emphasis | Vadi and samvadi get a realistic share of time (a band, not "more is better") |

Known blind spot: a plain scale run scores ~1.0. Pakad (signature phrase) rewards fix that in v1.

## Layout
```
src/ragaz/
  ragas.yaml   raga rules (notes, vadi/samvadi, nyas, pakad, time, tanpura tuning)
  ragas.py     loader + validation
  notation.py  sargam parser + extracting notation from model replies
  verify.py    the reward
  render.py    numpy synth (just intonation, glides, vibrato, jawari-style tanpura)
  cli.py       ragaz ragas | verify | render
examples/      hand-written compositions (score ~1.0)
tests/
```
