import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppBar } from "@/components/back-button";
import { IntroSplash } from "@/components/intro-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Convoley",
  description: "Convocatorias, inscripciones y pagos para clubes de vóley.",
};

// Runs before paint so returning visitors never see the intro flash (key shared with IntroSplash).
const INTRO_SEEN_SCRIPT = `try{localStorage.getItem("convoley:intro-seen")&&document.documentElement.setAttribute("data-intro-seen","")}catch(e){document.documentElement.setAttribute("data-intro-seen","")}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-PE"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SEEN_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense>
          <AppBar />
        </Suspense>
        {children}
        <IntroSplash />
      </body>
    </html>
  );
}
