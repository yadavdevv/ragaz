import type { Metadata } from "next";
import { Inter, Instrument_Serif, Noto_Serif_Devanagari } from "next/font/google";
import "katex/dist/katex.min.css";
import { Cursor } from "@/components/Cursor";
import { Nav } from "@/components/Nav";
import { Player } from "@/components/Player";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const deva = Noto_Serif_Devanagari({ subsets: ["devanagari"], weight: ["400", "500"], variable: "--font-deva" });

export const metadata: Metadata = {
  title: "ragaz",
  description: "A small language model that composes Hindustani ragas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${deva.variable}`}>
      <body className="bg-night font-sans text-ivory">
        <SmoothScroll />
        <Nav />
        {children}
        <Player />
        <Cursor />
      </body>
    </html>
  );
}
