import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarzo — Your AI money coach",
  description: "Upload your portfolio. Get clear answers in plain English.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#040f0a] text-[#e4f0e8]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
