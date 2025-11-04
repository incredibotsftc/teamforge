import { QueryClient } from '@tanstack/react-query'

/**
 * Create a QueryClient with optimal settings for notebook editing
 */
export function createQueryClientWithDefaults() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data in memory cache for 5 minutes
        gcTime: 1000 * 60 * 5,
        // Data considered fresh for 1 minute
        staleTime: 1000 * 60,
        // Enable automatic refetching to ensure fresh data
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry failed mutations 3 times with exponential backoff
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  })
}
