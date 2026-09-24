import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const shareTech = Share_Tech_Mono({ subsets: ["latin"], weight: "400", variable: "--font-share-tech", display: "swap" });

export const metadata: Metadata = {
  title: "CYBER-BITE // Menu Matrix",
  description: "Holographic burger inspection and ordering terminal for the CYBER-BITE dark kitchen.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${shareTech.variable}`}>
      <body>{children}</body>
    </html>
  );
}
