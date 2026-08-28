import type { Metadata } from "next";
import { Literata, Work_Sans } from "next/font/google";
import "./globals.css";

// Stitch design system: Work Sans for body/UI, Literata for headings.
const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meal Planner",
  description: "A shared household recipe library, meal calendar and shopping list.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${workSans.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
