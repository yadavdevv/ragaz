import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-night px-6 pb-28 pt-24 sm:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="font-display text-[clamp(80px,18vw,300px)] leading-[0.8] text-ivory/90">ragaz</div>
        <div className="mt-12 grid gap-10 border-t border-smoke pt-10 text-[15px] text-mute sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            {[["/listen", "Listen"], ["/ragas/bhupali", "Ragas"], ["/compose", "Compose"], ["/docs", "Docs"]].map(([h, l]) => <Link key={h} href={h} className="hover:text-saffron">{l}</Link>)}
          </div>
          <p>Qwen3-0.6B with LoRA, trained with reinforcement learning (GRPO) and supervised fine-tuning on a MacBook. Every piece here was written by it and is played by your browser from its notation.</p>
          <p>Reference recordings: CompMusic Indian Art Music Raga Recognition Dataset (features), Gulati et al., CC BY 4.0. Raga rules from standard Bhatkhande descriptions.</p>
        </div>
      </div>
    </footer>
  );
}
