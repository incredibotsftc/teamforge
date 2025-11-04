'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase, type TeamInsert } from '@/lib/supabase'
import { CheckCircle, AlertCircle, Trophy } from 'lucide-react'
import { SeasonSetupStep } from './SeasonSetupStep'

interface TeamSetupFormProps {
  onSetupComplete: () => void
  startAtStep?: number // Allow starting at a specific step for partial completion
}

export function TeamSetupForm({ onSetupComplete, startAtStep = 1 }: TeamSetupFormProps) {
  const [formData, setFormData] = useState<TeamInsert>({
    team_number: 0,
    team_name: '',
    school_name: '',
    state: '',
    country: 'United States'
  })
  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })
  const [seasonData, setSeasonData] = useState({
    name: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 1
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(startAtStep)
  const totalSteps = 4 // Team info, Location, Season setup, Admin creation
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null)

  // Load existing team data if starting at step 4 (team member creation)
  useEffect(() => {
    if (startAtStep === 4) {
      const loadExistingTeam = async () => {
        try {
          const { data: teams, error } = await supabase
            .from('teams')
            .select('*')
            .limit(1)
            .single()

          if (!error && teams) {
            setFormData({
              team_number: teams.team_number,
              team_name: teams.team_name,
              school_name: teams.school_name || '',
              state: teams.state || '',
              country: teams.country || 'United States'
            })
            setCreatedTeamId(teams.id)
          }
        } catch (err) {
          console.error('Failed to load existing team:', err)
        }
      }
      loadExistingTeam()
    }
  }, [startAtStep])

  const handleInputChange = (field: keyof TeamInsert, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const handleAdminInputChange = (field: keyof typeof adminData, value: string) => {
    setAdminData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        // Validate both team number and team name
        if (!formData.team_number || formData.team_number <= 0) {
          setError('Please enter a valid team number')
          return false
        }
        if (formData.team_number > 99999) {
          setError('Team number must be 5 digits or less')
          return false
        }
        if (!formData.team_name.trim()) {
          setError('Please enter a team name')
          return false
        }
        if (formData.team_name.trim().length < 2) {
          setError('Team name must be at least 2 characters long')
          return false
        }
        return true
      case 2:
        // Location info is optional, always valid
        return true
      case 3:
        // Season setup - validate season is selected
        return seasonData.name.trim().length > 0
      case 4:
        // Validate admin user creation
        if (!adminData.email.trim()) {
          setError('Please enter an email address')
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminData.email)) {
          setError('Please enter a valid email address')
          return false
        }
        if (!adminData.password) {
          setError('Please enter a password')
          return false
        }
        if (adminData.password.length < 6) {
          setError('Password must be at least 6 characters long')
          return false
        }
        if (adminData.password !== adminData.confirmPassword) {
          setError('Passwords do not match')
          return false
        }
        if (!adminData.firstName.trim()) {
          setError('Please enter your first name')
          return false
        }
        if (!adminData.lastName.trim()) {
          setError('Please enter your last name')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handlePrevious = () => {
    setStep(step - 1)
    setError('')
  }

  const handleNext = async () => {
    if (!validateStep(step)) return

    if (step === 2 && !createdTeamId) {
      // Create team after step 2 (location info) - BACK TO ORIGINAL
      await handleCreateTeam()
    } else if (step === 3) {
      // Create season after step 3 (season setup)
      setIsLoading(true)
      setError('')

      try {
        // Create the season
        const { error: seasonError } = await supabase
          .from('seasons')
          .insert([{
            name: seasonData.name,
            start_year: seasonData.start_year,
            end_year: seasonData.end_year,
            is_current_season: true
          }])
          .select()
          .single()

        if (seasonError) {
          throw new Error(`Failed to create season: ${seasonError.message}`)
        }


        // Move to next step (admin creation)
        setStep(step + 1)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    } else {
      // For other steps, just move to next step
      setStep(step + 1)
    }
  }

  const handleCreateTeam = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Create the team without authentication during FRE
      // The RLS policy "Teams: FRE team creation" allows this when no teams exist
      const { data: teamData, error: insertError } = await supabase
        .from('teams')
        .insert([{
          team_number: formData.team_number,
          team_name: formData.team_name.trim(),
          school_name: formData.school_name?.trim() || null,
          state: formData.state?.trim() || null,
          country: formData.country?.trim() || 'United States',
          created_by: null // Will be null for FRE teams, will be updated after user creation
        }])
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error(`Team number ${formData.team_number} is already registered`)
        } else if (insertError.code === '42501') {
          throw new Error('Unable to create team. Please ensure the database migration has been run.')
        }
        throw new Error(`Failed to create team: ${insertError.message}`)
      }

      setCreatedTeamId(teamData.id)
      setStep(3) // Move to season setup step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }



  const handleSubmit = async () => {
    if (!validateStep(step)) return

    // Only handle admin creation on step 4
    if (step !== 4) return

    setIsLoading(true)
    setError('')

    try {
      // Create admin user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            first_name: adminData.firstName,
            last_name: adminData.lastName
          }
        }
      })

      if (authError) {
        throw new Error(`Failed to create user account: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user data returned')
      }

      // Add user to team_members table
      // Note: User is not signed in yet (email confirmation required)
      // RLS policy allows anonymous users during FRE
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{
          team_id: createdTeamId,
          user_id: authData.user.id,
          role: 'admin',
          first_name: adminData.firstName,
          last_name: adminData.lastName,
          email: adminData.email
        }])

      if (memberError) {
        throw new Error(`Failed to add user to team: ${memberError.message}`)
      }

      // Update team's created_by field
      const { error: updateError } = await supabase
        .from('teams')
        .update({ created_by: authData.user.id })
        .eq('id', createdTeamId)

      if (updateError) {
        console.warn('Failed to update team created_by field:', updateError.message)
        // Don't fail the whole process for this
      }

      // Success!
      onSetupComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Team Information</h2>
              <p className="text-muted-foreground">Enter your team number and name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamNumber">Team Number *</Label>
              <Input
                id="teamNumber"
                type="number"
                placeholder="Enter team number"
                value={formData.team_number || ''}
                onChange={(e) => handleInputChange('team_number', parseInt(e.target.value) || 0)}
                min="1"
                max="99999"
                required
                className="text-center text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Your official FTC team number assigned by FIRST
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                type="text"
                placeholder="e.g., Robo Eagles"
                value={formData.team_name}
                onChange={(e) => handleInputChange('team_name', e.target.value)}
                required
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                The name your team uses in competitions and outreach
              </p>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Location Details</h2>
              <p className="text-muted-foreground">Help others find your team (optional)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                type="text"
                placeholder="e.g., Lincoln High School"
                value={formData.school_name}
                onChange={(e) => handleInputChange('school_name', e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                type="text"
                placeholder="e.g., California"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                type="text"
                placeholder="United States"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Season Setup</h2>
              <p className="text-muted-foreground">Set up the current FTC season</p>
            </div>

            <SeasonSetupStep
              onSeasonChange={setSeasonData}
              initialData={seasonData}
            />
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Create Admin Account</h2>
              <p className="text-muted-foreground">Set up your admin login credentials</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={adminData.firstName}
                  onChange={(e) => handleAdminInputChange('firstName', e.target.value)}
                  required
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={adminData.lastName}
                  onChange={(e) => handleAdminInputChange('lastName', e.target.value)}
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
                placeholder="admin@yourteam.com"
                value={adminData.email}
                onChange={(e) => handleAdminInputChange('email', e.target.value)}
                required
                autoComplete="username"
              />
              <p className="text-sm text-muted-foreground">
                This will be your login email. You&apos;ll need to verify it via email.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a secure password"
                value={adminData.password}
                onChange={(e) => handleAdminInputChange('password', e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <p className="text-sm text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={adminData.confirmPassword}
                onChange={(e) => handleAdminInputChange('confirmPassword', e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
              <p className="font-medium">📧 Email Verification Required</p>
              <p className="mt-1">
                After creating your account, check your email and click the verification link to complete setup.
              </p>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to FTC TeamForge</CardTitle>
          <CardDescription>
            Let&apos;s set up your team profile to get started
          </CardDescription>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center mt-4">
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalSteps }, (_, index) => index + 1).map((i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i === step
                      ? 'bg-primary text-primary-foreground'
                      : i < step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {i < step ? <CheckCircle size={16} /> : i}
                  </div>
                  {i < totalSteps && <div className="w-8 h-0.5 bg-border mx-1" />}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (step < totalSteps) {
              handleNext()
            } else {
              handleSubmit()
            }
          }}>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {renderStep()}

            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={step === 1 || isLoading}
              >
                Previous
              </Button>

              {step < totalSteps ? (
                <Button type="submit" disabled={isLoading}>
                  {step === 2 && !createdTeamId ? (isLoading ? 'Creating Team...' : 'Create Team & Continue') : 'Next'}
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                </Button>
              )}
            </div>

            <div className="text-center mt-4 text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}