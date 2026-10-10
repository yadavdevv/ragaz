"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { setDrone, tick, useSite } from "@/lib/site";

const LINKS = [
  { href: "/listen", label: "Listen" },
  { href: "/ragas/bhupali", label: "Ragas", match: "/ragas" },
  { href: "/compose", label: "Compose" },
  { href: "/#how", label: "How it works" },
  { href: "/#results", label: "Results" },
  { href: "/docs", label: "Docs" },
];

/** Four bars that dance while the drone is on. */
function DroneIcon({ on }: { on: boolean }) {
  return (
    <span className="flex h-4 items-end gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="w-[3px] rounded-full bg-current transition-all" style={{ height: on ? undefined : 4, animation: on ? `drone${i % 2} ${0.9 + i * 0.17}s ease-in-out infinite alternate` : "none" }} />
      ))}
      <style>{`@keyframes drone0{from{height:4px}to{height:16px}}@keyframes drone1{from{height:12px}to{height:5px}}`}</style>
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  const drone = useSite((s) => s.drone);
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 200);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setMenu(false), [path]);

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-[60] mix-blend-difference transition-transform duration-500 ease-out ${hidden && !menu ? "-translate-y-full" : ""}`}>
        <div className="flex items-center justify-between px-5 py-5 text-[#F4EDE1] sm:px-10">
          <Link href="/" data-cursor="Home" onClick={() => tick()} className="font-display text-[28px] leading-none">ragaz</Link>
          <nav className="hidden items-center gap-8 text-[15px] lg:flex">
            {LINKS.map((l) => {
              const on = l.match ? path.startsWith(l.match) : path === l.href;
              return (
                <Link key={l.href} href={l.href} onClick={() => tick("soft")} className="group relative">
                  {l.label}
                  <span className={`absolute -bottom-1 left-0 h-px bg-current transition-all duration-500 ease-out ${on ? "w-full" : "w-0 group-hover:w-full"}`} />
                </Link>
              );
            })}
            <button data-cursor={drone ? "Silence" : "Drone"} onClick={() => setDrone(!drone)} className="flex items-center gap-2 rounded-full border border-current/30 px-4 py-2 text-[14px]" aria-pressed={drone}>
              <DroneIcon on={drone} /> {drone ? "Tanpura on" : "Tanpura"}
            </button>
          </nav>
          <button className="text-[15px] lg:hidden" onClick={() => { tick(); setMenu(!menu); }}>{menu ? "Close" : "Menu"}</button>
        </div>
      </header>
      <div className={`fixed inset-0 z-[55] flex flex-col justify-center gap-2 bg-saffron px-8 transition-[clip-path] duration-700 ease-out lg:hidden ${menu ? "[clip-path:circle(150%_at_100%_0)]" : "pointer-events-none [clip-path:circle(0%_at_100%_0)]"}`}>
        {LINKS.map((l) => <Link key={l.href} href={l.href} className="font-display text-[56px] leading-[1.05] text-night">{l.label}</Link>)}
        <button onClick={() => setDrone(!drone)} className="mt-6 self-start rounded-full border border-night px-5 py-2 text-night">{drone ? "Tanpura on" : "Tanpura"}</button>
      </div>
    </>
  );
}
