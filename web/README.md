# ragaz · web

The site for ragaz, live at **[ragaz-black.vercel.app](https://ragaz-black.vercel.app/)**. Next.js 14 (app router), TypeScript, Tailwind, zustand, GSAP + Lenis. Everything runs in the browser: there is no server and no model at runtime. The pieces are pre-generated, and the verifier is a TypeScript port of the Python one.

## Run it

```bash
npm install
npm run dev          # http://localhost:3123
npm run build        # production build
```

Node 20 or newer.

## Site data

Pieces, raga rules, real-music profiles, training curves and recordings are exported from the Python side into `public/data/*.json` and `public/audio/*.mp3`:

```bash
cd ..                                    # repo root
uv run python scripts/export_web.py      # needs ffmpeg for the recordings
```

## Verifier parity

`lib/verify.ts` must score exactly as `src/ragaz/verify.py` does. To check it against the exported cases (currently 198/198):

```bash
npx tsx scripts/parity.ts
```

## Pages

| Route | What it is |
|---|---|
| `/` | The story: hero miniature, newest recordings (voice / flute), the ensemble, the ragas, a ragamala garland, how it learned, findings, results |
| `/listen` | Every piece by model and raga (`?model=v5e`) |
| `/ragas/[key]` | One raga: rules, pakad, masters' profiles, model pieces |
| `/compose` | Write sargam, hear it, score it with the reward |
| `/instruments` | Full harmonium (scale changer, drones, keyboard), tanpura, tabla |
| `/docs` | Notation and reference |

## Layout

```
app/            routes (above), layout, globals.css, icon.svg
components/     Miniature (hero painting), Ornament (borders, rubrics), Instruments,
                FullHarmonium, Ridgeline, Bhatkhande (notation), Player, Plate, home/ (homepage sections)
lib/
  audio.ts      Web Audio engine: flute, voice, harmonium reeds, tanpura, tabla
  verify.ts     the reward, ported from Python
  site.ts       data store (zustand) over public/data
  sweep.ts      hover / drag to play
  art.ts, garland.ts   ragamala paintings and their credits
public/         data/, audio/, art/
scripts/        parity.ts
```

## Theme

Tokens live in `tailwind.config.ts`:

- **Paper:** `paper` #F1E6CF, `paper2`, `leaf`, `rule`
- **Ink:** one blue-black, `kajal` #131A2B, with `kajal2` and `sepia`
- **Accents:** `sindoor` #B23A22, `gulal` #D9705A, `sona` #A8853C

Fonts are Tiro Devanagari Hindi for display and Newsreader for text.

## Deploy

On Vercel, import the repo and set **Root Directory** to `web`. The framework preset (Next.js) is detected; no environment variables are needed. Every push to `main` deploys.
