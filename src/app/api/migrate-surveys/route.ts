import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { supabase } from '@/lib/supabase'

/**
 * Temporary endpoint to apply survey migrations to existing database
 * This should only be run once to add survey tables to an existing installation
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const { databaseUrl } = await request.json()

        if (!databaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'Database URL is required'
            }, { status: 400 })
        }

        // Import pg Client
        const { Client } = await import('pg')

        const client = new Client({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            }
        })

        await client.connect()

        // Survey migrations to apply
        const migrations = [
            '0005_add_surveys.sql',
            '0006_fix_public_survey_access.sql',
            '0007_add_survey_templates.sql'
        ]

        const results = []

        for (const migrationFile of migrations) {
            try {
                console.log(`Applying migration: ${migrationFile}`)

                // Read migration file
                const migrationPath = join(process.cwd(), 'database', 'migrations', migrationFile)
                const migrationSQL = await readFile(migrationPath, 'utf-8')

                // Extract only the UP section (everything before -- DOWN:)
                const upSection = migrationSQL.split('-- DOWN:')[0]

                // Execute migration
                await client.query(upSection)

                results.push({
                    migration: migrationFile,
                    status: 'success'
                })
            } catch (error) {
                console.error(`Error applying ${migrationFile}:`, error)
                results.push({
                    migration: migrationFile,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
        }

        await client.end()

        // Verify survey tables exist
        const { data: surveyTables, error: verifyError } = await supabase
            .from('surveys')
            .select('id')
            .limit(1)

        if (verifyError && !verifyError.message.includes('no rows')) {
            console.error('Verification error:', verifyError)
            return NextResponse.json({
                success: false,
                error: 'Survey tables may not have been created properly',
                details: verifyError.message,
                results
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Survey migrations applied successfully!',
            results
        })

    } catch (error) {
        console.error('Migration error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to apply migrations'
        }, { status: 500 })
    }
}
