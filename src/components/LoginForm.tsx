'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export function LoginForm() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const messageParam = searchParams.get('message')
    if (messageParam) {
      setMessage(messageParam)
      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    }
  }, [searchParams])
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
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
          <CardTitle className="text-2xl font-bold">Welcome to FTC TeamForge</CardTitle>
          <CardDescription>
            Sign in to access your team dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          {message && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md mb-4">
              <CheckCircle size={16} />
              <span>{message}</span>
            </div>
          )}
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                    inputBackground: 'hsl(var(--background))',
                    inputBorder: 'hsl(var(--border))',
                    inputText: 'hsl(var(--foreground))',
                    inputPlaceholder: 'hsl(var(--muted-foreground))',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
              },
            }}
            providers={[]}
            redirectTo="/dashboard"
            onlyThirdPartyProviders={false}
            magicLink={false}
            showLinks={true}
          />

          <div className="mt-6 text-center">
            <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
              <p className="font-medium mb-2">📧 First time here?</p>
              <p>
                If you just completed team setup, check your email for a verification link before signing in.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
