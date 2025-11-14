import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Pool } from 'pg';
import migrationMetadata from '../../../../../database/migrations/metadata.json';

/**
 * POST /api/version/verify
 *
 * Verifies that migrations for pending versions have been successfully applied.
 * Runs verification scripts and updates the schema_versions table.
 *
 * Body: { versions: string[] } - Array of versions to verify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { versions } = body;

    if (!Array.isArray(versions) || versions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Provide an array of versions to verify.' },
        { status: 400 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    // Connect to database directly for verification
    const pool = new Pool({
      connectionString: databaseUrl,
    });

    const verificationResults = [];

    try {
      for (const version of versions) {
        const metadata = migrationMetadata.migrations[version as keyof typeof migrationMetadata.migrations];

        if (!metadata) {
          verificationResults.push({
            version,
            success: false,
            error: 'Version metadata not found'
          });
          continue;
        }

        // If no verification script, check if version exists in metadata (manual verification)
        if (!metadata.requiresVerification || !metadata.verificationScript) {
          verificationResults.push({
            version,
            success: true,
            message: 'No verification script required',
            manualVerification: true
          });
          continue;
        }

        // Run verification script
        try {
          const client = await pool.connect();
          try {
            const result = await client.query(metadata.verificationScript);

            // Check if verification passed
            // Verification script should return a column named 'verification_passed' or similar
            const verificationPassed = result.rows[0]?.verification_passed === true ||
                                      result.rows[0]?.verified === true ||
                                      (result.rows.length > 0 && result.rows.every(row => {
                                        // Check if all boolean columns are true
                                        return Object.values(row).every(val => val === true || val === 't');
                                      }));

            if (verificationPassed) {
              // Record successful verification in database
              const { error: recordError } = await supabase.rpc(
                'record_version_application',
                {
                  new_version: version,
                  notes_path: metadata.releaseNotes,
                  version_description: metadata.description
                }
              );

              if (recordError) {
                throw recordError;
              }

              // Also record in migration history
              await client.query(
                `INSERT INTO migration_history (version, migration_name, verification_passed, verification_details)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING`,
                [version, metadata.migration, true, JSON.stringify(result.rows[0])]
              );

              verificationResults.push({
                version,
                success: true,
                verified: true,
                details: result.rows[0]
              });
            } else {
              verificationResults.push({
                version,
                success: false,
                error: 'Verification script did not pass',
                details: result.rows[0]
              });
            }
          } finally {
            client.release();
          }
        } catch (error) {
          verificationResults.push({
            version,
            success: false,
            error: error instanceof Error ? error.message : 'Verification script failed to execute'
          });
        }
      }
    } finally {
      await pool.end();
    }

    // Check if all verifications passed
    const allPassed = verificationResults.every(r => r.success);

    if (allPassed) {
      return NextResponse.json({
        success: true,
        message: 'All migrations verified successfully',
        results: verificationResults
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Some migrations failed verification',
        results: verificationResults
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error verifying migrations:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify migrations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
