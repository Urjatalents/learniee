import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import "react-phone-number-input/style.css";

// Baloo 2 — rounded, playful display face for headings/titles.
// Kid-friendly without tipping into a "novelty" font.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Nunito — a warm, rounded-terminal body face. Reads as friendly
// rather than corporate, but is common enough to stay "safe" (per
// the Parent-dashboard redesign brief: playful, not experimental).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Learniee",
  description: "Personalized one-on-one learning, tailored to every child",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
         <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
