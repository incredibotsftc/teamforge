import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getVersionsBetween } from '@/lib/version';
import migrationMetadata from '../../../../../database/migrations/metadata.json';

/**
 * GET /api/version/migrations
 *
 * Returns the combined migration SQL for upgrading from one version to another.
 * Also returns the verification script to run after applying migrations.
 *
 * Query params:
 *  - from: Starting version (exclusive)
 *  - to: Target version (inclusive)
 *
 * Example: GET /api/version/migrations?from=1.0.0&to=1.2.0
 * Returns migrations for 1.1.0 and 1.2.0
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromVersion = searchParams.get('from');
    const toVersion = searchParams.get('to');

    if (!fromVersion || !toVersion) {
      return NextResponse.json(
        { error: 'Both "from" and "to" query parameters are required' },
        { status: 400 }
      );
    }

    // Get all versions that need to be applied
    const allVersions = migrationMetadata.versionOrder;
    const pendingVersions = getVersionsBetween(allVersions, fromVersion, toVersion);

    if (pendingVersions.length === 0) {
      return NextResponse.json({
        message: 'No migrations needed',
        from: fromVersion,
        to: toVersion,
        versions: [],
        combinedSQL: '',
        verificationSQL: ''
      });
    }

    // Load all migration files
    const migrationPromises = pendingVersions.map(async (version) => {
      const metadata = migrationMetadata.migrations[version as keyof typeof migrationMetadata.migrations];
      if (!metadata) {
        throw new Error(`Metadata not found for version ${version}`);
      }

      try {
        const migrationPath = join(process.cwd(), 'database', 'migrations', metadata.migration);
        const migrationSQL = await readFile(migrationPath, 'utf-8');

        // Extract UP section (everything before -- DOWN:)
        const upSection = migrationSQL.split('-- DOWN:')[0].trim();

        return {
          version,
          migration: metadata.migration,
          sql: upSection,
          description: metadata.description,
          estimatedTime: metadata.estimatedTime
        };
      } catch (error) {
        console.error(`Failed to load migration ${metadata.migration}:`, error);
        throw new Error(`Failed to load migration for version ${version}`);
      }
    });

    const migrations = await Promise.all(migrationPromises);

    // Combine all migration SQL
    const combinedSQL = migrations.map((m, index) => {
      return `-- ========================================
-- Migration ${index + 1}/${migrations.length}: ${m.version}
-- File: ${m.migration}
-- Description: ${m.description}
-- Estimated Time: ${m.estimatedTime}
-- ========================================

${m.sql}

-- Migration ${m.version} completed
`;
    }).join('\n\n');

    // Build combined verification script
    const verificationScripts = pendingVersions
      .map(version => {
        const metadata = migrationMetadata.migrations[version as keyof typeof migrationMetadata.migrations];
        if (metadata?.requiresVerification && metadata.verificationScript) {
          return `-- Verification for ${version}\n${metadata.verificationScript}`;
        }
        return null;
      })
      .filter(Boolean);

    const verificationSQL = verificationScripts.length > 0
      ? `-- ========================================
-- VERIFICATION SCRIPTS
-- Run these queries after applying migrations to verify success
-- All results should return 't' (true)
-- ========================================

${verificationScripts.join('\n\n')}
`
      : '-- No verification scripts needed for these versions';

    return NextResponse.json({
      message: `Migrations ready for ${fromVersion} → ${toVersion}`,
      from: fromVersion,
      to: toVersion,
      versions: pendingVersions,
      migrations: migrations.map(m => ({
        version: m.version,
        file: m.migration,
        description: m.description,
        estimatedTime: m.estimatedTime
      })),
      combinedSQL,
      verificationSQL,
      instructions: [
        '1. Copy the combinedSQL below',
        '2. Open Supabase SQL Editor',
        '3. Paste and run the SQL',
        '4. Wait for execution to complete',
        '5. Run the verification SQL',
        '6. Click "Verify Migrations" button in the app to confirm'
      ]
    });

  } catch (error) {
    console.error('Error generating migration SQL:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate migration SQL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
