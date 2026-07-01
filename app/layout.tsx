import type { Metadata, Viewport } from "next";
import { Inter, Familjen_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Body face. globals.css asked for 'Inter' but nothing ever loaded it, so
// most visitors silently got Arial. next/font self-hosts and preloads it.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Display face for page titles and hero headings (Swedish foundry — fits
// the product). White-label business fonts still win: they're applied as
// inline styles on the business layout wrapper.
const familjenGrotesk = Familjen_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Trainomics",
  description: "Professional physiological test report generator",
  icons: [{ url: "/api/branding/favicon/trainomics", sizes: "32x32" }],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${familjenGrotesk.variable}`}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
