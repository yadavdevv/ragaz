"use client";

// A piece printed the way Bhatkhande's books print a bandish: one row per cycle of
// teentaal, Devanagari swaras, ऽ for a held beat, dots for lower/upper octave, a line
// under komal notes and a stroke over tivra Ma, and the tala signs × २ ० ३ beneath.

import type { Note } from "@/lib/music";

const DEVA: Record<string, string> = { S: "सा", r: "रे", R: "रे", g: "ग", G: "ग", m: "म", M: "म", P: "प", d: "ध", D: "ध", n: "नि", N: "नि" };
const SIGNS: Record<number, string> = { 0: "×", 4: "२", 8: "०", 12: "३" };
const THEKA = ["धा", "धिं", "धिं", "धा", "धा", "धिं", "धिं", "धा", "धा", "तिं", "तिं", "ता", "ता", "धिं", "धिं", "धा"];

function Swar({ n }: { n: Note }) {
  return (
    <span className="relative inline-block px-[1px] leading-none">
      {n.o > 0 && <span className="absolute -top-[0.35em] left-1/2 -translate-x-1/2 text-[0.5em]">•</span>}
      {n.s === "M" && <span className="absolute -top-[0.45em] left-1/2 h-[0.38em] w-px -translate-x-1/2 bg-current" />}
      <span className={"rgdn".includes(n.s) ? "underline decoration-1 underline-offset-[0.25em]" : ""}>{DEVA[n.s]}</span>
      {n.o < 0 && <span className="absolute -bottom-[0.55em] left-1/2 -translate-x-1/2 text-[0.5em]">•</span>}
    </span>
  );
}

export function Bhatkhande({ notes, beats, head = null, theka = true, className = "" }: { notes: Note[]; beats: number; head?: number | null; theka?: boolean; className?: string }) {
  const cells: Note[][] = Array.from({ length: beats }, () => []);
  for (const n of notes) cells[Math.floor(n.t + 1e-6)]?.push(n);
  const rows = Array.from({ length: Math.ceil(beats / 16) }, (_, r) => r);
  const cur = head === null ? -1 : Math.floor(head);
  return (
    <div className={`font-deva text-kajal ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-center">
          <tbody>
            {theka && (
              <tr className="text-[13px] text-kajal/45">
                {THEKA.map((b, i) => <td key={i} className={`pb-2 ${i % 4 === 0 && i ? "border-l border-kajal/25" : ""}`}>{b}</td>)}
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r} className="border-t border-kajal/15">
                {Array.from({ length: 16 }, (_, k) => {
                  const b = r * 16 + k;
                  if (b >= beats) return <td key={k} />;
                  const ns = cells[b];
                  const on = b === cur;
                  return (
                    <td key={k} className={`h-14 text-[22px] transition-colors duration-200 ${k % 4 === 0 && k ? "border-l border-kajal/25" : ""} ${on ? "bg-gulal/60" : ""}`}>
                      {ns.length === 0 ? <span className="text-kajal/50">ऽ</span> : ns.length === 1 ? <Swar n={ns[0]} /> : (
                        <span className="inline-flex flex-col items-center">
                          <span className="text-[0.8em]">{ns.map((n, i) => <Swar key={i} n={n} />)}</span>
                          <svg viewBox="0 0 40 8" className="-mt-0.5 h-2 w-8"><path d="M2 2 Q20 9 38 2" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="text-[14px] text-sindoor">
              {Array.from({ length: 16 }, (_, k) => <td key={k} className={`pt-2 ${k % 4 === 0 && k ? "border-l border-kajal/25" : ""}`}>{SIGNS[k] ?? ""}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
