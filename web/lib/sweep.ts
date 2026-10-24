"use client";

// Play by sweeping: elements marked data-sweep="<id>" sound as the pointer enters them,
// with a mouse (hover) or a finger (drag). Calls onEnter/onLeave with that id.

import { useEffect, useRef } from "react";

export function useSweep(root: React.RefObject<HTMLElement | SVGElement>, onEnter: (id: string, e: PointerEvent) => void, onLeave?: (id: string) => void) {
  const cur = useRef<string | null>(null);
  const cb = useRef({ onEnter, onLeave });
  cb.current = { onEnter, onLeave };
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const at = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest?.("[data-sweep]") as HTMLElement | null;
    const move = (e: PointerEvent) => {
      // fingers don't hover: only sweep while touching; mice sweep on hover
      if (e.pointerType !== "mouse" && e.buttons === 0 && e.type !== "pointerdown") return;
      const hit = at(e.clientX, e.clientY);
      const id = hit && el.contains(hit) ? hit.dataset.sweep! : null;
      if (id === cur.current) return;
      if (cur.current) cb.current.onLeave?.(cur.current);
      cur.current = id;
      if (id) cb.current.onEnter(id, e);
    };
    const end = () => {
      if (cur.current) cb.current.onLeave?.(cur.current);
      cur.current = null;
    };
    const touchEnd = (e: PointerEvent) => e.pointerType !== "mouse" && end();
    el.addEventListener("pointerdown", move as EventListener);
    el.addEventListener("pointermove", move as EventListener);
    el.addEventListener("pointerleave", end);
    window.addEventListener("pointerup", touchEnd);
    window.addEventListener("pointercancel", end);
    // let fingers drag across instead of scrolling the page
    (el as HTMLElement).style.touchAction = "none";
    return () => {
      el.removeEventListener("pointerdown", move as EventListener);
      el.removeEventListener("pointermove", move as EventListener);
      el.removeEventListener("pointerleave", end);
      window.removeEventListener("pointerup", touchEnd);
      window.removeEventListener("pointercancel", end);
    };
  }, [root]);
}
