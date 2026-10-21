import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = { title: "Veriq", description: "Institutional intelligence platform" };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="en" data-product="veriq"><body>{children}</body></html>; }
