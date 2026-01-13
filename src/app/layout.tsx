import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Reconciliation Visualizer",
  description: "Interactive dashboard to reconcile two financial datasets and spot discrepancies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
