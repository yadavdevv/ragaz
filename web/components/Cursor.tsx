"use client";

// A soft dot that trails the pointer and becomes a labelled ring over anything
// marked data-cursor="Play" (the label says what a click will do).

import { useEffect, useRef, useState } from "react";

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.body.classList.add("has-cursor");
    setOn(true);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0, down = false;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const el = (e.target as HTMLElement)?.closest?.("[data-cursor],a,button") as HTMLElement | null;
      setLabel(el ? el.dataset.cursor ?? "" : null);
    };
    const press = () => (down = true);
    const release = () => (down = false);
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (dot.current) dot.current.style.transform = `translate(${x}px, ${y}px)`;
      if (ring.current) ring.current.style.transform = `translate(${rx}px, ${ry}px) scale(${down ? 0.85 : 1})`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      document.body.classList.remove("has-cursor");
    };
  }, []);

  if (!on) return null;
  const big = label !== null;
  return (
    <>
      <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-[100] -ml-[3px] -mt-[3px] h-[6px] w-[6px] rounded-full bg-[#F1E6CF] mix-blend-difference" />
      <div ref={ring} className={`pointer-events-none fixed left-0 top-0 z-[99] ${label ? "" : "mix-blend-difference"}`}>
        <div
          className={`-translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ease-out ${big ? (label ? "flex h-[74px] w-[74px] items-center justify-center border-sindoor bg-sindoor/90" : "h-11 w-11 border-sindoor") : "h-8 w-8 border-[#F1E6CF]/60"}`}
        >
          {label && <span className="font-sans text-[12px] font-medium tracking-wide text-paper">{label}</span>}
        </div>
      </div>
    </>
  );
}
