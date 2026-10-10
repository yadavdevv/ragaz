"use client";

// Text motion: letters that rise in on load, and paragraphs whose words light up as you scroll.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

export function RiseChars({ text, delay = 0, step = 28, className = "" }: { text: string; delay?: number; step?: number; className?: string }) {
  let i = 0;
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, wi) => (
        <span key={wi} aria-hidden>
          <span className="inline-block whitespace-nowrap">
            {[...w].map((c, ci) => (
              <span key={ci} className="char-rise" style={{ animationDelay: `${delay + i++ * step}ms` }}>{c}</span>
            ))}
          </span>{" "}
        </span>
      ))}
    </span>
  );
}

/** Words go from faint to full as the paragraph scrolls through the viewport. */
export function ScrollWords({ children, className = "", dim = 0.16 }: { children: string; className?: string; dim?: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const words = ref.current!.querySelectorAll("span[data-w]");
    const tween = gsap.fromTo(words, { opacity: dim }, { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: ref.current, start: "top 80%", end: "bottom 45%", scrub: true } });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [dim]);
  return (
    <p ref={ref} className={className}>
      {children.split(" ").map((w, i) => (
        <span key={i} data-w className={w.startsWith("*") ? "text-saffron" : ""}>{w.replace(/^\*/, "")} </span>
      ))}
    </p>
  );
}

/** Fade-and-lift on enter, once. */
export function Reveal({ children, className = "", y = 40, delay = 0 }: { children: ReactNode; className?: string; y?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = gsap.fromTo(ref.current, { opacity: 0, y }, { opacity: 1, y: 0, duration: 1.2, delay, ease: "expo.out", scrollTrigger: { trigger: ref.current, start: "top 88%" } });
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, [y, delay]);
  return <div ref={ref} className={className}>{children}</div>;
}

/** A number that counts up when it scrolls into view. */
export function CountUp({ to, decimals = 0, suffix = "", className = "" }: { to: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const o = { v: 0 };
    const t = gsap.to(o, {
      v: to,
      duration: 2,
      ease: "expo.out",
      scrollTrigger: { trigger: ref.current, start: "top 85%" },
      onUpdate: () => ref.current && (ref.current.textContent = o.v.toFixed(decimals) + suffix),
    });
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, [to, decimals, suffix]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{(0).toFixed(decimals)}{suffix}</span>;
}
