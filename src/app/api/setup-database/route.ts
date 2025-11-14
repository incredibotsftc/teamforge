import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { rateLimit, RateLimitPresets } from '@/lib/rateLimit'
import { supabase } from '@/lib/supabase'
import migrationMetadata from '../../../../database/migrations/metadata.json'

async function getMigrationSQL(): Promise<string> {
    const allMigrations = []

    // Get all migrations in order from metadata.json
    for (const version of migrationMetadata.versionOrder) {
        const metadata = migrationMetadata.migrations[version as keyof typeof migrationMetadata.migrations]
        if (!metadata) {
            console.error(`Metadata not found for version ${version}`)
            continue
        }

        try {
            const migrationPath = join(process.cwd(), 'database', 'migrations', metadata.migration)
            const migrationSQL = await readFile(migrationPath, 'utf-8')

            // Extract only the UP section (everything before -- DOWN:)
            const upSection = migrationSQL.split('-- DOWN:')[0]

            // Add migration marker
            allMigrations.push(`-- ========================================`)
            allMigrations.push(`-- Migration: ${version}`)
            allMigrations.push(`-- File: ${metadata.migration}`)
            allMigrations.push(`-- Description: ${metadata.description}`)
            allMigrations.push(`-- ========================================`)
            allMigrations.push('')
            allMigrations.push(upSection.trim())
            allMigrations.push('')
            allMigrations.push(`-- Migration ${version} completed`)
            allMigrations.push('') // Empty line for separation

        } catch (error) {
            console.error(`Failed to read migration ${metadata.migration}:`, error)
            throw new Error(`Failed to read migration ${metadata.migration}`)
        }
    }

    return allMigrations.join('\n')
}

export async function POST(request: NextRequest) {
    // Apply rate limiting to prevent repeated database setup attempts
    const rateLimitResult = await rateLimit(request, RateLimitPresets.DATABASE_SETUP)

    if (!rateLimitResult.success) {
        return NextResponse.json(
            { error: 'Too many database setup attempts. Please try again later.' },
            {
                status: 429,
                headers: rateLimitResult.headers
            }
        )
    }

    try {
        // Try to parse JSON body, but handle empty body gracefully
        let body: { execute?: boolean; databaseUrl?: string } = {}
        try {
            const text = await request.text()
            if (text) {
                body = JSON.parse(text)
            }
        } catch (parseError) {
            console.error(parseError);
            // Empty or invalid body is ok - we'll use defaults
        }

        const { execute, databaseUrl: providedDatabaseUrl } = body

        // Get the combined migration SQL
        const migrationSQL = await getMigrationSQL()

        // If execute flag is true, run the SQL directly
        if (execute) {
            try {
                // Use direct database connection with pg library
                const { Client } = (await import('pg')) as { Client: new (config: { connectionString: string; ssl: { rejectUnauthorized: boolean } }) => { connect: () => Promise<void>; query: (sql: string) => Promise<{ rows: unknown[] }>; end: () => Promise<void> } }

                // Get database URL from request body or environment
                // Prioritize the provided URL (from input field) over environment variable
                const databaseUrl = providedDatabaseUrl || process.env.DATABASE_URL

                if (!databaseUrl) {
                    throw new Error('Database connection string is required. Please provide your database URL.')
                }

                // Validate the URL format
                if (!databaseUrl.startsWith('postgresql://')) {
                    throw new Error('Invalid database URL format. It should start with "postgresql://"')
                }

                const client = new Client({
                    connectionString: databaseUrl,
                    ssl: {
                        rejectUnauthorized: false
                    }
                })

                await client.connect()

                // Check if SQL is empty
                if (!migrationSQL || migrationSQL.trim().length === 0) {
                    throw new Error('Migration SQL is empty')
                }

                try {
                    // Execute the SQL script without a transaction
                    // The migration is idempotent with IF NOT EXISTS and ON CONFLICT clauses
                    await client.query(migrationSQL)
                } catch (migrationError) {
                    console.error('Migration SQL execution failed:', migrationError)

                    // Get more details about the error
                    const errorMsg = migrationError instanceof Error ? migrationError.message : 'Unknown error'
                    const errorPosition = (migrationError as { position?: number }).position

                    if (errorPosition) {
                        const contextStart = Math.max(0, errorPosition - 100)
                        const contextEnd = Math.min(migrationSQL.length, errorPosition + 100)
                        const context = migrationSQL.substring(contextStart, contextEnd)
                        console.error('Error occurred around position', errorPosition, ':', context)
                    }

                    throw new Error(`Failed to execute migration at position ${errorPosition || 'unknown'}: ${errorMsg}`)
                }

                // Verify tables were created
                const { rows } = await client.query(`
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name IN ('teams', 'seasons', 'team_members', 'events')
                    ORDER BY table_name
                `)

                await client.end()

                // Verify the Supabase client can see the tables
                const { error: testError } = await supabase
                    .from('teams')
                    .select('id')
                    .limit(1)

                if (testError) {
                    console.error('Supabase client cannot access teams table:', testError)
                    // Wait a moment and try again
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    const { error: retryError } = await supabase
                        .from('teams')
                        .select('id')
                        .limit(1)

                    if (retryError) {
                        console.error('Still cannot access teams table after retry:', retryError)
                        throw new Error(`Database tables created but Supabase cannot access them yet. Error: ${retryError.message}. Please refresh the page and try again.`)
                    }
                }
                return NextResponse.json({
                    success: true,
                    message: 'Database setup completed successfully! All tables, functions, and security policies have been created.',
                    tablesCreated: rows.map((r: unknown) => (r as { table_name: string }).table_name)
                })

            } catch (execError) {
                console.error('SQL execution error:', execError)

                // Provide more detailed error information
                const errorMessage = execError instanceof Error ? execError.message : 'Failed to execute SQL'
                const errorDetails = execError instanceof Error && 'detail' in execError
                    ? (execError as { detail?: string }).detail
                    : null

                return NextResponse.json({
                    success: false,
                    error: errorMessage,
                    details: errorDetails,
                    hint: 'Make sure the DATABASE_URL environment variable is set correctly in your .env.local file'
                }, { status: 500 })
            }
        }

        // If execute is false, just return the SQL (backward compatibility)
        return NextResponse.json({
            success: true,
            message: 'Migration SQL prepared',
            sql: migrationSQL,
        })

    } catch (error) {
        console.error('Database setup error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Database setup failed',
        }, { status: 500 })
    }
}

// Check if database tables exist
export async function GET() {
    try {
        // Try to query the teams table to see if it exists
        const { error } = await supabase
            .from('teams')
            .select('id')
            .limit(1)

        if (error) {
            // If error code indicates table doesn't exist
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                return NextResponse.json({
                    exists: false,
                    error: 'Database tables do not exist'
                })
            }

            // Other error
            return NextResponse.json({
                exists: false,
                error: error.message
            })
        }

        // Table exists
        return NextResponse.json({ exists: true })

    } catch (error) {
        return NextResponse.json({
            exists: false,
            error: error instanceof Error ? error.message : 'Failed to check database'
        })
    }
}