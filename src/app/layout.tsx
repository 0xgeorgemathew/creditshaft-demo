import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CreditShaft - Turn Credit Card Into DeFi Collateral",
  description:
    "Use your credit card as collateral for DeFi leverage without KYC",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-dark-gradient`}>
        <Providers>
          <div className="min-h-screen bg-dark-gradient">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
