'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Database, Loader2, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DatabaseSetupProps {
  onSetupComplete: () => void
}

export function DatabaseSetup({ onSetupComplete }: DatabaseSetupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [migrationSQL, setMigrationSQL] = useState('')
  const [loadingSQL, setLoadingSQL] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load SQL script on component mount
  useEffect(() => {
    const loadMigrationSQL = async () => {
      if (migrationSQL) return // Already loaded

      setLoadingSQL(true)
      try {
        const response = await fetch('/api/setup-database', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to generate migration SQL')
        }

        if (!result.sql || result.sql.trim().length === 0) {
          throw new Error('Generated SQL is empty. Please check your migration files.')
        }

        setMigrationSQL(result.sql)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
      } finally {
        setLoadingSQL(false)
      }
    }

    loadMigrationSQL()
  }, [migrationSQL])

  const handleCopySQL = async () => {
    if (migrationSQL) {
      try {
        await navigator.clipboard.writeText(migrationSQL)
        setCopied(true)
        // Reset the copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy SQL to clipboard:', err)
      }
    }
  }

  const handleContinue = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Verify that the required tables actually exist by trying to query them
      const requiredTables = ['teams', 'seasons', 'team_members', 'events']
      const missingTables = []


      for (const tableName of requiredTables) {
        try {
          // Try to query the table - if it doesn't exist, this will fail
          const { error } = await supabase
            .from(tableName)
            .select('id')
            .limit(1)

          if (error) {
            // Check if it's a "table doesn't exist" error
            if (
              error.message.includes('does not exist') ||
              error.message.includes('relation') ||
              error.message.includes('Could not find the table') ||
              error.message.includes('schema cache') ||
              error.code === '42P01' ||
              error.code === 'PGRST205'
            ) {
              missingTables.push(tableName)
            } else {
              // Some other error - table exists but might have permission issues, etc.
              // This is fine for our purposes
            }
          } else {
          }
        } catch {
          // If we can't query it, assume it doesn't exist
          missingTables.push(tableName)
        }
      }


      if (missingTables.length > 0) {
        const errorMessage = `Are you sure you have run the SQL script? I cannot find the tables: ${missingTables.join(', ')}`
        throw new Error(errorMessage)
      }

      // All tables exist - proceed with success
      setSuccess(true)
      setTimeout(() => {
        onSetupComplete()
      }, 1000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify database setup'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Ready to Continue!
            </CardTitle>
            <CardDescription>
              Proceeding to team setup...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mt-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <Database className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Database Setup Required</CardTitle>
          <CardDescription>
            Welcome to FTC TeamForge! It looks like this is a fresh installation.
            We need to set up your database before you can create your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200 mb-4">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Setup failed</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Setup Process</p>
                  <p className="mt-1 text-xs">Copy the SQL below and run it in your Supabase dashboard:</p>
                  <ol className="list-decimal list-inside mt-1.5 space-y-0.5 text-xs ml-2">
                    <li>Click &quot;Copy SQL&quot; to copy the script</li>
                    <li>Open your Supabase dashboard and navigate to the SQL Editor</li>
                    <li>Paste and execute the SQL script</li>
                    <li>Return here and click &quot;I&apos;ve Run the SQL - Continue&quot;</li>
                  </ol>
                </div>
              </div>
            </div>

            {loadingSQL ? (
              <div className="flex items-center justify-center p-6 bg-gray-50 rounded-md border">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Loading SQL script...</span>
              </div>
            ) : (
              <div className="relative">
                <pre className="bg-gray-100 text-gray-900 p-3 rounded-md text-xs overflow-auto max-h-48 border font-mono">
                  <code>{migrationSQL || '-- No SQL content available'}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className={`absolute top-2 right-2 ${copied ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={handleCopySQL}
                  disabled={!migrationSQL}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs">Copied!</span>
                    </>
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopySQL}
                disabled={!migrationSQL}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy SQL
                  </>
                )}
              </Button>
              <Button
                className="flex-1"
                onClick={handleContinue}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "I've Run the SQL - Continue"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}