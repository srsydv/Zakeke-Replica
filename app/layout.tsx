import type { Metadata } from "next";
import { Great_Vibes, Inter, Anton, Oswald, Bebas_Neue, Pacifico, Permanent_Marker, Playfair_Display, Righteous, Lobster } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const script = Great_Vibes({ weight: "400", subsets: ["latin"], variable: "--font-script" });
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas" });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"], variable: "--font-pacifico" });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-marker" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const righteous = Righteous({ weight: "400", subsets: ["latin"], variable: "--font-righteous" });
const lobster = Lobster({ weight: "400", subsets: ["latin"], variable: "--font-lobster" });

export const metadata: Metadata = {
  title: "BlueCotton — Custom apparel",
  description: "Design custom t-shirts, hoodies and workwear on Ralawise blanks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${script.variable} ${anton.variable} ${oswald.variable} ${bebas.variable} ${pacifico.variable} ${marker.variable} ${playfair.variable} ${righteous.variable} ${lobster.variable}`}
    >
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
