import type { Metadata } from "next";
import { Rethink_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Rethink_Sans({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-mono-loaded",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Replay: Climbing Movement Analysis",
  description: "A tool for climbing movement analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
