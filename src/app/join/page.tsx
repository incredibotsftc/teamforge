'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, UserPlus, CheckCircle } from 'lucide-react'
import { formatRole } from '@/lib/format-utils'

interface TeamInfo {
  team_number: number
  team_name: string
  school_name?: string
}

interface JoinPageData {
  valid: boolean
  team: TeamInfo
  default_role: string
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamData, setTeamData] = useState<JoinPageData | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: ''
  })

  useEffect(() => {
    validateInviteCode()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode])

  const validateInviteCode = async () => {
    if (!inviteCode) {
      setError('No invite code provided')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/team/join?code=${encodeURIComponent(inviteCode)}`)
      const data = await response.json()

      if (response.ok && data.valid) {
        setTeamData(data)
      } else {
        setError(data.error || 'Invalid invite code')
      }
    } catch (err) {
      console.error('Error validating invite:', err)
      setError('Failed to validate invite code')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.first_name.trim()) {
      setError('Please enter your first name')
      return false
    }
    if (!formData.last_name.trim()) {
      setError('Please enter your last name')
      return false
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!formData.password) {
      setError('Please enter a password')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !inviteCode) return

    setIsJoining(true)
    setError(null)

    try {
      const response = await fetch('/api/team/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invite_code: inviteCode,
          ...formData
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/?message=Account created successfully! Please sign in.')
        }, 3000)
      } else {
        setError(data.error || 'Failed to join team')
      }
    } catch (err) {
      console.error('Error joining team:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Validating invite...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !teamData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to the Team!</h2>
            <p className="text-muted-foreground mb-4">
              Your account has been created successfully. You&apos;ll be redirected to sign in shortly.
            </p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="FTC TeamForge Logo"
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Join Team</CardTitle>
          {teamData && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-lg">
                {teamData.team.team_name} (#{teamData.team.team_number})
              </h3>
              {teamData.team.school_name && (
                <p className="text-sm text-muted-foreground">{teamData.team.school_name}</p>
              )}
              <div className="mt-2">
                <Badge variant="secondary">
                  You&apos;ll join as: {formatRole(teamData.default_role)}
                </Badge>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  required
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  required
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a secure password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <p className="text-sm text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password *</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirm_password}
                onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" disabled={isJoining} className="w-full btn-accent">
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining Team...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Team
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push('/')}
              >
                Sign in instead
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function JoinPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageLoading />}>
      <JoinPageContent />
    </Suspense>
  )
}