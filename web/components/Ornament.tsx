// The pothi's ornaments, drawn after manuscript and miniature conventions:
// the hashiya (ruled margin), a painted floral band, the cusped jharokha arch,
// folio rosettes, and rubricated (vermilion) headings.

import type { ReactNode } from "react";

const DEVA_DIGITS = "०१२३४५६७८९";
export const devaNum = (n: number) => String(n).replace(/\d/g, (d) => DEVA_DIGITS[+d]);

/** A cusped (multifoil) pointed arch in a 0..1 box: the window of Rajput architecture. */
export function archPath(spring = 0.34, lobes = 4, depth = 0.022) {
  // a pointed arch from (0, spring) to the apex (0.5, 0) to (1, spring), as two curves
  const side = (t: number, right: boolean) => {
    const x = right ? 1 - 0.5 * t : 0.5 * t;
    const y = spring * (1 - Math.sin((t * Math.PI) / 2) ** 0.9);
    return [x, y] as const;
  };
  const pts: (readonly [number, number])[] = [];
  for (let i = 0; i <= lobes; i++) pts.push(side(i / lobes, false));
  for (let i = lobes - 1; i >= 0; i--) pts.push(side(i / lobes, true));
  let d = `M 0 1 L ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    // each lobe bulges inward, which makes the cusps
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const nx = -(y1 - y0), ny = x1 - x0;
    const len = Math.hypot(nx, ny) || 1;
    const sgn = i <= lobes ? 1 : 1;
    d += ` Q ${mx + (nx / len) * depth * sgn} ${my + (ny / len) * depth * sgn} ${x1} ${y1}`;
  }
  return `${d} L 1 1 Z`;
}

/** Clip children to a jharokha arch, with a painted outline. */
export function ArchFrame({ id, children, className = "", stroke = "#A8853C", spring = 0.34 }: { id: string; children: ReactNode; className?: string; stroke?: string; spring?: number }) {
  const d = archPath(spring);
  return (
    <div className={`relative ${className}`}>
      <svg width="0" height="0" className="absolute">
        <clipPath id={id} clipPathUnits="objectBoundingBox"><path d={d} /></clipPath>
      </svg>
      <div className="h-full w-full" style={{ clipPath: `url(#${id})` }}>{children}</div>
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <path d={d} fill="none" stroke="#B23A22" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" transform="translate(0.012 0.012) scale(0.976)" />
      </svg>
    </div>
  );
}

/** A small rosette, as painted at the corners of a hashiya. */
export function Rosette({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" className={className} aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-5" rx="2.2" ry="4.4" fill={i % 2 ? "#D9705A" : "#B23A22"} opacity=".9" transform={`rotate(${i * 45})`} />
      ))}
      <circle r="2.2" fill="#A8853C" />
    </svg>
  );
}

/** The hashiya: a ruled margin around a picture or a block (vermilion, gold, ink). */
export function Hashiya({ children, className = "", corners = true, tone = "paper" }: { children: ReactNode; className?: string; corners?: boolean; tone?: "paper" | "night" }) {
  const inner = tone === "night" ? "border-paper/25" : "border-kajal/20";
  return (
    <div className={`relative p-[11px] ${className}`}>
      <div className="pointer-events-none absolute inset-0 border-[1.5px] border-sindoor/80" />
      <div className="pointer-events-none absolute inset-[4px] border border-sona/80" />
      <div className={`pointer-events-none absolute inset-[8px] border ${inner}`} />
      {corners && ["-left-[8px] -top-[8px]", "-right-[8px] -top-[8px]", "-bottom-[8px] -left-[8px]", "-bottom-[8px] -right-[8px]"].map((p) => (
        <Rosette key={p} size={17} className={`pointer-events-none absolute ${p}`} />
      ))}
      <div className="relative">{children}</div>
    </div>
  );
}

/** A painted border strip: small flowers and leaves between two rules. */
export function FloralBand({ className = "", tone = "paper" }: { className?: string; tone?: "paper" | "night" | "gulal" }) {
  const id = `fb-${tone}`;
  const rule = tone === "night" ? "#A8853C" : "#B23A22";
  return (
    <svg className={`block h-[26px] w-full ${className}`} aria-hidden>
      <defs>
        <pattern id={id} width="64" height="26" patternUnits="userSpaceOnUse">
          {/* flower */}
          <g transform="translate(16 13)">
            {Array.from({ length: 5 }, (_, i) => (
              <ellipse key={i} cx="0" cy="-3.6" rx="2" ry="3.4" fill={tone === "gulal" ? "#B23A22" : "#D9705A"} transform={`rotate(${i * 72})`} />
            ))}
            <circle r="1.6" fill="#B23A22" />
          </g>
          {/* sprig */}
          <g transform="translate(46 13)" fill="#131A2B" opacity=".55">
            <path d="M -8 0 Q 0 -1 8 0" stroke="#131A2B" strokeWidth=".8" fill="none" />
            <path d="M -3 0 Q -1 -6 3 -5 Q 1 -1 -3 0 Z" />
            <path d="M 2 0 Q 4 6 8 5 Q 6 1 2 0 Z" />
          </g>
        </pattern>
      </defs>
      <line x1="0" x2="100%" y1="1" y2="1" stroke={rule} strokeWidth="1.2" />
      <line x1="0" x2="100%" y1="3.5" y2="3.5" stroke="#A8853C" strokeWidth=".6" />
      <rect x="0" y="5" width="100%" height="16" fill={`url(#${id})`} />
      <line x1="0" x2="100%" y1="22.5" y2="22.5" stroke="#A8853C" strokeWidth=".6" />
      <line x1="0" x2="100%" y1="25" y2="25" stroke={rule} strokeWidth="1.2" />
    </svg>
  );
}

/** A folio number in a rosette, as a section marker. */
export function Folio({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`relative inline-flex h-12 w-12 items-center justify-center ${className}`}>
      <svg viewBox="-24 -24 48 48" className="absolute inset-0 h-full w-full" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-17" rx="3.6" ry="6" fill="none" stroke="#A8853C" strokeWidth="1" transform={`rotate(${i * 30})`} />
        ))}
        <circle r="13" fill="none" stroke="#B23A22" strokeWidth="1.2" />
      </svg>
      <span className="relative font-display text-[18px] leading-none text-sindoor">{devaNum(n)}</span>
    </span>
  );
}

/** A rubricated heading: the small vermilion title that opens a section. */
export function Rubric({ children, className = "", tone = "paper" }: { children: ReactNode; className?: string; tone?: "paper" | "night" | "ink" }) {
  return (
    <div className={`flex items-center gap-2.5 text-[13px] uppercase tracking-[0.22em] ${tone === "night" ? "text-gulal" : tone === "ink" ? "text-kajal" : "text-sindoor"} ${className}`}>
      <span className="font-display text-[16px] normal-case tracking-normal">॥</span>
      <span>{children}</span>
      <span className="font-display text-[16px] normal-case tracking-normal">॥</span>
    </div>
  );
}

/** The painted border of a pothi folio, around the whole page on large screens:
 *  a vermilion band between ink and gold rules, with rosettes at the corners. */
export function PageFrame() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[61] hidden lg:block">
      {/* a paper mat outside the frame, so the page never shows beyond its border */}
      <div className="absolute inset-[22px] shadow-[0_0_0_40px_#F1E6CF]" />
      <div className="absolute inset-[10px] border-[5px] border-sindoor/80" />
      <div className="absolute inset-[7px] border border-kajal/50" />
      <div className="absolute inset-[17px] border border-sona/80" />
      {["left-[3px] top-[3px]", "right-[3px] top-[3px]", "bottom-[3px] left-[3px]", "bottom-[3px] right-[3px]"].map((p) => <Rosette key={p} size={22} className={`absolute ${p}`} />)}
    </div>
  );
}
