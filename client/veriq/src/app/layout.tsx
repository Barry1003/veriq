import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AppFrame } from "@/components/app-frame";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Veriq | Institutional Intelligence",
  description: "Institution-controlled institutional intelligence platform",
  icons: {
    icon: "/icons/veriq-mark.png",
    shortcut: "/icons/veriq-mark.png",
    apple: "/icons/veriq-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-product="veriq">
      <body>
        <Suspense>
          <AppFrame>{children}</AppFrame>
        </Suspense>
      </body>
    </html>
  );
}
