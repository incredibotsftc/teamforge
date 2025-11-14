import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { APP_VERSION, getVersionsBetween } from '@/lib/version';
import { readFile } from 'fs/promises';
import { join } from 'path';
import migrationMetadata from '../../../../../database/migrations/metadata.json';

/**
 * GET /api/version/check
 *
 * Checks if the application version matches the database version.
 * Returns pending migrations if database needs to be updated.
 */
export async function GET() {
  try {
    // Get current database version
    const { data: dbVersion, error: versionError } = await supabase
      .rpc('get_current_db_version');

    if (versionError) {
      // If function doesn't exist, database is on v1.0.0 (pre-versioning)
      // PostgREST returns PGRST202 when function not found
      // PostgreSQL returns 42883 when function doesn't exist
      if (
        versionError.code === 'PGRST202' ||
        versionError.code === '42883' ||
        versionError.message.includes('does not exist') ||
        versionError.message.includes('Could not find the function')
      ) {
        console.log('Version tracking not enabled - assuming v1.0.0');

        // Assume database is at v1.0.0 (before version tracking was added)
        const currentDbVersion = '1.0.0';
        const allVersions = migrationMetadata.versionOrder;
        const pendingVersions = getVersionsBetween(allVersions, currentDbVersion, APP_VERSION);

        if (pendingVersions.length === 0) {
          return NextResponse.json({
            upToDate: true,
            currentAppVersion: APP_VERSION,
            dbVersion: currentDbVersion,
            pendingVersions: [],
            message: 'Database is up to date'
          });
        }

        // Load release notes for pending versions
        const releaseNotesPromises = pendingVersions.map(async (version) => {
          const metadata = migrationMetadata.migrations[version as keyof typeof migrationMetadata.migrations];
          if (!metadata) {
            return {
              version,
              releaseNotes: `# Version ${version}\n\nRelease notes not found.`,
              description: 'No description available',
              estimatedTime: 'Unknown'
            };
          }

          try {
            const releaseNotesPath = join(process.cwd(), metadata.releaseNotes);
            const releaseNotes = await readFile(releaseNotesPath, 'utf-8');
            return {
              version,
              releaseNotes,
              description: metadata.description,
              estimatedTime: metadata.estimatedTime,
              requiresVerification: metadata.requiresVerification
            };
          } catch (error) {
            console.error(`Failed to load release notes for ${version}:`, error);
            return {
              version,
              releaseNotes: `# Version ${version}\n\nRelease notes not available.`,
              description: metadata.description,
              estimatedTime: metadata.estimatedTime,
              requiresVerification: metadata.requiresVerification
            };
          }
        });

        const pendingReleaseNotes = await Promise.all(releaseNotesPromises);

        return NextResponse.json({
          upToDate: false,
          currentAppVersion: APP_VERSION,
          dbVersion: currentDbVersion,
          pendingVersions,
          pendingReleaseNotes,
          needsVersionTracking: true,
          message: `Database is at v${currentDbVersion} (pre-versioning). Upgrade to v${APP_VERSION} required.`
        });
      }

      throw versionError;
    }

    const currentDbVersion = dbVersion as string || '0.0.0';

    // Check if database is up to date
    if (currentDbVersion === APP_VERSION) {
      return NextResponse.json({
        upToDate: true,
        currentAppVersion: APP_VERSION,
        dbVersion: currentDbVersion,
        pendingVersions: [],
        message: 'Database is up to date'
      });
    }

    // Get pending versions
    const allVersions = migrationMetadata.versionOrder;
    const pendingVersions = getVersionsBetween(allVersions, currentDbVersion, APP_VERSION);

    if (pendingVersions.length === 0) {
      // App version is older than or equal to database version (shouldn't happen)
      return NextResponse.json({
        upToDate: true,
        currentAppVersion: APP_VERSION,
        dbVersion: currentDbVersion,
        pendingVersions: [],
        message: 'Database version is current or newer than app version'
      });
    }

    // Load release notes for pending versions
    const releaseNotesPromises = pendingVersions.map(async (version) => {
      const metadata = migrationMetadata.migrations[version as keyof typeof migrationMetadata.migrations];
      if (!metadata) {
        return {
          version,
          releaseNotes: `# Version ${version}\n\nRelease notes not found.`,
          description: 'No description available',
          estimatedTime: 'Unknown'
        };
      }

      try {
        const releaseNotesPath = join(process.cwd(), metadata.releaseNotes);
        const releaseNotes = await readFile(releaseNotesPath, 'utf-8');
        return {
          version,
          releaseNotes,
          description: metadata.description,
          estimatedTime: metadata.estimatedTime,
          requiresVerification: metadata.requiresVerification
        };
      } catch (error) {
        console.error(`Failed to load release notes for ${version}:`, error);
        return {
          version,
          releaseNotes: `# Version ${version}\n\nRelease notes not available.`,
          description: metadata.description,
          estimatedTime: metadata.estimatedTime,
          requiresVerification: metadata.requiresVerification
        };
      }
    });

    const pendingReleaseNotes = await Promise.all(releaseNotesPromises);

    return NextResponse.json({
      upToDate: false,
      currentAppVersion: APP_VERSION,
      dbVersion: currentDbVersion,
      pendingVersions,
      pendingReleaseNotes,
      message: `Database needs to be updated from ${currentDbVersion} to ${APP_VERSION}`
    });

  } catch (error) {
    console.error('Error checking version:', error);
    return NextResponse.json(
      {
        error: 'Failed to check version',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
