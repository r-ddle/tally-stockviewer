"use client"

import { Button } from "@/components/ui/button"
import { ImportControls } from "@/components/import-controls"
import { useAuthContext } from "@/components/auth-provider"
import { Upload, User } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { useIsMobile } from "@/lib/use-is-mobile"

export default function AccountPage() {
  const { username, isOwner, token, logout } = useAuthContext()
  const isMobile = useIsMobile()

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 md:py-10 space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account
          </CardTitle>
          <CardDescription>
            Signed in as <span className="font-medium text-foreground">{username}</span>
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={logout} className="rounded-xl">Sign out</Button>
        </CardFooter>
      </Card>

      {/* Import Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Data Import</CardTitle>
          <CardDescription>Sync latest export or upload a file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isOwner ? (
            <ImportControls ownerToken={token} compact={isMobile} />
          ) : (
            <div className="px-3 py-3 rounded-xl border border-border text-sm text-muted-foreground flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import data (Owner only)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
