'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, ExternalLink, Key } from 'lucide-react'

export function ApiSetupInstructions() {
  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          FTC API credentials are not configured. You need to set up API access to use scouting features.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            How to Set Up FTC API Access
          </CardTitle>
          <CardDescription>
            Follow these steps to enable scouting features in FTC TeamForge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Step 1: Get Your API Credentials</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Visit the FIRST FTC Events API page</li>
                <li>Click on &quot;Register for API access&quot;</li>
                <li>Fill in the registration form with your information</li>
                <li>Copy your Username and Authorization Key once approved</li>
              </ol>
              <Button variant="outline" asChild className="mt-2">
                <a
                  href="https://ftc-events.firstinspires.org/services/API"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get API Credentials
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Step 2: Add Credentials to Your Environment</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Add the following environment variables:
              </p>
              <div className="bg-muted text-foreground p-4 rounded-lg font-mono text-sm space-y-1 mb-3">
                <div>FTC_API_USERNAME=your-username-here</div>
                <div>FTC_API_KEY=your-api-key-here</div>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>For cloud deployment:</strong> Update the environment variables in your cloud platform&apos;s settings
                  (e.g., Vercel, Netlify, Railway) and redeploy your application.
                </p>
                <p>
                  <strong>For local development:</strong> Add these variables to your{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file and restart your development server.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Keep your API credentials secure. Never commit them to version control or share them publicly.
              The <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file is automatically ignored by Git.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
