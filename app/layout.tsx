import type { Metadata } from "next";
import { Lora, Public_Sans } from "next/font/google";
import "./globals.css";

// Stand-ins for Anthropic's proprietary brand faces: Lora for the Tiempos-like
// editorial serif (display/headings), Public Sans for the Styrene-like body.
const serif = Lora({ subsets: ["latin"], variable: "--font-tiempos" });
const sans = Public_Sans({ subsets: ["latin"], variable: "--font-styrene" });

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
        {children}
      </body>
    </html>
  );
}
