'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAppData } from '@/components/AppDataProvider'
import { AlertCircle, Loader2, UserPlus } from 'lucide-react'

interface AddMemberFormProps {
  onMemberAdded: () => void
  onCancel: () => void
}

interface MemberData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  role: 'admin' | 'mentor' | 'student' | 'guest'
}

export function AddMemberForm({ onMemberAdded, onCancel }: AddMemberFormProps) {
  const { team } = useAppData()
  const [memberData, setMemberData] = useState<MemberData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'student'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (field: keyof MemberData, value: string) => {
    setMemberData(prev => ({
      ...prev,
      [field]: value
    }))
    setError('')
  }

  const validateForm = (): boolean => {
    if (!memberData.email.trim()) {
      setError('Please enter an email address')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!memberData.password) {
      setError('Please enter a password')
      return false
    }
    if (memberData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    if (memberData.password !== memberData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (!memberData.firstName.trim()) {
      setError('Please enter first name')
      return false
    }
    if (!memberData.lastName.trim()) {
      setError('Please enter last name')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return
    if (!team) {
      setError('Team information not available')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: memberData.email,
        password: memberData.password,
        options: {
          data: {
            first_name: memberData.firstName,
            last_name: memberData.lastName
          }
        }
      })

      if (authError) {
        throw new Error(`Failed to create user account: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user data returned')
      }

      // Get current season
      const { error: seasonError } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current_season', true)
        .single()

      if (seasonError) {
        console.warn('Could not find current season:', seasonError.message)
      }

      // Add user to team_members table
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{
          team_id: team.id,
          user_id: authData.user.id,
          role: memberData.role,
          first_name: memberData.firstName,
          last_name: memberData.lastName,
          email: memberData.email,
          is_active: true
        }])

      if (memberError) {
        throw new Error(`Failed to add user to team: ${memberError.message}`)
      }

      // Success!
      onMemberAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="John"
            value={memberData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
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
            value={memberData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            required
            maxLength={50}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select value={memberData.role} onValueChange={(value) => handleInputChange('role', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="mentor">Mentor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Admins can manage team members and settings. Mentors and students have access to team features.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="member@example.com"
          value={memberData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          required
          autoComplete="username"
        />
        <p className="text-sm text-muted-foreground">
          This will be their login email. They&apos;ll need to verify it via email.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter a secure password"
          value={memberData.password}
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
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm the password"
          value={memberData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
        <p className="font-medium">📧 Email Verification Required</p>
        <p className="mt-1">
          The new member will need to check their email and click the verification link to complete setup.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="btn-accent">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding Member...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </>
          )}
        </Button>
      </div>
    </form>
  )
}