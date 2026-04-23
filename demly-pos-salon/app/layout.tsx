import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import MotionWrapper from "@/components/MotionWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Demly — POS System for UK Small Businesses | £29/Month, Zero Transaction Fees",
  description: "The affordable POS system for UK shops, salons, cafes and retail businesses. £29/month flat fee, no transaction fees, no contracts. Works on any device. Free 30-day trial.",
  keywords: "POS system UK, point of sale UK small business, Square alternative UK, cheap POS system UK, retail POS UK, salon POS UK, barbershop POS UK",
  openGraph: {
    title: "Demly POS — £29/Month, Zero Transaction Fees",
    description: "The affordable POS system for UK small businesses. No transaction fees. No contracts. Free trial.",
    url: "https://demly.co.uk",
    siteName: "Demly",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Demly POS — £29/Month, Zero Transaction Fees",
    description: "The affordable POS system for UK small businesses. No transaction fees. No contracts.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://demly.co.uk",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <MotionWrapper>
            {children}
          </MotionWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
