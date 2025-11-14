'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { MigrationPendingDialog } from '@/components/MigrationPendingDialog';

interface VersionCheckResult {
  upToDate: boolean;
  currentAppVersion: string;
  dbVersion: string;
  pendingVersions: string[];
  pendingReleaseNotes?: Array<{
    version: string;
    releaseNotes: string;
    description: string;
    estimatedTime: string;
    requiresVerification?: boolean;
  }>;
  needsVersionTracking?: boolean;
  message: string;
}

export function VersionChecker({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>('');

  const checkVersion = async () => {
    if (!user) return;

    if (checking) return;

    setChecking(true);
    setError('');

    try {
      const response = await fetch('/api/version/check');

      if (!response.ok) {
        throw new Error('Failed to check version');
      }

      const data: VersionCheckResult = await response.json();
      setVersionCheck(data);

      // Log version status
      if (data.upToDate) {
        console.log('✅ Database version is up to date:', data.dbVersion);
      } else {
        console.warn(
          '⚠️ Database version mismatch:',
          `DB: ${data.dbVersion}, App: ${data.currentAppVersion}`,
          `Pending: ${data.pendingVersions?.join(', ')}`
        );
      }
    } catch (err) {
      console.error('Error checking version:', err);
      setError(err instanceof Error ? err.message : 'Failed to check version');
      // Don't block the app on version check errors
      setVersionCheck({
        upToDate: true,
        currentAppVersion: 'unknown',
        dbVersion: 'unknown',
        pendingVersions: [],
        message: 'Version check failed, continuing anyway'
      });
    } finally {
      setChecking(false);
    }
  };

  // Check version on mount and when user changes
  useEffect(() => {
    if (!authLoading && user) {
      checkVersion();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Handle successful verification
  const handleVerificationComplete = () => {
    // Refresh version check
    checkVersion();
  };

  // If no user, just pass through children (show login page)
  if (!user) {
    return <>{children}</>;
  }

  // Show loading state only while checking version (after auth is done)
  if (!authLoading && user && !versionCheck && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center justify-center p-8">
            <div className="w-8 h-8 animate-spin text-muted-foreground mb-4">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  // Show migration dialog if versions don't match
  const showMigrationDialog = versionCheck &&
    !versionCheck.upToDate &&
    versionCheck.pendingVersions &&
    versionCheck.pendingVersions.length > 0 &&
    versionCheck.pendingReleaseNotes;

  // If migration is pending, only show the dialog (no children)
  if (showMigrationDialog && versionCheck.pendingReleaseNotes) {
    return (
      <MigrationPendingDialog
        open={true}
        currentAppVersion={versionCheck.currentAppVersion}
        dbVersion={versionCheck.dbVersion}
        pendingVersions={versionCheck.pendingVersions}
        pendingReleaseNotes={versionCheck.pendingReleaseNotes}
        onVerificationComplete={handleVerificationComplete}
      />
    );
  }

  return <>{children}</>;
}
