'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      throw new Error('Missing Supabase environment variables')
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle sign out event - redirect to home page
        if (event === 'SIGNED_OUT') {
          router.push('/')
        }

        // Handle token refresh failures - sign out and redirect
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.error('❌ Token refresh failed - signing out')
          await supabase.auth.signOut()
          router.push('/?message=Session expired. Please sign in again.')
        }

        // Handle general auth errors
        if (event === 'USER_UPDATED' && !session) {
          console.error('❌ User update failed - invalid session')
          await supabase.auth.signOut()
          router.push('/?message=Session expired. Please sign in again.')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // Explicitly redirect to ensure it works in production
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect even if sign out fails
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
