"use client";

import { Footer } from "@/components/Footer";
import { Findings } from "@/components/home/Findings";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ListenRail } from "@/components/home/ListenRail";
import { RagaPanels } from "@/components/home/RagaPanels";
import { Results } from "@/components/home/Results";
import { Statement } from "@/components/home/Statement";
import { YourTurn } from "@/components/home/YourTurn";
import { useData } from "@/lib/site";

export default function Home() {
  const data = useData();
  if (!data) return <div className="flex h-[100svh] items-center justify-center font-display text-[40px] text-mute">ragaz</div>;
  return (
    <main>
      <Hero data={data} />
      <Statement data={data} />
      <ListenRail data={data} />
      <RagaPanels data={data} />
      <HowItWorks data={data} />
      <Findings data={data} />
      <Results data={data} />
      <YourTurn />
      <Footer />
    </main>
  );
}
