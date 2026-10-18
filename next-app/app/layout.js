import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import LayoutWrapper from "../components/LayoutWrapper";
import { supabaseAdmin } from "../lib/supabase";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Helper to use shared institute fetch logic
import { fetchInstituteServer } from "../lib/server/institute";
export async function generateMetadata() {
  const institute = await fetchInstituteServer();
  const headersList = await headers();
  // Determine baseUrl dynamically
  const host = headersList.get("host"); // e.g. "maheshiesacademy.edustacks.co.in"
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return {
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: './',
    },
    title: {
      default: institute?.name || "Edustacks",
      template: `%s | ${institute?.name || "Edustacks"}`,
    },
    description: institute?.slogan || "Online Learning Management System",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: "oPmwmDwVLgjOIFd5NECHhrqe0uANkdmfPMVWF72OI0I",
    },
    icons: {
      icon: institute?.favicon_url || "/default-favicon.ico",
      shortcut: institute?.favicon_url || "/default-favicon.ico",
      apple: institute?.favicon_url || "/default-favicon.ico",
    },
    openGraph: {
      type: "website",
      siteName: institute?.name || "Edustacks",
      locale: "en_US",
      url: baseUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: institute?.name || "Edustacks",
      description: institute?.slogan || "Online Learning Management System",
    },
  };
}

export default async function RootLayout({ children }) {
  const initialInstitute = await fetchInstituteServer();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers initialInstitute={initialInstitute}>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
