'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, Copy, Database, FileText, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PendingReleaseNote {
  version: string;
  releaseNotes: string;
  description: string;
  estimatedTime: string;
  requiresVerification?: boolean;
}

interface MigrationPendingDialogProps {
  open: boolean;
  currentAppVersion: string;
  dbVersion: string;
  pendingVersions: string[];
  pendingReleaseNotes: PendingReleaseNote[];
  onVerificationComplete: () => void;
}

export function MigrationPendingDialog({
  open,
  currentAppVersion,
  dbVersion,
  pendingVersions,
  pendingReleaseNotes,
  onVerificationComplete,
}: MigrationPendingDialogProps) {
  const [migrationSQL, setMigrationSQL] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [sqlLoaded, setSqlLoaded] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  // Load migration SQL when dialog opens
  const loadMigrationSQL = async () => {
    if (sqlLoaded) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/version/migrations?from=${dbVersion}&to=${currentAppVersion}`
      );

      if (!response.ok) {
        throw new Error('Failed to load migration SQL');
      }

      const data = await response.json();
      setMigrationSQL(data.combinedSQL);
      setSqlLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load migration SQL');
    } finally {
      setLoading(false);
    }
  };

  // Copy SQL to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Verify migrations have been applied
  const verifyMigrations = async () => {
    setVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/version/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versions: pendingVersions }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Verification failed. Please ensure all migrations were applied correctly.');
      }

      // Verification passed!
      onVerificationComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {
      // Prevent closing - user must complete migration
    }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Database Update Required
          </DialogTitle>
          <div className="text-muted-foreground text-sm">
            Your application has been updated from <Badge variant="outline">{dbVersion}</Badge> to{' '}
            <Badge variant="outline">{currentAppVersion}</Badge>. Database migrations need to be applied before you can continue.
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="release-notes" className="w-full" onValueChange={(value) => {
            if (value === 'migrations' && !sqlLoaded) {
              loadMigrationSQL();
            }
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="release-notes">
                <FileText className="h-4 w-4 mr-2" />
                Release Notes ({pendingVersions.length})
              </TabsTrigger>
              <TabsTrigger value="migrations">
                <Database className="h-4 w-4 mr-2" />
                Migration Scripts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="release-notes" className="space-y-4 mt-4">
              {[...pendingReleaseNotes].reverse().map((release) => (
                <div key={release.version} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge>{release.version}</Badge>
                    <span className="text-sm text-muted-foreground">{release.description}</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <ReactMarkdown
                      components={{
                        h1: ({ ...props}) => <h1 className="text-2xl font-bold mb-2" {...props} />,
                        h2: ({ ...props}) => <h2 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                        h3: ({ ...props}) => <h3 className="text-lg font-semibold mt-3 mb-1" {...props} />,
                        p: ({ ...props}) => <p className="mb-2" {...props} />,
                        ul: ({ ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                        ol: ({ ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                        li: ({ ...props}) => <li className="ml-2" {...props} />,
                        strong: ({ ...props}) => <strong className="font-semibold" {...props} />,
                        em: ({ ...props}) => <em className="italic" {...props} />,
                        hr: ({ ...props}) => <hr className="my-4 border-border" {...props} />,
                        code: ({ ...props}) => <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props} />,
                      }}
                    >
                      {release.releaseNotes}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="migrations" className="space-y-4 mt-4">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <Alert>
                    <AlertDescription>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Copy the migration SQL below</li>
                        <li>Open your Supabase project SQL Editor</li>
                        <li>Paste and run the SQL</li>
                        <li>Wait for execution to complete (check for errors)</li>
                        <li>Click &quot;Verify Migrations&quot; button below to confirm</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  {/* Migration SQL */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Migration SQL</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(migrationSQL)}
                      >
                        {copiedSQL ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy SQL
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted p-4 rounded-lg overflow-x-auto max-h-60 max-w-full">
                      <pre className="text-xs whitespace-pre-wrap break-words min-w-0">
                        <code>{migrationSQL || 'Click this tab to load migration SQL...'}</code>
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            onClick={verifyMigrations}
            disabled={verifying || !sqlLoaded}
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Verify Migrations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
