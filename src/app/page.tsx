'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FirstRunExperience } from '@/components/FirstRunExperience'
import { useAuth } from '@/components/AuthProvider'
import { LoginForm } from '@/components/LoginForm'
import { checkDatabaseStatus, supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { user, loading: authLoading } = useAuth()
  const [needsFRE, setNeedsFRE] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()


  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const dbStatus = await checkDatabaseStatus()

        // If database doesn't exist or setup is incomplete, show FRE
        if (!dbStatus.exists || !dbStatus.hasCompleteSetup) {
          setNeedsFRE(true)

          // If database doesn't exist, sign out any existing user
          if (!dbStatus.exists && user) {
            await supabase.auth.signOut()
          }
        } else {
          setNeedsFRE(false)
        }
      } catch (error) {
        console.error('❗ Error checking setup status:', error)
        setNeedsFRE(true) // Default to FRE if we can't check
      } finally {
        setLoading(false)
      }
    }

    checkSetupStatus()
  }, [user])

  const handleFREComplete = () => {
    setNeedsFRE(false)
  }

  // Redirect authenticated users to dashboard
  useEffect(() => {
    // Only redirect if we've determined setup is complete AND user is authenticated
    if (!authLoading && !loading && user && needsFRE === false) {
      router.push('/dashboard')
    }
  }, [user, authLoading, loading, needsFRE, router])

  // Show loading while checking setup status
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Loading FTC TeamForge</h2>
            <p className="text-muted-foreground text-center">Checking setup status...</p>
          </CardContent>
        </Card>
      </div>
    )
  }


  // Show FRE if setup is needed
  if (needsFRE) {
    return <FirstRunExperience onComplete={handleFREComplete} />
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />
  }

  // If authenticated, redirect to dashboard (handled by useEffect above)
  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Redirecting...</h2>
          <p className="text-muted-foreground text-center">Taking you to the dashboard</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Home() {
  return <AppContent />
}
