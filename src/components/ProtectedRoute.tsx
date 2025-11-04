'use client'

import { useAuth } from '@/components/AuthProvider'
import { useAppData } from '@/components/AppDataProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Users } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading, signOut } = useAuth()
  const { error: appDataError, loading: appDataLoading } = useAppData()
  const router = useRouter()

  useEffect(() => {
    // If not loading and no user, redirect to home page (which shows login)
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Show loading spinner while checking auth
  if (authLoading || appDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Loading...</h2>
            <p className="text-muted-foreground text-center">Checking authentication status</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User not authenticated - redirect happening, show loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Redirecting...</h2>
            <p className="text-muted-foreground text-center">Taking you to the login page</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user is not part of any team
  if (appDataError && appDataError.includes('not a member of any team')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative w-16 h-16">
                <Image
                  src="/logo.png"
                  alt="FTC TeamForge Logo"
                  width={64}
                  height={64}
                  className="rounded"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">FTC TeamForge</h1>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Uh oh!</h2>
              <p className="text-muted-foreground">
                Looks like you are not part of any team.
              </p>
            </div>
            <div className="space-y-4 w-full">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg text-left">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Need to join a team?</p>
                  <p className="text-muted-foreground">
                    Ask your team admin to send you an invite link to join the team.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User authenticated and part of a team - show protected content
  return <>{children}</>
}
