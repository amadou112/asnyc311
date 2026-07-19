import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "NYC 311 AI Management Platform",
  description: "Enterprise NYC 311 service-request, inspection, and AI analytics platform.",
};

// Runs before paint to set the theme, avoiding a light/dark flash on load.
const noFlash = `(function(){try{var t=localStorage.getItem('theme')||'dark';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;document.documentElement.dataset.theme=r;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>
          <Sidebar />
          <main className="px-5 py-6 lg:pl-[16.5rem] lg:pr-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
