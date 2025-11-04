'use client'

import { useState, useEffect } from 'react'
import { checkDatabaseStatus } from '@/lib/supabase'
import { DatabaseSetup } from '@/components/DatabaseSetup'
import { TeamSetupForm } from '@/components/TeamSetupForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Loader2 } from 'lucide-react'

interface FirstRunExperienceProps {
  onComplete: () => void
}

type FREStep = 'checking' | 'database-setup' | 'setup' | 'complete'

export function FirstRunExperience({ onComplete }: FirstRunExperienceProps) {
  const [step, setStep] = useState<FREStep>('checking')
  const [error, setError] = useState('')

  const [setupStep, setSetupStep] = useState(1)

  useEffect(() => {
    const checkDatabaseAndTeams = async () => {
      try {
        // Use the helper function to check database status
        const dbStatus = await checkDatabaseStatus()

        if (!dbStatus.exists) {
          // Database tables don't exist, show database setup step
          setError(dbStatus.error || 'Database setup required')
          setStep('database-setup')
          return
        }

        // Database exists, check completion status
        if (dbStatus.hasCompleteSetup) {
          // Complete setup exists (team + team_member + auth user), skip FRE
          onComplete()
          return
        }

        if (dbStatus.hasTeams && dbStatus.needsUserCreation) {
          // Team exists but no team member/user - go directly to step 4 (user creation)
          setSetupStep(4)
          setStep('setup')
          return
        }

        if (!dbStatus.hasTeams) {
          // No teams exist, start from step 1
          setSetupStep(1)
          setStep('setup')
          return
        }

        // Fallback - start from beginning
        setSetupStep(1)
        setStep('setup')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check database')
        // On error, assume we need database setup
        setStep('database-setup')
      }
    }

    checkDatabaseAndTeams()
  }, [onComplete])

  const handleDatabaseSetupComplete = () => {
    setStep('setup')
  }

  const handleSetupComplete = () => {
    setStep('complete')
    // Give user a moment to see success message before completing
    setTimeout(() => {
      onComplete()
    }, 2000)
  }

  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Loading FTC TeamForge</h2>
            <p className="text-muted-foreground text-center">
              Checking your database and setup...
            </p>
            {error && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> {error}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Continuing with first-time setup...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'database-setup') {
    return <DatabaseSetup onSetupComplete={handleDatabaseSetupComplete} />
  }

  if (step === 'setup') {
    return <TeamSetupForm onSetupComplete={handleSetupComplete} startAtStep={setupStep} />
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Setup Complete!
            </CardTitle>
            <CardDescription>
              Welcome to FTC TeamForge. Your team profile has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Loading your dashboard...
            </p>
            <div className="mt-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}