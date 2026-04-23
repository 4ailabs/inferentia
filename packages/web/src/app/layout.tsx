import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inferentia · Clinical active inference",
  description:
    "Una persona enferma es un organismo ejecutando predicciones. Inferentia identifica las instrucciones activas y calcula qué intervenciones expanden la frontera que el patrón contrajo.",
  metadataBase: new URL("https://inferentia.vercel.app"),
  openGraph: {
    title: "Inferentia — Clinical active inference",
    description:
      "Modelo clínico multicapa: improntas, sustrato, carga tóxica, agencia, genética probable, signatura observable.",
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
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
