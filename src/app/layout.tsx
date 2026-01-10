import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { AppShell } from "@/components/app-shell"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vamos - Price Checker",
  description: "Easily manage and check product prices with Vamos. Track inventory, monitor price changes, and stay on top of your stock levels in real-time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vamos - Price Checker",
  },
  formatDetection: {
    telephone: false,
  },
  icons: [
    {
      rel: "icon",
      url: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      rel: "apple-touch-icon",
      url: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
  ],
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("light") }>
      <body className={"font-sans antialiased"}>
        <ServiceWorkerRegistration />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
