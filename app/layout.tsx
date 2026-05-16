import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { NotificationBell } from "@/components/NotificationBell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "B&W Tasks",
  description: "Minimalist task management with natural language scheduling",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable} h-full`}>
      <body className="min-h-full bg-white text-black flex flex-col" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        <header className="border-b border-black">
          <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold leading-none" style={{ fontSize: 9, letterSpacing: "-0.02em" }}>B&amp;W</span>
              </div>
              <span className="text-xs font-medium text-black/40 group-hover:text-black transition-colors" style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Tasks
              </span>
            </a>
            <div className="flex items-center gap-6">
              <a
                href="/tags"
                className="text-xs font-medium text-black/40 hover:text-black transition-colors"
                style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                Tags
              </a>
              <NotificationBell />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
          {children}
        </main>
        <footer className="border-t py-6" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          <div className="max-w-2xl mx-auto px-6 flex items-center justify-between">
            <span className="text-black/30" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>B&amp;W Tasks</span>
            <span className="text-black/30" style={{ fontSize: 11 }}>Natural Language Scheduling</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
