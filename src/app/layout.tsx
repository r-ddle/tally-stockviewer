import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { AppShell } from "@/components/app-shell"
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tally Stock Viewer",
  description: "View and manage product inventory from Tally exports",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("light") }>
      <body className={"font-sans antialiased"}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
