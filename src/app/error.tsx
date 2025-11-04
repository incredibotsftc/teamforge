'use client'

import React from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ExternalLink, Database, Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Connection (for initial setup)
DATABASE_URL=your-database-connection-string-here`

  // Check if this is a Supabase configuration error
  const isSupabaseConfigError = error.message?.includes('Missing Supabase environment variables')

  if (!isSupabaseConfigError) {
    // For other errors, show generic error page
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Something went wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-mono text-sm">
                  {error.message}
                </AlertDescription>
              </Alert>
              <Button onClick={() => reset()}>Try again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show Supabase setup instructions
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="relative w-12 h-12">
              <Image
                src="/logo.png"
                alt="FTC TeamForge Logo"
                width={48}
                height={48}
                className="rounded"
              />
            </div>
            <h1 className="text-3xl font-bold">FTC TeamForge</h1>
          </div>
          <p className="text-muted-foreground">
            Team Management Platform for FIRST Tech Challenge
          </p>
        </div>

        {/* Alert */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Supabase environment variables are not configured. Please follow the steps below to set up your Supabase project.
          </AlertDescription>
        </Alert>

        {/* Step 1: Create Supabase Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                1
              </span>
              Create a Supabase Account
            </CardTitle>
            <CardDescription>
              Sign up for a free Supabase account to host your database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                supabase.com <ExternalLink className="h-3 w-3" />
              </a></li>
              <li>Click <strong>Start your project</strong> and sign up with GitHub, Google, or email</li>
              <li>Once logged in, click <strong>New Project</strong></li>
              <li>Fill in the project details:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>Name: <code className="bg-muted px-1 py-0.5 rounded">ftc-teamforge</code> (or your team name)</li>
                  <li>Database Password: Create a strong password (save this!)</li>
                  <li>Region: Choose the closest to your location</li>
                  <li>Pricing Plan: <strong>Free</strong> tier is perfect for most teams</li>
                </ul>
              </li>
              <li>Click <strong>Create new project</strong> and wait 2-3 minutes for setup</li>
            </ol>
          </CardContent>
        </Card>

        {/* Step 2: Get API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                2
              </span>
              Get Your API Keys
            </CardTitle>
            <CardDescription>
              Copy the required credentials from your Supabase project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <p>Once your project is ready:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>In your project dashboard, click on the <strong>Settings</strong> icon (gear) in the sidebar</li>
                <li>Navigate to <strong>API</strong> section</li>
                <li>You&apos;ll need to copy <strong>3 values</strong>:</li>
              </ol>

              <div className="space-y-3 mt-4">
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">Project URL</span>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Found under &quot;Project URL&quot; - looks like: <code>https://xxxxx.supabase.co</code>
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">anon / public Key</span>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Found under &quot;Project API keys&quot; - labeled as <strong>anon</strong> or <strong>public</strong>
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">service_role Key (Secret)</span>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Found under &quot;Project API keys&quot; - labeled as <strong>service_role</strong> (click &quot;Reveal&quot; to see it)
                  </p>
                  <Alert className="mt-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription className="text-xs">
                      Keep this key secret! Never commit it to Git or share it publicly.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Get Database Connection String */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                3
              </span>
              Get Database Connection String
            </CardTitle>
            <CardDescription>
              Required for initial database setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>In Supabase dashboard, go to <strong>Settings</strong> → <strong>Database</strong></li>
              <li>Scroll down to <strong>Connection String</strong> section</li>
              <li>Select <strong>URI</strong> tab</li>
              <li>Copy the connection string (looks like: <code className="bg-muted px-1 py-0.5 rounded text-xs">postgresql://postgres:[YOUR-PASSWORD]@...</code>)</li>
              <li>Replace <code className="bg-muted px-1 py-0.5 rounded text-xs">[YOUR-PASSWORD]</code> with your actual database password</li>
            </ol>
          </CardContent>
        </Card>

        {/* Step 4: Configure Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                4
              </span>
              Configure Environment Variables
            </CardTitle>
            <CardDescription>
              Add the credentials to your application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <p>Create or update your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file in the project root:</p>

              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  <code>{envTemplate}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(envTemplate, 'env')}
                >
                  {copiedKey === 'env' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Important:</strong> Replace all placeholder values (<code>your-*-here</code>) with your actual Supabase credentials.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Restart the Application */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                5
              </span>
              Restart the Application
            </CardTitle>
            <CardDescription>
              Load the new environment variables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <p>After saving your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Stop the development server (press <kbd className="bg-muted px-2 py-0.5 rounded">Ctrl+C</kbd> in your terminal)</li>
                <li>Restart it with: <code className="bg-muted px-2 py-0.5 rounded">npm run dev</code></li>
                <li>Refresh this page in your browser</li>
              </ol>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Once configured, you&apos;ll be guided through the database setup and team creation process.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Need help? Check the{' '}
            <a
              href="https://github.com/incredibotsftc/teamforge/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              documentation <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="text-xs">
            FTC TeamForge is open-source software licensed under GNU AGPL v3
          </p>
        </div>
      </div>
    </div>
  )
}
