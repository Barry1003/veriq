import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cedar",
  description: "Cedar customer banking and staff operations",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-product="cedar">
      <body>{children}</body>
    </html>
  );
}
