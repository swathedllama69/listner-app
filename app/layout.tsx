import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ListNer",
  description: "The collaborative household list organizer.",
  icons: {
    icon: '/icon.png',
  },
};

// 💡 FIX: This tells the app to handle the "Safe Areas" (Notch/Swipe Bar) correctly.
// Without this, your buttons get pushed off the screen or covered by the Android UI.
export const viewport: Viewport = {
  initialScale: 1,
  width: 'device-width',
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}