import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 👈 Using a built-in Google Font instead
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

// Configure the font (Standard, clean sans-serif)
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ListNer", // 👈 This fixes the browser tab title
  description: "The collaborative household list organizer.",
  icons: {
    icon: '/icon.png', // Matches the file you created earlier
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased`} // 👈 Applied the new font here
        suppressHydrationWarning={true}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}