import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inferentia · Clinical Active Inference",
  description:
    "Una persona enferma es un organismo ejecutando predicciones. Inferentia identifica las instrucciones activas y calcula qué intervenciones expanden la frontera que el patrón contrajo.",
  metadataBase: new URL("https://inferentia.vercel.app"),
  openGraph: {
    title: "Inferentia — Clinical Active Inference",
    description:
      "Modelo clínico multicapa integrando Active Inference, flexibilidad fenotípica y el marco BV4.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
