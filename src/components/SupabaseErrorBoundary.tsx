'use client'

import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Key, Terminal, RefreshCw, Monitor, Cloud, Settings, BookOpen, Github, Lightbulb } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SupabaseErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      const isSupabaseConfigError = this.state.error?.message?.includes('Missing Supabase environment variables')

      if (isSupabaseConfigError) {
        return <SupabaseSetupPage />
      }

      // For other errors, show generic error page
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-2xl">Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred while loading the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-mono text-sm text-red-800">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

function SupabaseSetupPage() {
  const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(envTemplate)
    alert('Copied to clipboard!')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-6xl w-full">
        <CardHeader>
          <div className="flex flex-col items-center gap-4 mb-2">
            <Image src="/logo.png" alt="FTC TeamForge Logo" width={64} height={64} />
            <CardTitle className="text-3xl text-center">Welcome to FTC TeamForge</CardTitle>
          </div>
          <CardDescription className="text-lg text-center">
            To get started, you need to configure your Supabase database connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alert */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex gap-4">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-lg">Database Setup Required</p>
              <p className="text-base text-red-800 mt-2">
                FTC TeamForge requires a database to store your team&apos;s data. <strong>You control your own data</strong> - this application doesn&apos;t collect or store any team information on external servers.
              </p>
              <p className="text-base text-red-800 mt-2">
                You need to set up your own database using <strong>Supabase</strong>, which offers a generous free tier perfect for FTC teams. Follow the steps below to configure your database and connect it to the application.
              </p>
            </div>
          </div>

          {/* Setup Steps */}
          <Accordion type="multiple" defaultValue={["step-1"]} className="w-full">
            <AccordionItem value="step-1">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center gap-3">
                  <span className="bg-gray-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
                  Create a Supabase Account
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="ml-11 space-y-3">
                  <p className="text-base text-gray-700">
                    If you don&apos;t have a Supabase account, visit{' '}
                    <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline font-medium">
                      supabase.com
                    </a>{' '}
                    and create a free account. Then create a new project.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-2">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center gap-3">
                  <span className="bg-gray-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
                  Get Your API Keys
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="ml-11 space-y-4">
                  <p className="text-base">In your Supabase project dashboard, go to <strong>Settings</strong> → <strong>API</strong>:</p>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Key</TableHead>
                        <TableHead>Where to Find It</TableHead>
                        <TableHead>Environment Variable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Project URL</TableCell>
                        <TableCell>Copy the <strong>Project URL</strong></TableCell>
                        <TableCell><code className="bg-gray-900 text-white px-2 py-1 rounded text-sm">NEXT_PUBLIC_SUPABASE_URL</code></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Anon/Public Key</TableCell>
                        <TableCell>Under <strong>Project API keys</strong>, find the <strong>anon public</strong> key</TableCell>
                        <TableCell><code className="bg-gray-900 text-white px-2 py-1 rounded text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Service Role Key</TableCell>
                        <TableCell>
                          Under <strong>Project API keys</strong>, find the <strong>service_role</strong> key
                          <div className="mt-2 text-sm text-red-600 font-medium">
                            ⚠️ Keep this key secret! It bypasses Row Level Security.
                          </div>
                        </TableCell>
                        <TableCell><code className="bg-gray-900 text-white px-2 py-1 rounded text-sm">SUPABASE_SERVICE_ROLE_KEY</code></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-3">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center gap-3">
                  <span className="bg-gray-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</span>
                  Configure Environment Variables
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="ml-11 space-y-4">
                  <Tabs defaultValue="local" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="local" className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Local Development
                      </TabsTrigger>
                      <TabsTrigger value="cloud" className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        Cloud Deployment
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="local" className="space-y-3 mt-4">
                      <p className="text-base text-gray-700">
                        Create a <code className="bg-gray-900 text-white px-2 py-1 rounded font-mono text-sm">.env.local</code> file
                        in the root of your project and add the following:
                      </p>
                      <div className="relative">
                        <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto text-sm font-mono">
                          {envTemplate}
                        </pre>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={copyToClipboard}
                          className="absolute top-2 right-2"
                        >
                          <Key className="mr-2 h-4 w-4" />
                          Copy Template
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="cloud" className="space-y-3 mt-4">
                      <p className="text-base text-gray-700 mb-3">
                        Add the environment variables in your hosting platform&apos;s dashboard:
                      </p>
                      <div className="space-y-3">
                        <p className="font-semibold text-base">For Vercel:</p>
                        <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                          <li>Go to your project dashboard on Vercel</li>
                          <li>Navigate to <strong>Settings</strong> → <strong>Environment Variables</strong></li>
                          <li>Add each variable:
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                              <li><code className="bg-gray-900 text-white px-2 py-0.5 rounded text-sm">NEXT_PUBLIC_SUPABASE_URL</code></li>
                              <li><code className="bg-gray-900 text-white px-2 py-0.5 rounded text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                              <li><code className="bg-gray-900 text-white px-2 py-0.5 rounded text-sm">SUPABASE_SERVICE_ROLE_KEY</code></li>
                            </ul>
                          </li>
                          <li>Select which environments to apply them to (Production, Preview, Development)</li>
                          <li>Click <strong>Save</strong></li>
                          <li>Redeploy your application for changes to take effect</li>
                        </ol>
                        <p className="text-sm text-gray-600 mt-3 p-3 bg-blue-50 rounded-lg">
                          <strong>Note:</strong> Similar steps apply for other platforms like Netlify, Railway, or Render.
                          Check your platform&apos;s documentation for environment variable configuration.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Optional Environment Variables */}
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50 mt-6">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-base">
                      <Settings className="h-5 w-5 text-green-700" />
                      Optional: Enable Scouting Feature
                    </h4>
                    <p className="mb-3 text-sm text-gray-700">
                      To use the <strong>Scouting feature</strong>, you need FTC Events API credentials. Without these, the scouting feature won&apos;t work, but all other features will function normally.
                    </p>
                    <div className="space-y-3">
                      <p className="font-semibold text-sm">Steps to get FTC API credentials:</p>
                      <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                        <li>Visit <a href="https://ftc-events.firstinspires.org/services/API" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline font-medium">FTC Events API</a></li>
                        <li>Click <strong>&quot;Register for API access&quot;</strong> and fill out the form</li>
                        <li>You&apos;ll receive your API username and key via email</li>
                        <li>Add these to your environment variables:
                          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                            <li><code className="bg-gray-900 text-white px-2 py-0.5 rounded text-sm">FTC_API_USERNAME</code></li>
                            <li><code className="bg-gray-900 text-white px-2 py-0.5 rounded text-sm">FTC_API_KEY</code></li>
                          </ul>
                        </li>
                      </ol>
                      <p className="text-sm text-gray-600 mt-3 flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                        <span><strong>Tip:</strong> You can skip this for now and add it later when you want to use the scouting feature.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-4">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center gap-3">
                  <span className="bg-gray-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</span>
                  Restart the Application
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="ml-11 space-y-4">
                  <p className="text-base text-gray-700">After configuring your environment variables:</p>

                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-base mb-2">For Local Development:</p>
                      <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm">
                        <Terminal className="inline mr-2 h-4 w-4" />
                        npm run dev
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-base mb-2">For Cloud Deployment:</p>
                      <p className="text-sm text-gray-700">
                        After adding environment variables in your platform&apos;s dashboard, trigger a new deployment.
                        Vercel will automatically redeploy, or you can manually trigger a redeploy from your dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span><strong>Note:</strong> The application will automatically detect your Supabase configuration and initialize the database on first run.</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Helpful Links */}
          <div className="border-t pt-6 mt-6">
            <h4 className="font-semibold text-base mb-4">Helpful Resources</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://supabase.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:underline flex items-center gap-2 text-base font-medium"
              >
                <BookOpen className="h-5 w-5" />
                Supabase Documentation
              </a>
              <a
                href="https://github.com/incredibotsftc/teamforge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:underline flex items-center gap-2 text-base font-medium"
              >
                <Github className="h-5 w-5" />
                FTC TeamForge Repository
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
