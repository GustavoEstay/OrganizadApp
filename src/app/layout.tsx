import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrganizadApp · Solana devnet wallet with an AI copilot",
  description:
    "Portfolio prototype: Phantom-style wallet UX on Solana devnet with an AI copilot that explains transactions in plain language. Test funds only.",
};

export const viewport: Viewport = { themeColor: "#f8f2e5" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
