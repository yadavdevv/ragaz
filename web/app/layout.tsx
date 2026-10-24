import type { Metadata } from "next";
import { Inter, Newsreader, Tiro_Devanagari_Hindi } from "next/font/google";
import "katex/dist/katex.min.css";
import { Cursor } from "@/components/Cursor";
import { Nav } from "@/components/Nav";
import { PageFrame } from "@/components/Ornament";
import { Player } from "@/components/Player";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

// Tiro Devanagari Hindi was drawn for Devanagari and Latin together, in the manner of
// printed books; it sets every heading, in both scripts. Newsreader for reading, Inter for small UI.
const display = Tiro_Devanagari_Hindi({ subsets: ["latin", "devanagari"], weight: "400", style: ["normal", "italic"], variable: "--font-display" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://ragaz-black.vercel.app"),
  title: "ragaz",
  description: "A small language model that composes Hindustani ragas.",
  openGraph: {
    title: "ragaz",
    description: "A small language model that composes Hindustani ragas: listen, play the instruments, compose and get scored.",
    url: "/",
    siteName: "ragaz",
    type: "website",
  },
  twitter: { card: "summary", title: "ragaz", description: "A small language model that composes Hindustani ragas." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body className="font-serif text-kajal">
        <SmoothScroll />
        <Nav />
        {children}
        <PageFrame />
        <Player />
        <Cursor />
      </body>
    </html>
  );
}
