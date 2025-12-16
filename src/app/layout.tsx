import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AppHeader, MobileBottomNav } from "@/components/app-header"

const _geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const _geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Tally Stock Viewer",
  description: "Import Tally Godown Summary XML and browse products.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${_geistSans.variable} ${_geistMono.variable} font-sans antialiased`}>
        <div className="min-h-screen flex flex-col">
          <AppHeader />
          <div className="flex-1 pb-24 md:pb-0">{children}</div>
          <MobileBottomNav />
        </div>
      </body>
    </html>
  )
}
