import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "LEVEL WOMEN WEAR",
  description: "Women's fashion boutique in Hadayek Helwan, Cairo.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ar" dir="rtl"><body className={`${cairo.variable} ${inter.variable} font-sans`}>{children}</body></html>;
}