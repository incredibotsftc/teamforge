'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MigrateSurveysPage() {
    const [databaseUrl, setDatabaseUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleMigrate = async () => {
        if (!databaseUrl) {
            setError('Please enter your database URL')
            return
        }

        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const response = await fetch('/api/migrate-surveys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ databaseUrl })
            })

            const data = await response.json()

            if (data.success) {
                setResult(data)
            } else {
                setError(data.error || 'Migration failed')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to run migration')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Survey Database Migration</CardTitle>
                        <CardDescription>
                            This will add survey tables to your existing database. Run this once to enable the surveys feature.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="dbUrl" className="text-sm font-medium">
                                Database URL
                            </label>
                            <Input
                                id="dbUrl"
                                type="text"
                                placeholder="postgresql://user:password@host:port/database"
                                value={databaseUrl}
                                onChange={(e) => setDatabaseUrl(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter your Supabase database connection string (Database URL from Settings → Database → Connection string → URI)
                            </p>
                        </div>

                        <Button
                            onClick={handleMigrate}
                            disabled={loading || !databaseUrl}
                            className="w-full"
                        >
                            {loading ? 'Running Migration...' : 'Run Survey Migration'}
                        </Button>

                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                                <p className="text-sm text-destructive font-medium">Error:</p>
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        {result && (
                            <div className="p-4 bg-green-500/10 border border-green-500 rounded-md">
                                <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-2">
                                    {result.message}
                                </p>
                                {result.results && (
                                    <div className="space-y-1">
                                        {result.results.map((r: any, i: number) => (
                                            <div key={i} className="text-xs">
                                                <span className="font-mono">{r.migration}</span>:{' '}
                                                <span className={r.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                                                    {r.status}
                                                </span>
                                                {r.error && <span className="text-red-600"> - {r.error}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-4 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-2">Instructions:</p>
                            <ol className="text-sm space-y-1 list-decimal list-inside">
                                <li>Go to your Supabase project dashboard</li>
                                <li>Navigate to Settings → Database</li>
                                <li>Find "Connection string" and select "URI"</li>
                                <li>Copy the connection string</li>
                                <li>Paste it above and click "Run Survey Migration"</li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
