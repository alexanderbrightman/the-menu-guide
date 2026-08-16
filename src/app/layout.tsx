import type { Metadata, Viewport } from "next";
import {
  Fjalla_One,
  Plus_Jakarta_Sans,
  Raleway,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

// Site chrome only. Restaurant theme fonts load on /menu/[username] (one
// family) and on the dashboard (picker). Shipping 22 families here made
// every homepage visitor pay for fonts they never see.

const fjallaOne = Fjalla_One({
  variable: "--font-fjalla-one",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Menu Guide",
  description: "Create and manage your restaurant's digital menu",
  icons: {
    icon: "/CarolLogo.png",
    shortcut: "/CarolLogo.png",
    apple: "/CarolLogo.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#F5F5F5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVariables = [
    fjallaOne.variable,
    plusJakartaSans.variable,
    raleway.variable,
  ].join(" ");

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontVariables} antialiased font-mono`}
        suppressHydrationWarning
      >
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} />}
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
