import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "HireTrack — Your Job Search Command Center",
  description:
    "Transform your chaotic job search into a data-driven strategic campaign. Track applications, analyze performance, and land your dream role faster.",
  keywords: [
    "job tracker",
    "job application tracker",
    "job search",
    "career management",
    "kanban board",
    "job pipeline",
  ],
  authors: [{ name: "HireTrack" }],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "HireTrack — Your Job Search Command Center",
    description:
      "Transform your chaotic job search into a data-driven strategic campaign.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/icons/icon-192.png" type="image/png" />
        <meta name="theme-color" content="#6d28d9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HireTrack" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Anti-flash: apply saved theme before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hiretrack_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
