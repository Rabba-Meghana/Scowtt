import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Memory",
  description: "Discover fun facts about your favorite movies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="page-bg antialiased">{children}</body>
    </html>
  );
}
