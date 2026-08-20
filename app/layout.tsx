import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./live-winners.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sorteos.chicken.huertadigital.net.pe"),
  title: "Sorteos Chicken Huerta | Gana 2 motos por S/5",
  description: "Sorteo oficial Chicken Huerta: compra tu ticket por S/5 y participa por una Kratos 400 Pro y una Tekken 300. Registro y consulta de tickets en línea.",
  keywords: ["Sorteos Chicken Huerta", "sorteo de motos", "Chicken Huerta", "Kratos 400 Pro", "Tekken 300", "sorteos Perú"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Sorteos Chicken Huerta | 2 motos en juego",
    description: "Participa por dos motos con tickets de S/5.",
    url: "/",
    siteName: "Sorteos Chicken Huerta",
    locale: "es_PE",
    type: "website",
    images: [{ url: "/motos-sorteo.png", width: 1200, height: 630, alt: "Dos motos del sorteo Chicken Huerta" }],
  },
  verification: {
    google: "dU57nJ_Tv3YoPCjTpSrsFmRPDIp5jNw16hoDysgcq8A",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
