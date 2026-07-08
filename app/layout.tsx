import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkLog",
  description: "Log your workdays. Generate resume bullets, STAR stories, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
