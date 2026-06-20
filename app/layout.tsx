import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";
import { LoginTracker } from "./_components/login-tracker";

// The Executive Business Case template's faces: Newsreader (Tiempos-like
// editorial serif for display/headings), Hanken Grotesk (Styrene-like body).
const serif = Newsreader({ subsets: ["latin"], variable: "--font-tiempos" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-styrene" });

export const metadata: Metadata = {
  title: "bv-calc",
  description:
    "Business-value proposal builder for consumption-based AI — composable sections, ranged economics, PowerPoint export.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${serif.variable} ${sans.variable} font-sans antialiased min-h-screen`}
      >
        <LoginTracker />
        {children}
      </body>
    </html>
  );
}
