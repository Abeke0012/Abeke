import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "900"],
  variable: "--font-unbounded",
});

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-onest",
});

export const metadata: Metadata = {
  title: "SELF — Burgers Made Bold",
  description: "SELF: сочные бургеры на говядине, бриошь, расплавленный чеддер и карамелизированный лук. Заказывайте доставку.",
};

export const viewport: Viewport = {
  themeColor: "#0a0807",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${onest.variable}`}>
      <body>
        <SmoothScroll>{children}</SmoothScroll>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
