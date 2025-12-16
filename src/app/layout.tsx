import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AppHeader } from "@/components/app-header"

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
    generator: 'v0.app'
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
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  )
}
