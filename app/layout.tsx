import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./desktop-layouts.css";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#081d39" };

export const metadata: Metadata = {
  title: "GesPro | Platfòm Jesyon Lotri",
  description: "Jesyon pwofesyonèl pou pwen vant, vandè, tikè ak tiraj lotri.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "GesPro", statusBarStyle: "default" },
  icons: {
    apple: "/icons/gespro-180.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ht">
      <body className="antialiased">{children}</body>
    </html>
  );
}
