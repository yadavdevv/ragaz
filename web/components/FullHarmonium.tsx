"use client";

// A full harmonium, as Indian harmoniums are built: 3¼ octaves (42 keys, C to F) in piano
// layout, tuned in equal temperament; a teak case with folded bellows behind the keys and
// brass stop knobs in front. Keys sound while the pointer is over them, so you can sweep runs.
// A scale changer sets which key is Sa; the sargam is printed on each key; drone stops hold
// Sa and Pa; the coupler doubles every note an octave below.

import { useEffect, useMemo, useRef, useState } from "react";
import { getEngine } from "@/lib/audio";
import { SWARAS } from "@/lib/music";
import { tick, useSite } from "@/lib/site";
import { useSweep } from "@/lib/sweep";

const LOW = 48, HIGH = 89; // C3 … F4+ (42 keys)
const BLACK = new Set([1, 3, 6, 8, 10]);
const WESTERN = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SARGAM: Record<string, string> = { S: "सा", r: "रे", R: "रे", g: "ग", G: "ग", m: "म", M: "म", P: "प", d: "ध", D: "ध", n: "नि", N: "नि" };
const LATIN: Record<string, string> = { S: "Sa", r: "re", R: "Re", g: "ga", G: "Ga", m: "Ma", M: "Ma′", P: "Pa", d: "dha", D: "Dha", n: "ni", N: "Ni" };
// computer keys: one octave and a fourth from the middle Sa
const KEYMAP = "awsedftgyhujkolp;'";
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const NONE: never[] = [];

export function FullHarmonium() {
  const data = useSite((s) => s.data);
  const ragas = data?.allRagas ?? NONE;
  const [saPc, setSaPc] = useState(0); // which key is Sa (scale changer)
  const [raga, setRaga] = useState<string>("none");
  const [labels, setLabels] = useState<"deva" | "latin" | "western">("deva");
  const [coupler, setCoupler] = useState(false);
  const [drones, setDrones] = useState({ sa: false, pa: false });
  const [held, setHeld] = useState<Set<number>>(new Set());
  const [shift, setShift] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const saMidi = 60 + saPc; // middle Sa

  const keys = useMemo(() => Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i), []);
  const whites = keys.filter((m) => !BLACK.has(m % 12));
  const swaraOf = (m: number) => SWARAS[(((m - saMidi) % 12) + 12) % 12];
  const octaveOf = (m: number) => Math.floor((m - saMidi) / 12);
  const allowed = useMemo(() => {
    const r = ragas.find((x) => x.key === raga);
    return r ? new Set(r.notes) : null;
  }, [ragas, raga]);

  const on = async (m: number) => {
    const eng = getEngine();
    await eng.resume();
    eng.reedOn(`fh-${m}`, hz(m));
    if (coupler) eng.reedOn(`fh-${m}-c`, hz(m - 12), 0.7);
    setHeld((h) => new Set(h).add(m));
  };
  const off = (m: number) => {
    const eng = getEngine();
    eng.reedOff(`fh-${m}`, 0.05);
    eng.reedOff(`fh-${m}-c`, 0.05);
    setHeld((h) => {
      const n = new Set(h);
      n.delete(m);
      return n;
    });
  };
  useSweep(root, (id) => on(+id), (id) => off(+id));

  // computer keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || (e.target as HTMLElement)?.closest?.("input,textarea,select")) return;
      if (e.key === "z") return setShift((s) => Math.max(-1, s - 1));
      if (e.key === "x") return setShift((s) => Math.min(1, s + 1));
      const i = KEYMAP.indexOf(e.key.toLowerCase());
      if (i < 0) return;
      const m = saMidi + i + 12 * shift;
      if (m >= LOW && m <= HIGH) on(m);
    };
    const up = (e: KeyboardEvent) => {
      const i = KEYMAP.indexOf(e.key.toLowerCase());
      if (i < 0) return;
      off(saMidi + i + 12 * shift);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }); // re-bind so the latest Sa, shift and coupler apply

  // drone stops: sustained reeds on low Sa and low Pa
  useEffect(() => {
    const eng = getEngine();
    if (drones.sa) {
      eng.resume().then(() => eng.reedOn("drone-sa", hz(saMidi - 12), 0.55));
    } else eng.reedOff("drone-sa", 0.1);
    if (drones.pa) {
      eng.resume().then(() => eng.reedOn("drone-pa", hz(saMidi - 5), 0.45));
    } else eng.reedOff("drone-pa", 0.1);
  }, [drones, saMidi]);
  useEffect(() => () => getEngine().reedsOff(), []);

  const air = held.size + (drones.sa ? 1 : 0) + (drones.pa ? 1 : 0);
  const label = (m: number) => {
    const s = swaraOf(m), o = octaveOf(m);
    if (labels === "western") return { main: WESTERN[m % 12], dot: 0 };
    return { main: labels === "deva" ? SARGAM[s] : LATIN[s], dot: o, komal: "rgdn".includes(s), tivra: s === "M" };
  };
  const whiteW = 100 / whites.length;

  return (
    <div className="select-none">
      {/* controls, as the stops and scale changer of a real instrument */}
      <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-4 font-sans text-[14px] text-sepia">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] uppercase tracking-[0.18em]">Scale changer · Sa is</span>
          <select value={saPc} onChange={(e) => { tick("soft"); getEngine().reedsOff(); setHeld(new Set()); setSaPc(+e.target.value); }} className="rounded-full border border-rule bg-leaf px-4 py-2 text-kajal">
            {WESTERN.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] uppercase tracking-[0.18em]">Show a raga's notes</span>
          <select value={raga} onChange={(e) => { tick("soft"); setRaga(e.target.value); }} className="rounded-full border border-rule bg-leaf px-4 py-2 text-kajal">
            <option value="none">None</option>
            {ragas.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] uppercase tracking-[0.18em]">Labels</span>
          <div className="flex rounded-full border border-rule p-1">
            {(["deva", "latin", "western"] as const).map((l) => (
              <button key={l} onClick={() => { tick("soft"); setLabels(l); }} className={`rounded-full px-3 py-1 ${labels === l ? "bg-kajal text-paper" : "text-kajal"}`}>{l === "deva" ? "सा रे ग" : l === "latin" ? "Sa Re Ga" : "C D E"}</button>
            ))}
          </div>
        </div>
      </div>

      <div ref={root} className="relative">
        {/* the case */}
        <div className="rounded-[10px] p-3 shadow-[0_40px_60px_-34px_rgba(19,26,43,.7)] sm:p-5"
          style={{ background: "linear-gradient(180deg,#7A2E1C,#5E1F14 55%,#4A170F)", backgroundImage: "repeating-linear-gradient(92deg, rgba(0,0,0,.08) 0 2px, transparent 2px 9px), linear-gradient(180deg,#7A2E1C,#5E1F14 55%,#4A170F)" }}>
          {/* bellows, behind the keys: folds draw closer as air is used */}
          <div className="relative mb-3 h-16 overflow-hidden rounded-md border-2 border-[#3B120B] bg-[#3B120B] sm:h-20">
            <div className="absolute inset-0 flex flex-col justify-between transition-transform duration-700 ease-out" style={{ transform: `scaleY(${Math.max(0.55, 1 - air * 0.07)})`, transformOrigin: "top" }}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="h-[7px] w-full" style={{ background: i % 2 ? "#E8D8BA" : "#F1E6CF", boxShadow: "inset 0 -2px 0 rgba(19,26,43,.35)" }} />
              ))}
            </div>
            <div className="absolute inset-y-0 right-3 my-auto h-7 w-16 rounded border border-[#A8853C] bg-[#5E1F14]" title="bellows latch" />
          </div>

          {/* stops */}
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3 px-1 font-sans text-[12.5px] text-paper/80">
            {([["sa", "Drone · Sa"], ["pa", "Drone · Pa"]] as const).map(([k, l]) => (
              <button key={k} data-cursor={drones[k] ? "Stop" : "Pull"} onClick={() => { tick(); setDrones((d) => ({ ...d, [k]: !d[k] })); }} className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#A8853C] transition ${drones[k] ? "bg-sona shadow-[0_0_14px_rgba(168,133,60,.8)]" : "bg-[#3B120B]"}`}><span className="h-2.5 w-2.5 rounded-full bg-paper/80" /></span>
                {l}
              </button>
            ))}
            <button data-cursor={coupler ? "Off" : "On"} onClick={() => { tick(); setCoupler((c) => !c); }} className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#A8853C] transition ${coupler ? "bg-sona shadow-[0_0_14px_rgba(168,133,60,.8)]" : "bg-[#3B120B]"}`}><span className="h-2.5 w-2.5 rounded-full bg-paper/80" /></span>
              Coupler · octave below
            </button>
            <span className="ml-auto hidden text-paper/55 md:inline">keys A–’ · Z / X shift octave {shift ? `(${shift > 0 ? "+" : ""}${shift})` : ""}</span>
          </div>

          {/* the keyboard */}
          <div className="no-scrollbar overflow-x-auto rounded-md bg-[#2A0D08] p-1.5">
            <div className="relative h-44 min-w-[760px] sm:h-56 lg:h-64">
              {whites.map((m, i) => {
                const l = label(m), down = held.has(m), sa = (m - saMidi) % 12 === 0, inRaga = allowed?.has((((m - saMidi) % 12) + 12) % 12);
                return (
                  <div key={m} data-sweep={m} data-cursor="Play"
                    className={`absolute top-0 flex h-full cursor-pointer flex-col items-center justify-end rounded-b-[5px] border border-[#cdbb98] pb-2 transition-all duration-75 ${down ? "translate-y-[3px] bg-[#efe2c4] shadow-[inset_0_-2px_0_#cdbb98]" : "bg-[#FBF5E6] shadow-[inset_0_-7px_0_#e9dcc0]"} ${allowed && !inRaga ? "opacity-60" : ""}`}
                    style={{ left: `${i * whiteW}%`, width: `calc(${whiteW}% - 2px)` }}>
                    <Label {...l} sa={sa} inRaga={!!(allowed && inRaga)} />
                  </div>
                );
              })}
              {keys.filter((m) => BLACK.has(m % 12)).map((m) => {
                const wi = whites.findIndex((w) => w > m);
                const l = label(m), down = held.has(m), inRaga = allowed?.has((((m - saMidi) % 12) + 12) % 12);
                return (
                  <div key={m} data-sweep={m} data-cursor="Play"
                    className={`absolute top-0 z-10 flex h-[62%] cursor-pointer flex-col items-center justify-end rounded-b-[4px] pb-2 transition-all duration-75 ${down ? "translate-y-[2px] bg-kajal2" : "bg-kajal shadow-[inset_0_-5px_0_#0E1322]"} ${allowed && !inRaga ? "opacity-70" : ""}`}
                    style={{ left: `calc(${wi * whiteW}% - ${whiteW * 0.31}%)`, width: `${whiteW * 0.6}%` }}>
                    <Label {...l} dark inRaga={!!(allowed && inRaga)} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 font-sans text-[13px] text-sepia">Move across the keys to play; on a phone, slide a finger. Middle Sa has a vermilion mark.</p>
    </div>
  );
}

function Label({ main, dot = 0, komal, tivra, sa, dark, inRaga }: { main: string; dot?: number; komal?: boolean; tivra?: boolean; sa?: boolean; dark?: boolean; inRaga?: boolean }) {
  return (
    <span className={`flex flex-col items-center font-display leading-none ${dark ? "text-[11px] text-paper/80 sm:text-[13px]" : "text-[13px] text-kajal sm:text-[16px]"}`}>
      {inRaga && <span className="mb-1.5 h-2 w-2 rounded-full bg-sindoor" />}
      <span className="h-2 text-[9px] leading-none">{dot > 0 ? "•".repeat(dot) : ""}</span>
      <span className={`relative ${komal ? "underline decoration-1 underline-offset-[3px]" : ""}`}>
        {tivra && <span className="absolute -top-1.5 left-1/2 h-1.5 w-px -translate-x-1/2 bg-current" />}
        {main}
      </span>
      <span className="h-2 text-[9px] leading-none">{dot < 0 ? "•".repeat(-dot) : ""}</span>
      {sa && dot === 0 && <span className="mt-1 h-[3px] w-4 rounded-full bg-sindoor" />}
    </span>
  );
}
