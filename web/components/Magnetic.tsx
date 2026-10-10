"use client";

// Buttons that lean toward the pointer and spring back, with a soft tap sound.

import Link from "next/link";
import { type ReactNode, useRef } from "react";
import { tick } from "@/lib/site";

type Props = { children: ReactNode; onClick?: () => void; href?: string; variant?: "solid" | "line" | "dark" | "ink"; className?: string; cursor?: string; strength?: number; size?: "md" | "lg" };

export function Magnetic({ children, onClick, href, variant = "line", className = "", cursor, strength = 0.35, size = "md" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    if (inner.current) inner.current.style.transform = `translate(${dx * strength * 0.4}px, ${dy * strength * 0.4}px)`;
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = "";
    if (inner.current) inner.current.style.transform = "";
  };
  const styles = {
    solid: "bg-saffron text-night border-saffron hover:bg-ivory hover:border-ivory",
    line: "border-ivory/25 text-ivory hover:border-saffron hover:text-saffron",
    dark: "bg-night text-ivory border-night hover:bg-ink",
    ink: "border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper",
  }[variant];
  const pad = size === "lg" ? "px-9 py-5 text-[18px]" : "px-6 py-3 text-[15px]";
  const cls = `group inline-flex items-center gap-2 rounded-full border font-medium transition-[background,color,border-color,transform] duration-500 ease-out ${pad} ${styles} ${className}`;
  const content = <span ref={inner} className="inline-flex items-center gap-2 transition-transform duration-500 ease-out">{children}</span>;
  const click = () => {
    tick();
    onClick?.();
  };
  if (href)
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} onClick={click} onPointerMove={move} onPointerLeave={leave} data-cursor={cursor ?? ""} className={cls}>
        {content}
      </Link>
    );
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} onClick={click} onPointerMove={move} onPointerLeave={leave} data-cursor={cursor ?? ""} className={cls}>
      {content}
    </button>
  );
}
