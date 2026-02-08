import type { Metadata, Viewport } from "next";
import {
  Fjalla_One,
  Plus_Jakarta_Sans,
  Inter,
  Roboto,
  Open_Sans,
  Lato,
  Montserrat,
  Oswald,
  Raleway,
  Merriweather,
  Playfair_Display,
  Lora,
  Nunito,
  Poppins,
  Ubuntu,
  Dancing_Script,
  Pacifico,
  Abril_Fatface,
  Bebas_Neue,
  Lobster,
  Comfortaa,
  Josefin_Sans
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Note: Environment validation is handled at build time and in API routes
// This file runs on both server and client, so we avoid importing server-only code here

const fjallaOne = Fjalla_One({
  variable: "--font-fjalla-one",
  subsets: ["latin"],
  weight: ["400"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"] });
const raleway = Raleway({ variable: "--font-raleway", subsets: ["latin"] });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], weight: ["400", "700"] });
const playfairDisplay = Playfair_Display({ variable: "--font-playfair-display", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "600"] });
const ubuntu = Ubuntu({ variable: "--font-ubuntu", subsets: ["latin"], weight: ["400", "500", "700"] });
const dancingScript = Dancing_Script({ variable: "--font-dancing-script", subsets: ["latin"] });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: ["400"] });
const abrilFatface = Abril_Fatface({ variable: "--font-abril-fatface", subsets: ["latin"], weight: ["400"] });
const bebasNeue = Bebas_Neue({ variable: "--font-bebas-neue", subsets: ["latin"], weight: ["400"] });
const lobster = Lobster({ variable: "--font-lobster", subsets: ["latin"], weight: ["400"] });
const comfortaa = Comfortaa({ variable: "--font-comfortaa", subsets: ["latin"] });
const josefinSans = Josefin_Sans({ variable: "--font-josefin-sans", subsets: ["latin"], weight: ["300", "400", "600"] });

export const metadata: Metadata = {
  title: "The Menu Guide",
  description: "Create and manage your restaurant's digital menu",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f0e8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = [
    fjallaOne.variable,
    plusJakartaSans.variable,
    inter.variable,
    roboto.variable,
    openSans.variable,
    lato.variable,
    montserrat.variable,
    oswald.variable,
    raleway.variable,
    merriweather.variable,
    playfairDisplay.variable,
    lora.variable,
    nunito.variable,
    poppins.variable,
    ubuntu.variable,
    dancingScript.variable,
    pacifico.variable,
    abrilFatface.variable,
    bebasNeue.variable,
    lobster.variable,
    comfortaa.variable,
    josefinSans.variable,
  ].join(" ");

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontVariables} antialiased font-mono`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
