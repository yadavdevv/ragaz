// The melody line: a piece drawn as its pitch contour (time across, pitch up).
// One point per beat-length note, plateaus for held notes, Catmull-Rom smoothing.

import { type Note, semis } from "./music";

export type Pt = [number, number];

export function linePoints(notes: Note[], x: (t: number) => number, y: (s: number) => number): Pt[] {
  const pts: Pt[] = [];
  for (const n of notes) {
    const s = semis(n);
    if (n.d >= 2) pts.push([x(n.t + 0.4), y(s)], [x(n.t + n.d - 0.4), y(s)]);
    else pts.push([x(n.t + n.d / 2), y(s)]);
  }
  return pts;
}

export function pathFrom(pts: Pt[]) {
  if (!pts.length) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  const k = 1 / 6;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    if (p1[1] === p2[1]) {
      d += ` L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      continue;
    }
    const t1 = p0[1] === p1[1] ? 0 : (p2[1] - p0[1]) * k;
    const t2 = p2[1] === p3[1] ? 0 : (p3[1] - p1[1]) * k;
    d += ` C ${(p1[0] + (p2[0] - p0[0]) * k).toFixed(1)} ${(p1[1] + t1).toFixed(1)}, ${(p2[0] - (p3[0] - p1[0]) * k).toFixed(1)} ${(p2[1] - t2).toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Draw the same smooth line on a canvas context. */
export function strokeLine(g: CanvasRenderingContext2D, pts: Pt[]) {
  if (!pts.length) return;
  g.moveTo(pts[0][0], pts[0][1]);
  const k = 1 / 6;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    if (p1[1] === p2[1]) {
      g.lineTo(p2[0], p2[1]);
      continue;
    }
    const t1 = p0[1] === p1[1] ? 0 : (p2[1] - p0[1]) * k;
    const t2 = p2[1] === p3[1] ? 0 : (p3[1] - p1[1]) * k;
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + t1, p2[0] - (p3[0] - p1[0]) * k, p2[1] - t2, p2[0], p2[1]);
  }
}

export const pieceEnd = (notes: Note[]) => notes[notes.length - 1].t + notes[notes.length - 1].d;
export function pitchRange(notes: Note[], pad = 1): [number, number] {
  const ss = notes.map(semis);
  return [Math.min(...ss) - pad, Math.max(...ss) + pad];
}
