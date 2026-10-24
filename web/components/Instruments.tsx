"use client";

// The ensemble, drawn large and playable: a tanpura you can strum, a pair of tabla
// you can strike (or set playing the teentaal theka), and a harmonium with bellows.
// Drawn in the site's palette: blue-black lacquer, paper inlay, gold hairlines, reds.

import { useEffect, useRef, useState } from "react";
import { getEngine } from "@/lib/audio";
import { ragaOf, tick } from "@/lib/site";
import { useSweep } from "@/lib/sweep";
import { swaraHz } from "@/lib/music";

const INK = "#131A2B", INK2 = "#1F2840", PAPER = "#F1E6CF", GOLD = "#A8853C", RED = "#B23A22", ROSE = "#D9705A";

async function ready(raga = "bhupali") {
  const eng = getEngine();
  await eng.resume();
  const r = ragaOf(raga);
  if (r) eng.tune(r);
  return eng;
}

// ------------------------------------------------------------------ tanpura

const NUT = 132, BRIDGE = 772;
const STRINGS = [
  { top: 143, bottom: 132, label: "Pa", note: "the fifth (Ma in Malkauns)" },
  { top: 148, bottom: 144, label: "Sa", note: "the home note" },
  { top: 152, bottom: 156, label: "Sa", note: "the home note again" },
  { top: 157, bottom: 168, label: "Sa,", note: "low Sa, an octave down" },
];

export function Tanpura({ className = "", raga = "bhupali" }: { className?: string; raga?: string }) {
  const amps = useRef([0, 0, 0, 0]);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const down = useRef(false);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = performance.now() / 1000;
      STRINGS.forEach((s, i) => {
        amps.current[i] *= 0.965;
        const a = amps.current[i] * Math.sin(t * (38 + i * 7));
        const midX = (s.top + s.bottom) / 2 + a;
        paths.current[i]?.setAttribute("d", `M ${s.top} ${NUT} Q ${midX} ${(NUT + BRIDGE) / 2} ${s.bottom} ${BRIDGE}`);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pluck = async (i: number, strength = 1) => {
    const eng = await ready(raga);
    eng.pluckString(i, 0.45 * strength);
    amps.current[i] = 7 * strength;
    setLast(i);
  };

  return (
    <div className={`relative select-none ${className}`}>
      <svg viewBox="0 0 300 940" className="h-full w-full overflow-visible" onPointerDown={() => (down.current = true)} onPointerUp={() => (down.current = false)} onPointerLeave={() => (down.current = false)}>
        <defs>
          <radialGradient id="tp-gourd" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor={INK2} />
            <stop offset="1" stopColor={INK} />
          </radialGradient>
        </defs>
        {/* finial and pegs */}
        <path d="M 150 18 C 138 30 138 46 150 58 C 162 46 162 30 150 18 Z" fill={ROSE} stroke={GOLD} strokeWidth="1.2" />
        {[[96, -1], [138, -1], [96, 1], [138, 1]].map(([y, side], i) => (
          <g key={i} transform={`translate(${150 + side * 26} ${y})`}>
            <rect x={side > 0 ? 0 : -34} y={-6} width={34} height={12} rx={6} fill={INK} stroke={GOLD} strokeWidth="1" />
            <circle cx={side * 34} cy={0} r={8} fill={PAPER} stroke={GOLD} strokeWidth="1.2" />
          </g>
        ))}
        {/* neck (dand) */}
        <path d="M 126 60 L 174 60 L 178 640 L 122 640 Z" fill={INK2} stroke={GOLD} strokeWidth="1.2" />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i} transform={`translate(150 ${190 + i * 50})`}>
            <path d="M 0 -10 C 7 -3 7 3 0 10 C -7 3 -7 -3 0 -10 Z" fill={PAPER} opacity=".75" />
            <circle r="1.6" fill={RED} />
          </g>
        ))}
        <rect x="128" y={NUT - 6} width="44" height="7" fill={PAPER} stroke={GOLD} strokeWidth=".8" />
        {/* gourd (tumba) and its face (tabli) */}
        <ellipse cx="150" cy="760" rx="138" ry="168" fill="url(#tp-gourd)" stroke={GOLD} strokeWidth="1.5" />
        <path d="M 30 700 C 60 600 240 600 270 700" fill="none" stroke={GOLD} strokeWidth="1" opacity=".7" />
        <ellipse cx="150" cy="770" rx="104" ry="128" fill={INK2} stroke={GOLD} strokeWidth="1" />
        {/* inlay flowers on the face */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <g key={i} transform={`translate(${(150 + 84 * Math.cos(a)).toFixed(2)} ${(770 + 106 * Math.sin(a)).toFixed(2)})`}>
              {Array.from({ length: 5 }, (_, k) => <ellipse key={k} cx="0" cy="-4" rx="2" ry="4" fill={k % 2 ? ROSE : PAPER} transform={`rotate(${k * 72})`} />)}
            </g>
          );
        })}
        <circle cx="150" cy="700" r="16" fill="none" stroke={PAPER} strokeWidth="1" opacity=".5" />
        {/* bridge (jawari) and tail */}
        <rect x="124" y={BRIDGE - 4} width="52" height="12" rx="2" fill={PAPER} stroke={GOLD} strokeWidth="1" />
        <path d="M 132 905 L 168 905 L 160 924 L 140 924 Z" fill={ROSE} stroke={GOLD} strokeWidth="1" />
        {STRINGS.map((s, i) => (
          <line key={`t${i}`} x1={s.bottom} y1={BRIDGE + 8} x2={150} y2={905} stroke={PAPER} strokeWidth=".7" opacity=".6" />
        ))}
        {/* the strings: hover across them to strum, or click */}
        {STRINGS.map((s, i) => (
          <g key={i}>
            <path ref={(el) => { paths.current[i] = el; }} d={`M ${s.top} ${NUT} Q ${(s.top + s.bottom) / 2} ${(NUT + BRIDGE) / 2} ${s.bottom} ${BRIDGE}`} fill="none" stroke={last === i ? ROSE : PAPER} strokeWidth={i === 3 ? 1.6 : 1.1} />
            <path d={`M ${s.top} ${NUT} L ${s.bottom} ${BRIDGE}`} stroke="transparent" strokeWidth="9" data-cursor="Pluck" className="cursor-pointer"
              onPointerEnter={() => pluck(i, down.current ? 1 : 0.7)} onClick={() => pluck(i)} />
          </g>
        ))}
      </svg>
      {last !== null && (
        <div key={`${last}-${Date.now()}`} className="note-pop pointer-events-none absolute left-[62%] top-[30%] whitespace-nowrap rounded-full bg-kajal px-4 py-1.5 font-display text-[18px] text-paper shadow-lg">
          {STRINGS[last].label} <span className="font-sans text-[12px] text-paper/60">· {STRINGS[last].note}</span>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ tabla

const BOLS = ["धा", "धिं", "धिं", "धा", "धा", "धिं", "धिं", "धा", "धा", "तिं", "तिं", "ता", "ता", "धिं", "धिं", "धा"];
const SIGN: Record<number, string> = { 0: "×", 4: "२", 8: "०", 12: "३" };

export function Tabla({ className = "" }: { className?: string }) {
  const [hit, setHit] = useState<{ side: "dayan" | "bayan" | "both"; bol: string; id: number } | null>(null);
  const [beat, setBeat] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const strike = async (side: "dayan" | "bayan", e?: React.MouseEvent) => {
    const eng = await ready();
    const both = e?.shiftKey;
    const bol = both ? "dha" : side === "dayan" ? (Math.random() < 0.5 ? "na" : "tin") : "ge";
    eng.tabla(bol);
    setHit({ side: both ? "both" : side, bol: { na: "ना", tin: "तिं", ge: "गे", dha: "धा" }[bol]!, id: Date.now() });
  };
  const theka = async () => {
    if (playing) return;
    tick();
    const eng = await ready();
    setPlaying(true);
    eng.theka(96, (i) => {
      setBeat(i);
      if (i >= 0) setHit({ side: BOLS[i] === "तिं" || BOLS[i] === "ता" ? "dayan" : "both", bol: BOLS[i], id: Date.now() });
      if (i < 0) setPlaying(false);
    });
  };
  // Hover (or drag a finger) across the drums: entering a drum strikes it, and moving across its
  // head keeps playing, up to ~7 strokes a second. The rim of the dayan rings "na", its black
  // centre (syahi) "tin"; the bayan booms "ge".
  const svgRef = useRef<SVGSVGElement>(null);
  const last = useRef({ t: 0, x: 0, y: 0 });
  const zoneStrike = async (side: "dayan" | "bayan", e: PointerEvent) => {
    const now = performance.now();
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 600, y = ((e.clientY - r.top) / r.height) * 460;
    const moved = Math.hypot(x - last.current.x, y - last.current.y);
    if (now - last.current.t < 140 && moved < 40) return;
    last.current = { t: now, x, y };
    const eng = await ready();
    let bol = "ge", label = "गे";
    if (side === "dayan") {
      const centre = Math.hypot((x - 430) / 80, (y - 128) / 24) < 0.42 || y > 150;
      bol = centre ? "tin" : "na";
      label = centre ? "तिं" : "ना";
    }
    eng.tabla(bol, undefined, 0.85);
    setHit({ side, bol: label, id: now });
  };
  const hover = useRef<string | null>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.buttons === 0) return;
      const t = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest?.("[data-drum]") as SVGElement | null;
      const side = (t && svg.contains(t) ? t.getAttribute("data-drum") : null) as "dayan" | "bayan" | null;
      if (side && (side !== hover.current || e.type === "pointermove")) zoneStrike(side, e);
      hover.current = side;
    };
    const leave = () => (hover.current = null);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerdown", move);
    svg.addEventListener("pointerleave", leave);
    svg.style.touchAction = "none";
    return () => {
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerdown", move);
      svg.removeEventListener("pointerleave", leave);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const glowD = hit && (hit.side === "dayan" || hit.side === "both");
  const glowB = hit && (hit.side === "bayan" || hit.side === "both");

  return (
    <div className={`select-none ${className}`}>
      <div className="relative">
        <svg ref={svgRef} viewBox="0 0 600 460" className="w-full overflow-visible">
          <defs>
            <radialGradient id="tb-bowl" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor={INK2} /><stop offset="1" stopColor={INK} /></radialGradient>
          </defs>
          {/* cushions (chutta) */}
          <ellipse cx="175" cy="412" rx="122" ry="26" fill="none" stroke={RED} strokeWidth="9" />
          <ellipse cx="430" cy="420" rx="84" ry="20" fill="none" stroke={RED} strokeWidth="9" />
          {/* bayan: the metal bowl, left */}
          <g data-cursor="Play" data-drum="bayan" className="cursor-pointer" onClick={(e) => e.shiftKey && strike("bayan", e)}>
            <path d="M 40 196 C 40 330 100 405 175 405 C 250 405 310 330 310 196 Z" fill="url(#tb-bowl)" stroke={GOLD} strokeWidth="1.5" />
            {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M ${60 + i * 38} 205 C ${58 + i * 38} 300 ${120 + i * 18} 380 ${175 + (i - 3) * 14} 402`} fill="none" stroke={PAPER} strokeWidth=".8" opacity=".35" />)}
            <ellipse cx="175" cy="196" rx="135" ry="40" fill={PAPER} stroke={GOLD} strokeWidth="2" />
            <ellipse cx="175" cy="196" rx="120" ry="34" fill="none" stroke={INK} strokeWidth="1" opacity=".3" />
            <ellipse cx="205" cy="198" rx="44" ry="13" fill={INK} />
            <ellipse cx="175" cy="196" rx="135" ry="40" fill={ROSE} opacity={glowB ? 0.35 : 0} style={{ transition: "opacity .35s" }} />
          </g>
          {/* dayan: the wooden drum, right */}
          <g data-cursor="Play" data-drum="dayan" className="cursor-pointer" onClick={(e) => e.shiftKey && strike("dayan", e)}>
            <path d="M 352 128 L 508 128 L 498 408 L 362 408 Z" fill={INK2} stroke={GOLD} strokeWidth="1.5" />
            {/* braces (baddhi) and tuning blocks (gatte) */}
            {Array.from({ length: 9 }, (_, i) => {
              const x0 = 356 + i * 19, x1 = 366 + i * 16.5;
              return <line key={i} x1={x0} y1="134" x2={x1} y2="404" stroke={PAPER} strokeWidth="1.2" opacity=".55" />;
            })}
            {Array.from({ length: 8 }, (_, i) => <rect key={i} x={364 + i * 17} y={286 + (i % 2) * 6} width="11" height="26" rx="3" fill={ROSE} stroke={GOLD} strokeWidth=".8" />)}
            <ellipse cx="430" cy="128" rx="80" ry="24" fill={PAPER} stroke={GOLD} strokeWidth="2" />
            <ellipse cx="430" cy="128" rx="68" ry="19" fill="none" stroke={INK} strokeWidth="1" opacity=".3" />
            <ellipse cx="430" cy="128" rx="30" ry="9" fill={INK} />
            <ellipse cx="430" cy="128" rx="80" ry="24" fill={ROSE} opacity={glowD ? 0.4 : 0} style={{ transition: "opacity .3s" }} />
          </g>
          <text x="175" y="452" textAnchor="middle" fontSize="15" fill="#4A5166" fontFamily="var(--font-display)">bayan · बायाँ</text>
          <text x="430" y="452" textAnchor="middle" fontSize="15" fill="#4A5166" fontFamily="var(--font-display)">dayan · दायाँ</text>
        </svg>
        {hit && (
          <div key={hit.id} className="note-pop pointer-events-none absolute font-display text-[64px] leading-none text-sindoor"
            style={{ left: hit.side === "bayan" ? "29%" : hit.side === "dayan" ? "71%" : "50%", top: "4%", transform: "translateX(-50%)" }}>{hit.bol}</div>
        )}
      </div>
      {/* the theka, as a strip of 16 beats */}
      <div className="mt-6 grid grid-cols-8 gap-1.5 lg:grid-cols-[repeat(16,minmax(0,1fr))]">
        {BOLS.map((b, i) => (
          <div key={i} className={`flex flex-col items-center border py-2 transition-all duration-150 ${i === beat ? "-translate-y-1 border-sindoor bg-sindoor text-paper" : "border-rule bg-leaf/70 text-kajal"} ${i % 4 === 0 && i % 8 ? "ml-1.5" : ""} ${i % 4 === 0 && i === 8 ? "lg:ml-1.5" : ""}`}>
            <span className="font-display text-[17px] leading-none">{b}</span>
            <span className={`mt-1 font-display text-[12px] ${i === beat ? "text-paper" : "text-sindoor"}`}>{SIGN[i] ?? " "}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 font-sans text-[14px] text-sepia">
        <button data-cursor="Play" onClick={theka} className={`rounded-full px-5 py-2.5 font-medium transition ${playing ? "bg-kajal text-paper" : "bg-sindoor text-paper hover:bg-kajal"}`}>{playing ? "Playing teentaal…" : "▶ Play the theka"}</button>
        <span>Move across the drums to play · shift-click for both together (धा)</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ harmonium

type Key = { s: string; o: number; label: string };

/** A small harmonium for one raga: keys sound while the pointer is over them (sweep across to
 *  play a run), the bellows breathe while any reed sounds, and the knobs are drone stops. */
export function Harmonium({ keys, onKey, raga = "bhupali", big = true }: { keys: Key[]; onKey?: (k: Key) => void; raga?: string; big?: boolean; pressed?: string | null }) {
  const [held, setHeld] = useState<Set<string>>(new Set());
  const root = useRef<HTMLDivElement>(null);
  const byId = (id: string) => keys.find((k) => `${k.s}${k.o}` === id)!;
  useSweep(root, async (id) => {
    const eng = await ready(raga);
    const k = byId(id);
    if (!k) return;
    eng.reedOn(`h-${id}`, swaraHz(k.s, k.o, eng.saHz));
    onKey?.(k);
    setHeld((h) => new Set(h).add(id));
  }, (id) => {
    getEngine().reedOff(`h-${id}`, 0.06);
    setHeld((h) => { const n = new Set(h); n.delete(id); return n; });
  });
  const air = held.size > 0;
  return (
    <div ref={root} className="inline-block w-full max-w-full select-none lg:w-auto">
      {/* bellows */}
      <div className="relative mx-3 h-12 overflow-hidden rounded-t-md border-x-[3px] border-t-[3px] border-[#5E1F14] bg-paper2 sm:h-14">
        <div className="absolute inset-0 transition-transform duration-500 ease-out" style={{ transform: `scaleY(${air ? 0.74 : 1})`, transformOrigin: "bottom",
          backgroundImage: `repeating-linear-gradient(180deg, ${PAPER} 0 6px, #CDB690 6px 7px, #E8D8BA 7px 12px, ${INK} 12px 13px)` }} />
      </div>
      {/* case */}
      <div className="rounded-md border-[10px] border-[#5E1F14] bg-[#5E1F14] p-2 shadow-[0_24px_40px_-24px_rgba(19,26,43,.6)]">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => <span key={i} className="h-3.5 w-3.5 rounded-full border border-[#A8853C] bg-paper" />)}
          </div>
          <div className="flex gap-1">{Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1 w-6 rounded-full bg-[#A8853C]/70" />)}</div>
        </div>
        <div className="flex gap-[3px]">
          {keys.map((k) => {
            const id = `${k.s}${k.o}`, on = held.has(id);
            return (
              <div key={id} data-sweep={id} data-cursor="Play"
                className={`flex shrink-0 cursor-pointer flex-col items-center justify-end rounded-b-md border border-[#cdbb98] pb-3 font-display transition-all duration-100 ${big ? "h-36 min-w-0 flex-1 text-[18px] sm:h-48 sm:text-[22px] lg:h-52 lg:w-24 lg:flex-none lg:text-[24px]" : "h-32 w-14 text-[20px]"} ${k.o === 0 ? "bg-[#FBF5E6] text-kajal" : "bg-[#F3E9D2] text-sepia"} ${on ? "translate-y-1.5 bg-[#efe2c4] shadow-[0_2px_0_#cdbb98]" : "shadow-[0_6px_0_#cdbb98]"}`}>
                {k.label}
                <span className="mt-1 font-sans text-[11px] text-sepia">{k.o > 0 ? "upper" : k.o < 0 ? "lower" : "\u00a0"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
