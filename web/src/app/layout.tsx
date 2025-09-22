import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "TechniZlecenia",
  description: "Technizlecenia - od ucznia dla ucznia",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <AuthGuard>
          <Suspense fallback={null}>{children}</Suspense>
          <Toaster />
        </AuthGuard>
        <Analytics />
      </body>
    </html>
  )
}


